import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConsentService } from '../consent/consent.service';
import { HypervergeService } from '../../integrations/hyperverge/hyperverge.service';
import { PrismaService } from '../../prisma/prisma.service';

export type KycInput = { userId: string; fullName: string; pan: string; consent: boolean; deviceId?: string };
const KYC_STATUSES = ['NOT_STARTED', 'CONSENT_PENDING', 'INITIALIZED', 'IN_PROGRESS', 'DOCUMENT_PENDING', 'LIVENESS_PENDING', 'SUBMITTED', 'VERIFIED', 'FAILED', 'REQUIRES_ACTION', 'MANUAL_REVIEW', 'EXPIRED'];

@Injectable()
export class KycService {
  constructor(private readonly prisma: PrismaService, private readonly hyperverge: HypervergeService, private readonly consents: ConsentService) {}

  async startKyc(input: KycInput) {
    if (!input.consent) throw new BadRequestException('KYC consent is required.');
    const provider = (process.env.KYC_PROVIDER ?? 'mock').toLowerCase();
    await this.prisma.userProfile.upsert({ where: { userId: input.userId }, update: { fullName: input.fullName }, create: { userId: input.userId, fullName: input.fullName } });
    await this.consents.grant({ userId: input.userId, type: 'KYC', provider, source: 'APP', deviceId: input.deviceId });

    if (provider === 'mock') {
      const record = await this.prisma.kycRecord.create({
        data: { userId: input.userId, provider: 'mock', providerReferenceId: `mock_${crypto.randomUUID()}`, status: 'VERIFIED', completedAt: new Date(), metadata: JSON.stringify({ mode: 'MOCK' }), events: { create: { status: 'VERIFIED', payload: JSON.stringify({ mode: 'MOCK' }) } } },
      });
      await this.prisma.auditLog.create({ data: { userId: input.userId, action: 'KYC_MOCK_VERIFIED', details: JSON.stringify({ recordId: record.id }) } });
      return { mode: 'MOCK', status: 'VERIFIED', referenceId: record.providerReferenceId, message: 'Mock KYC is verified for development only; it is not a real KYC verification.' };
    }
    if (provider !== 'hyperverge') throw new ServiceUnavailableException(`KYC provider '${provider}' is NOT CONFIGURED — CREDENTIAL REQUIRED.`);

    const sdkConfig = await this.hyperverge.generateSdkToken(input.userId);
    await this.prisma.kycRecord.create({ data: { userId: input.userId, provider: 'hyperverge', providerReferenceId: sdkConfig.transactionId, status: 'INITIALIZED', events: { create: { status: 'INITIALIZED' } } } });
    return { mode: 'CREDENTIAL_REQUIRED', provider: 'hyperverge', status: 'INITIALIZED', ...sdkConfig };
  }

  async getKycStatus(userId: string) {
    const record = await this.prisma.kycRecord.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } });
    if (!record) return { status: 'NOT_STARTED', supportedStatuses: KYC_STATUSES };
    return { status: record.status, provider: record.provider, mode: record.provider === 'mock' ? 'MOCK' : 'CREDENTIAL_REQUIRED', failureReason: record.failureReason, updatedAt: record.updatedAt };
  }
}
