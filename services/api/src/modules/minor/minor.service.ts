import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { MinorInvestorProfileEngine } from './minor-profile.engine';
import * as crypto from 'crypto';

@Injectable()
export class MinorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService
  ) {}

  async getOnboardingStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        guardian: true,
        guardianConsents: true,
        minorAssessments: { orderBy: { completedAt: 'desc' }, take: 1 },
        minorProfileResult: true,
        kycApplication: true
      }
    });

    if (!user) throw new BadRequestException('User not found');

    const state = {
      investorType: user.profile?.investorType || 'ADULT',
      majorityDate: user.profile?.majorityDate,
      hasRiskAssessment: user.minorAssessments.length > 0,
      riskCategory: user.minorAssessments[0]?.riskCategory,
      profileResult: user.minorProfileResult,
      hasGuardian: !!user.guardian,
      guardianVerified: user.guardian?.isMobileVerified || false,
      hasConsent: user.guardianConsents.some(c => c.status === 'VERIFIED'),
      kycStatus: user.kycApplication?.status || 'NOT_STARTED'
    };

    return state;
  }

  async saveRiskAssessment(userId: string, data: any) {
    const result = MinorInvestorProfileEngine.calculate(data.answers);

    // Save legacy format to preserve integrity of older functions if needed
    const assessment = await this.prisma.minorRiskAssessment.create({
      data: {
        userId,
        assessmentType: 'MINOR_INVESTOR_PROFILE',
        version: 'minor-v2',
        answers: JSON.stringify(data.answers),
        score: result.riskToleranceScore,
        profileType: result.profileType,
        riskCategory: result.profileTitle,
        goal: result.goalLabel,
        timeHorizon: result.timeHorizonScore >= 60 ? 'Long Term' : 'Short Term',
        knowledgeLevel: result.knowledgeScore >= 70 ? 'Advanced' : 'Beginner',
        riskComfort: result.riskToleranceScore >= 60 ? 'High' : 'Moderate'
      }
    });

    // Save actual structured Profile Result
    // Use upsert or delete previous to maintain 1-to-1 or just update
    const existingResult = await this.prisma.minorInvestorProfileResult.findUnique({ where: { userId }});
    if (existingResult) {
      await this.prisma.minorInvestorProfileResult.delete({ where: { userId } });
    }

    const profileResult = await this.prisma.minorInvestorProfileResult.create({
      data: {
        userId,
        assessmentId: assessment.id,
        assessmentVersion: 'minor-v2',
        riskToleranceScore: result.riskToleranceScore,
        timeHorizonScore: result.timeHorizonScore,
        knowledgeScore: result.knowledgeScore,
        financialHabitScore: result.financialHabitScore,
        goalType: result.goalType,
        profileType: result.profileType,
        profileTitle: result.profileTitle,
        profileTagline: result.profileTagline,
        profileConsistency: result.profileConsistency,
        strengths: JSON.stringify(result.insights), // Store insights here for now
      }
    });

    return { success: true, ...result };
  }

  async saveGuardianDetails(userId: string, data: any) {
    const existing = await this.prisma.guardian.findUnique({ where: { minorUserId: userId } });
    if (existing) {
      return this.prisma.guardian.update({
        where: { minorUserId: userId },
        data: {
          fullName: data.fullName,
          mobile: data.mobile,
          relationship: data.relationship,
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
          pan: data.pan,
          email: data.email,
          gender: data.gender,
          address: data.address
        }
      });
    }

    return this.prisma.guardian.create({
      data: {
        minorUserId: userId,
        fullName: data.fullName,
        mobile: data.mobile,
        relationship: data.relationship,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        pan: data.pan,
        email: data.email,
        gender: data.gender,
        address: data.address,
        status: 'PENDING'
      }
    });
  }

  async sendGuardianOtp(userId: string, mobile: string) {
    const guardian = await this.prisma.guardian.findUnique({ where: { minorUserId: userId } });
    if (!guardian) throw new BadRequestException('Guardian details not found');
    if (guardian.mobile !== mobile) throw new BadRequestException('Mobile number mismatch');

    await this.authService.sendOtp(mobile, 'SMS');
    return { success: true, message: 'OTP sent to guardian' };
  }

  async verifyGuardianOtp(userId: string, mobile: string, code: string) {
    await this.authService.validateOtp(mobile, code);

    await this.prisma.guardian.update({
      where: { minorUserId: userId },
      data: { isMobileVerified: true, status: 'VERIFIED' }
    });

    return { success: true };
  }

  async saveGuardianConsent(userId: string, data: { ipAddress?: string, method?: string }) {
    const guardian = await this.prisma.guardian.findUnique({ where: { minorUserId: userId } });
    if (!guardian || !guardian.isMobileVerified) {
      throw new BadRequestException('Guardian not found or not verified');
    }

    const consentText = "I confirm that I am the parent or legal guardian of the minor named in this application...";
    const hash = crypto.createHash('sha256').update(consentText).digest('hex');

    await this.prisma.guardianConsent.create({
      data: {
        minorUserId: userId,
        guardianId: guardian.id,
        consentVersion: 'v1',
        consentTextHash: hash,
        status: 'VERIFIED',
        ipAddress: data.ipAddress,
        verificationMethod: data.method || 'OTP',
        verifiedAt: new Date()
      }
    });

    return { success: true };
  }
}
