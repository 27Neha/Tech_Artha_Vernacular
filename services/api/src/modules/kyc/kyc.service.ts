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
      const response = await this.cybrilla.createKycRequest({
        pan: targetPan,
        name: fullName,
        date_of_birth: targetDob
      });
      result = response.data;
    } catch (e: any) {
      const isProviderOutage =
        e.response?.code === 'KYC_PROVIDER_ERROR' || e.message?.includes('temporarily unavailable');

      await this.prisma.kYCApplication.update({
        where: { id: application.id },
        data: {
          status: 'FAILED',
          failureReason: isProviderOutage ? 'Provider unavailable' : (e?.message ?? 'Verification failed'),
        },
      });
      throw e;
    }

    const evaluated = this.evaluateKycStatus(result);

    application = await this.prisma.kYCApplication.update({
      where: { id: application.id },
      data: { provider: 'CYBRILLA', providerTransactionId: result.id, ...evaluated },
    });

    await this.prisma.userProfile.upsert({
      where: { userId },
      update: { fullName, pan, dateOfBirth: new Date(dob) },
      create: { userId, fullName, pan, dateOfBirth: new Date(dob) },
    });

    return {
      transactionId: result.id,
      status: evaluated.overallStatus,
      fields_needed: result.fields_needed || [],
      providerResponse: result,
    };
  }

  async getKycStatus(userId: string) {
    let application = await this.prisma.kYCApplication.findUnique({
      where: { userId }
    });

    if (application && application.providerTransactionId) {
      try {
        const result = await this.cybrilla.getKycRequest(application.providerTransactionId);
        const evaluated = this.evaluateKycStatus(result);

        if (evaluated.overallStatus !== application.status) {
          application = await this.prisma.kYCApplication.update({
            where: { id: application.id },
            data: evaluated,
          });
        }
        
        return {
          ...application,
          fields_needed: result.fields_needed || []
        };
      } catch (error) {
        this.logger.warn(`Could not poll KYC status for user \${userId}: \${(error as Error).message}`);
      }
    }

    return { ...application, fields_needed: [] };
  }

  async generateDigilockerUrl(userId: string, redirectUrl: string) {
    const application = await this.prisma.kYCApplication.findUnique({ where: { userId } });
    if (!application || !application.providerTransactionId) {
      throw new BadRequestException('KYC request not found');
    }
    return this.cybrilla.generateDigilockerUrl(application.providerTransactionId, redirectUrl);
  }

  async generateEsignUrl(userId: string, redirectUrl: string) {
    const application = await this.prisma.kYCApplication.findUnique({ where: { userId } });
    if (!application || !application.providerTransactionId) {
      throw new BadRequestException('KYC request not found');
    }
    return this.cybrilla.generateEsignUrl(application.providerTransactionId, redirectUrl);
  }

  private evaluateKycStatus(result: any) {
    let overallStatus = 'IN_PROGRESS';
    if (result.status === 'successful') overallStatus = 'VERIFIED';
    else if (result.status === 'failed') overallStatus = 'FAILED';
    else if (result.status === 'pending') overallStatus = 'PENDING';
    else if (result.status === 'esign_required') overallStatus = 'ESIGN_REQUIRED';
    else if (result.status === 'submitted') overallStatus = 'SUBMITTED';

    return {
      overallStatus,
      status: overallStatus,
      failureReason: result.failure_reason || null,
      completedAt: result.status === 'successful' ? new Date(result.completed_at || Date.now()) : null,
    };
  }
}
