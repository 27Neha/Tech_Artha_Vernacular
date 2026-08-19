import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * HyperVerge boundary. Official authenticated endpoint paths, request payloads and
 * signature algorithms are deliberately not inferred from a UI brief. Add them
 * only after the approved HyperVerge product documentation and credentials arrive.
 */
@Injectable()
export class HypervergeService {
  constructor(private readonly prisma: PrismaService) {}

  async generateSdkToken(_userId: string): Promise<{ token: string; workflowId: string; transactionId: string }> {
    if (process.env.HYPERVERGE_ENABLED !== 'true') {
      throw new ServiceUnavailableException('HyperVerge is NOT CONFIGURED — approved credentials and product documentation are required.');
    }
    throw new ServiceUnavailableException('HyperVerge SDK-token endpoint is intentionally pending the approved provider specification. No endpoint has been guessed.');
  }

  async processWebhook(payload: Record<string, unknown>, signature: string) {
    if (process.env.HYPERVERGE_ENABLED !== 'true') return { accepted: false, reason: 'NOT_CONFIGURED' };
    if (!signature) throw new ServiceUnavailableException('A verified HyperVerge webhook signature is required. Signature verification is pending approved provider documentation.');
    const transactionId = typeof payload.transactionId === 'string' ? payload.transactionId : undefined;
    if (!transactionId) return { accepted: false, reason: 'MISSING_TRANSACTION_ID' };
    const eventId = typeof payload.eventId === 'string' ? payload.eventId : createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    if (await this.prisma.webhookEvent.findUnique({ where: { eventId } })) return { accepted: true, duplicate: true };
    await this.prisma.webhookEvent.create({ data: { provider: 'hyperverge', eventId, eventType: typeof payload.event === 'string' ? payload.event : 'status_update', payloadHash: createHash('sha256').update(JSON.stringify(payload)).digest('hex'), status: 'PENDING' } });
    // Mapping payload status values is provider-documentation dependent. Retain it
    // for a verified mapper/worker without claiming that KYC succeeded.
    return { accepted: true, queued: true };
  }
}
