import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CybrillaService } from '../cybrilla/cybrilla.service';

@Injectable()
export class KycService {
  private readonly logger = new Logger(KycService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cybrilla: CybrillaService,
  ) {}

  async startKyc(userId: string, fullName: string, pan: string, dob: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { profile: true, guardian: true } });
    const isMinor = user?.profile?.investorType === 'MINOR';

    let targetPan = pan;
    let targetDob = dob;

    if (isMinor) {
      if (!user?.guardian || !user.guardian.pan) {
        throw new BadRequestException('Guardian PAN is required for minor KYC verification.');
      }
      targetPan = user.guardian.pan;
    } else {
      if (!fullName || !pan || !dob) {
        throw new BadRequestException('fullName, pan, and dob are required to start KYC.');
      }
    }

    let application = await this.prisma.kYCApplication.findUnique({ where: { userId } });
    if (!application) {
      application = await this.prisma.kYCApplication.create({
        data: { userId, provider: 'CYBRILLA', status: 'IN_PROGRESS' },
      });
    }

    let result: any;
    try {
      result = await this.cybrilla.verifyPan(targetPan, fullName, targetDob);
    } catch (e: any) {
      // If it's our structured KYC_PROVIDER_ERROR, just update the status safely and bubble it up
      if (e.response?.code === 'KYC_PROVIDER_ERROR' || e.message?.includes('temporarily unavailable')) {
        await this.prisma.kYCApplication.update({
          where: { id: application.id },
          data: { status: 'FAILED', failureReason: 'Provider unavailable' },
        });
      }
      throw e;
    }

    const evaluated = this.evaluateVerification(result);

    application = await this.prisma.kYCApplication.update({
      where: { id: application.id },
      data: { provider: 'CYBRILLA', providerTransactionId: result.id, ...evaluated },
    });

    // Retain the submitted identity details so later steps (e.g. investing) don't need to ask again.
    await this.prisma.userProfile.upsert({
      where: { userId },
      update: { fullName, pan, dateOfBirth: new Date(dob) },
      create: { userId, fullName, pan, dateOfBirth: new Date(dob) },
    });

    return {
      transactionId: result.id,
      status: evaluated.overallStatus,
      providerResponse: result,
    };
  }

  async getKycStatus(userId: string) {
    let application = await this.prisma.kYCApplication.findUnique({
      where: { userId },
      include: { verifications: true },
    });

    if (application?.status === 'IN_PROGRESS' && application.providerTransactionId) {
      try {
        const result = await this.cybrilla.fetchPreVerification(application.providerTransactionId);
        const evaluated = this.evaluateVerification(result);

        if (evaluated.overallStatus !== application.status) {
          application = await this.prisma.kYCApplication.update({
            where: { id: application.id },
            data: evaluated,
            include: { verifications: true },
          });
        }
      } catch (error) {
        this.logger.warn(`Could not poll pre-verification status for user ${userId}: ${(error as Error).message}`);
      }
    }

    return application;
  }

  /** Maps a Cybrilla pre-verification response onto our KYCApplication fields. */
  private evaluateVerification(result: any) {
    const fields = ['pan', 'name', 'date_of_birth'];
    const allVerified = fields.every((field) => result[field]?.status === 'verified');
    const overallStatus = result.status === 'completed' ? (allVerified ? 'VERIFIED' : 'FAILED') : 'IN_PROGRESS';
    const failureReason = allVerified
      ? null
      : fields
          .map((field) => (result[field]?.status === 'failed' ? `${field}: ${result[field]?.reason ?? result[field]?.code}` : null))
          .filter(Boolean)
          .join('; ') || null;

    return {
      panStatus: result.pan?.status === 'verified' ? 'VERIFIED' : result.pan?.status === 'failed' ? 'FAILED' : 'PENDING',
      overallStatus,
      status: overallStatus,
      failureReason,
      completedAt: result.status === 'completed' ? new Date(result.completed_at ?? Date.now()) : null,
    };
  }
}
