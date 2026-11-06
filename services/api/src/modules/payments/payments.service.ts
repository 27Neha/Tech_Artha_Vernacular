import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Fetches verified mandate status strictly from the database.
   * Client-side query parameters are never trusted.
   */
  async getMandateStatus(id: string) {
    if (!id || id.trim() === '') {
      throw new BadRequestException('Mandate ID is required');
    }

    const numericId = Number(id);
    const mandate = await this.prisma.fpMandate.findFirst({
      where: {
        OR: [
          { id },
          ...(Number.isInteger(numericId) ? [{ fpMandateId: numericId }] : []),
        ],
      },
    });

    if (!mandate) {
      throw new NotFoundException(`Mandate with ID '${id}' not found`);
    }

    return {
      id: mandate.id,
      mandateId: mandate.fpMandateId ? String(mandate.fpMandateId) : mandate.id,
      type: mandate.mandateType,
      status: mandate.status, // CREATED, INITIATED, PENDING, APPROVED, REJECTED, CANCELLED
      maxAmount: mandate.mandateLimit,
      bankAccountId: mandate.accountId,
      createdAt: mandate.createdAt,
      updatedAt: mandate.updatedAt,
      message:
        mandate.status === 'APPROVED'
          ? 'Mandate approved successfully. Recurring SIP auto-debit is now active.'
          : mandate.status === 'REJECTED' || mandate.status === 'CANCELLED'
          ? 'Mandate registration was rejected or cancelled by the bank.'
          : 'Mandate registration is currently awaiting bank confirmation.',
    };
  }

  /**
   * Fetches verified payment status from the database.
   * Distinguishes clearly between "Payment Confirmed" and "Units Allotted".
   */
  async getPaymentStatus(id: string) {
    if (!id || id.trim() === '') {
      throw new BadRequestException('Payment/Order ID is required');
    }

    // Check FpPayment table first
    const payment = await this.prisma.fpPayment.findFirst({
      where: {
        OR: [{ id }, { fpPaymentId: id }, { orderId: id }],
      },
    });

    if (payment) {
      const isSuccessful = payment.status === 'SUCCESSFUL' || payment.status === 'SUCCESS';
      const isRejected = payment.status === 'REJECTED' || payment.status === 'FAILED';

      return {
        id: payment.id,
        paymentId: payment.fpPaymentId || payment.id,
        orderId: payment.orderId,
        amount: payment.amount,
        currency: payment.currency,
        method: payment.method || 'UPI',
        status: isSuccessful ? 'SUCCESSFUL' : isRejected ? 'REJECTED' : 'PENDING',
        unitsAllotted: payment.unitsAllotted,
        allottedUnits: payment.allottedUnits,
        nav: payment.nav,
        allottedAt: payment.allottedAt,
        failureReason: payment.failureReason,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
        message: isSuccessful
          ? payment.unitsAllotted
            ? `Payment verified and ${payment.allottedUnits} units allotted at NAV ₹${payment.nav}.`
            : 'Payment confirmed. Mutual fund units allotment is currently in progress with the AMC (typically 1-2 business days).'
          : isRejected
          ? payment.failureReason || 'Payment was declined or cancelled.'
          : 'Awaiting bank confirmation. Please do not close this window.',
      };
    }

    // Fallback: check FpPurchaseOrder
    const order = await this.prisma.fpPurchaseOrder.findFirst({
      where: {
        OR: [{ id }, { fpOrderId: id }],
      },
    });

    if (order) {
      const isSuccessful = order.status === 'SUCCESS' || order.status === 'SUCCESSFUL' || order.status === 'ALLOTTED';
      const isRejected = order.status === 'REJECTED' || order.status === 'FAILED';
      const unitsAllotted = Boolean(order.allottedUnits && order.allottedUnits > 0);

      return {
        id: order.id,
        paymentId: order.fpOrderId || order.id,
        orderId: order.fpOrderId || order.id,
        amount: order.amount,
        currency: 'INR',
        method: 'UPI',
        status: isSuccessful ? 'SUCCESSFUL' : isRejected ? 'REJECTED' : 'PENDING',
        unitsAllotted,
        allottedUnits: order.allottedUnits,
        nav: order.purchasedPrice,
        allottedAt: order.updatedAt,
        failureReason: order.failureReason,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        message: isSuccessful
          ? unitsAllotted
            ? `Payment verified and ${order.allottedUnits} units allotted at NAV ₹${order.purchasedPrice}.`
            : 'Payment confirmed. Mutual fund units allotment is currently in progress with the AMC (typically 1-2 business days).'
          : isRejected
          ? order.failureReason || 'Payment was declined or cancelled.'
          : 'Awaiting bank confirmation. Please do not close this window.',
      };
    }

    throw new NotFoundException(`Payment transaction with ID '${id}' not found`);
  }

  /**
   * Idempotent webhook handler for Cybrilla mandate events.
   */
  async handleMandateWebhook(payload: any) {
    this.logger.log(`Processing Cybrilla mandate webhook: ${JSON.stringify(payload?.event || payload?.type || 'unknown')}`);

    const mandateId = payload?.data?.id || payload?.mandate_id || payload?.id;
    const rawStatus = (payload?.data?.status || payload?.status || '').toUpperCase();

    let targetStatus = 'PENDING';
    if (rawStatus.includes('APPROV') || rawStatus === 'ACTIVE' || rawStatus === 'SUCCESS') {
      targetStatus = 'APPROVED';
    } else if (rawStatus.includes('REJECT') || rawStatus === 'FAILED') {
      targetStatus = 'REJECTED';
    } else if (rawStatus.includes('CANCEL')) {
      targetStatus = 'CANCELLED';
    }

    if (mandateId) {
      const existing = await this.prisma.fpMandate.findFirst({
        where: { OR: [{ id: mandateId }, { fpMandateId: mandateId }] },
      });

      if (existing) {
        await this.prisma.fpMandate.update({
          where: { id: existing.id },
          data: { status: targetStatus },
        });
        this.logger.log(`Updated mandate ${existing.id} status to ${targetStatus}`);
      }
    }

    // Log the event in WebhookEvent
    try {
      const eventId = payload?.data?.id || payload?.id || `mandate-${Date.now()}`;
      const payloadHash = require('crypto').createHash('sha256').update(JSON.stringify(payload || {})).digest('hex');
      await this.prisma.webhookEvent.upsert({
        where: { eventId },
        update: { status: 'PROCESSED', processedAt: new Date() },
        create: {
          provider: 'CYBRILLA_MANDATE',
          eventId,
          eventType: payload?.event || 'mandate.update',
          payloadHash,
          status: 'PROCESSED',
          processedAt: new Date(),
        },
      });
    } catch (e: any) {
      this.logger.warn(`Could not log webhook event: ${e.message}`);
    }

    return { received: true, status: targetStatus };
  }

  /**
   * Idempotent webhook handler for Cybrilla payment events.
   */
  async handlePaymentWebhook(payload: any) {
    this.logger.log(`Processing Cybrilla payment webhook: ${JSON.stringify(payload?.event || payload?.type || 'unknown')}`);

    const paymentId = payload?.data?.id || payload?.payment_id || payload?.id;
    const orderId = payload?.data?.order_id || payload?.order_id;
    const eventName = (payload?.event || '').toLowerCase();
    const rawStatus = (payload?.data?.status || payload?.status || '').toUpperCase();

    let targetStatus = 'PENDING';
    let isAllotment = eventName.includes('allot') || rawStatus === 'ALLOTTED';

    if (rawStatus.includes('SUCCESS') || rawStatus === 'PAID' || rawStatus === 'CONFIRMED' || isAllotment) {
      targetStatus = 'SUCCESSFUL';
    } else if (rawStatus.includes('REJECT') || rawStatus.includes('FAIL')) {
      targetStatus = 'REJECTED';
    }

    const units = payload?.data?.units || payload?.data?.allotted_units || payload?.units;
    const nav = payload?.data?.nav || payload?.data?.purchased_price || payload?.nav;

    // Update FpPayment if found
    if (paymentId || orderId) {
      const paymentRecord = await this.prisma.fpPayment.findFirst({
        where: {
          OR: [
            ...(paymentId ? [{ id: paymentId }, { fpPaymentId: paymentId }] : []),
            ...(orderId ? [{ orderId }] : []),
          ],
        },
      });

      if (paymentRecord) {
        await this.prisma.fpPayment.update({
          where: { id: paymentRecord.id },
          data: {
            status: targetStatus,
            ...(isAllotment ? { unitsAllotted: true, allottedUnits: units ? Number(units) : null, nav: nav ? Number(nav) : null, allottedAt: new Date() } : {}),
            failureReason: targetStatus === 'REJECTED' ? payload?.data?.failure_reason || 'Payment rejected' : null,
          },
        });
        this.logger.log(`Updated FpPayment ${paymentRecord.id} status to ${targetStatus}`);
      }
    }

    // Also update FpPurchaseOrder if applicable
    if (orderId) {
      const order = await this.prisma.fpPurchaseOrder.findFirst({
        where: { OR: [{ id: orderId }, { fpOrderId: orderId }] },
      });
      if (order) {
        await this.prisma.fpPurchaseOrder.update({
          where: { id: order.id },
          data: {
            status: isAllotment ? 'ALLOTTED' : targetStatus === 'SUCCESSFUL' ? 'SUCCESS' : targetStatus,
            ...(units ? { allottedUnits: Number(units) } : {}),
            ...(nav ? { purchasedPrice: Number(nav) } : {}),
            failureReason: targetStatus === 'REJECTED' ? payload?.data?.failure_reason || 'Order rejected' : null,
          },
        });
        this.logger.log(`Updated FpPurchaseOrder ${order.id} status to ${targetStatus}`);
      }
    }

    // Log the event in WebhookEvent
    try {
      const eventId = paymentId || orderId || `payment-${Date.now()}`;
      const payloadHash = require('crypto').createHash('sha256').update(JSON.stringify(payload || {})).digest('hex');
      await this.prisma.webhookEvent.upsert({
        where: { eventId },
        update: { status: 'PROCESSED', processedAt: new Date() },
        create: {
          provider: 'CYBRILLA_PAYMENT',
          eventId,
          eventType: payload?.event || 'payment.update',
          payloadHash,
          status: 'PROCESSED',
          processedAt: new Date(),
        },
      });
    } catch (e: any) {
      this.logger.warn(`Could not log webhook event: ${e.message}`);
    }

    return { received: true, status: targetStatus, unitsAllotted: isAllotment };
  }
}
