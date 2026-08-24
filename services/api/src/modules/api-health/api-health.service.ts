import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ApiHealthService {
  constructor(private readonly prisma: PrismaService) {}

  service() {
    return { service: 'techartha-api', status: 'ok', timestamp: new Date().toISOString() };
  }

  async database() {
    try {
      await this.prisma.$queryRawUnsafe('SELECT 1');
      return { status: 'ok' };
    } catch {
      return { status: 'unavailable' };
    }
  }

  providers() {
    return {
      kyc: (process.env.KYC_PROVIDER ?? 'mock').toLowerCase() === 'mock' ? 'MOCK' : 'NOT_CONFIGURED — CREDENTIAL REQUIRED',
      otp: (process.env.OTP_PROVIDER ?? 'mock').toLowerCase() === 'mock' ? 'MOCK' : 'NOT_CONFIGURED — CREDENTIAL REQUIRED',
      fundReference: process.env.MFAPI_BASE_URL ? 'CONFIGURED_PUBLIC_REFERENCE_ONLY' : 'DEFAULT_PUBLIC_REFERENCE_ONLY',
      transactions: 'NOT_CONFIGURED — AUTHORISED BSE/NSE PROVIDER ACCESS REQUIRED',
      portfolio: 'NOT_CONFIGURED — AUTHORISED CAMS/KFINTECH ACCESS REQUIRED',
      voice: 'NOT_CONFIGURED — CREDENTIAL REQUIRED',
      ai: 'MOCK_RULE_BASED_SAFETY_GATEWAY',
    };
  }
}
