import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export const CONSENT_VERSIONS: Record<string, { version: string; purpose: string }> = {
  KYC: { version: '2026.08', purpose: 'Identity verification and regulated KYC processing.' },
  RISK: { version: '2026.08', purpose: 'Risk assessment and suitability evaluation.' },
  INVESTMENT_PROPOSAL: { version: '2026.08', purpose: 'Generating a personalised investment proposal.' },
  FINANCIAL_DATA: { version: '2026.08', purpose: 'Processing authorised financial data for insights.' },
  AI_DATA: { version: '2026.08', purpose: 'Using authorised data to answer financial questions.' },
};

@Injectable()
export class ConsentService {
  constructor(private readonly prisma: PrismaService) {}

  async grant(input: { userId: string; type: string; provider?: string; source: string; ipAddress?: string; deviceId?: string }) {
    const definition = CONSENT_VERSIONS[input.type];
    if (!definition) throw new BadRequestException('This consent type is not recognised.');
    const consent = await this.prisma.consent.create({
      data: {
        userId: input.userId,
        type: input.type,
        version: definition.version,
        purpose: definition.purpose,
        provider: input.provider,
        status: 'GRANTED',
        ipAddress: input.ipAddress,
        deviceId: input.deviceId,
        events: { create: { event: 'GRANTED', source: input.source } },
      },
      include: { events: true },
    });
    await this.prisma.auditLog.create({ data: { userId: input.userId, action: 'CONSENT_GRANTED', details: JSON.stringify({ type: input.type, version: definition.version, provider: input.provider }) } });
    return consent;
  }

  async revoke(userId: string, consentId: string, source: string) {
    const consent = await this.prisma.consent.findFirst({ where: { id: consentId, userId } });
    if (!consent) throw new BadRequestException('Consent record not found.');
    return this.prisma.consent.update({
      where: { id: consentId },
      data: { status: 'REVOKED', events: { create: { event: 'REVOKED', source } } },
      include: { events: true },
    });
  }

  async hasActiveConsent(userId: string, type: string) {
    return Boolean(await this.prisma.consent.findFirst({ where: { userId, type, status: 'GRANTED' }, orderBy: { createdAt: 'desc' } }));
  }

  list(userId: string) {
    return this.prisma.consent.findMany({ where: { userId }, include: { events: true }, orderBy: { createdAt: 'desc' } });
  }
}
