import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';

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
        kycApplication: true
      }
    });

    if (!user) throw new BadRequestException('User not found');

    const state = {
      investorType: user.profile?.investorType || 'ADULT',
      majorityDate: user.profile?.majorityDate,
      hasGuardian: !!user.guardian,
      guardianVerified: user.guardian?.isMobileVerified || false,
      hasConsent: user.guardianConsents.some((c: any) => c.status === 'VERIFIED'),
      kycStatus: user.kycApplication?.status || 'NOT_STARTED'
    };

    return state;
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

    let guardianUser = await this.prisma.user.findUnique({ where: { mobile } });
    if (!guardianUser) {
      guardianUser = await this.prisma.user.create({
        data: { mobile, clientType: 'retail' }
      });
      // Optionally create an empty profile
      await this.prisma.userProfile.create({
        data: { userId: guardianUser.id, investorType: 'ADULT' }
      });
    }

    const hasRiskProfile = await this.prisma.riskProfile.findUnique({ where: { userId: guardianUser.id } });
    const session = await this.authService.createSession(guardianUser);

    return { 
      success: true,
      hasRiskProfile: !!hasRiskProfile,
      guardianToken: session.accessToken
    };
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
