import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Logger,
  Post,
  UnauthorizedException,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FreshdeskService } from './freshdesk.service';
import { WhatsappService } from '../../integrations/whatsapp/whatsapp.service';

export class FreshdeskWebhookDto {
  freshdeskTicketId?: number | string;
  ticketId?: number | string;
  ticketStatus?: string | number;
  status?: string | number;
  agentName?: string;
  agentEmail?: string;
  replyBody?: string;
  customerPhone?: string;
  customerEmail?: string;
  secretToken?: string;
  event?: string;
}

@Controller(['support/freshdesk', 'api/v1/support/freshdesk'])
export class FreshdeskController {
  private readonly logger = new Logger(FreshdeskController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly freshdeskService: FreshdeskService,
    @Inject(forwardRef(() => WhatsappService))
    private readonly whatsappService: WhatsappService,
  ) {}

  @Get('health')
  getHealth() {
    return {
      status: 'UP',
      provider: 'FRESHDESK',
      configured: this.freshdeskService.isConfigured(),
      timestamp: new Date().toISOString(),
    };
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleFreshdeskWebhook(
    @Body() body: Record<string, any>,
    @Headers('x-freshdesk-webhook-token') headerToken?: string,
  ) {
    this.logger.log(`Received Freshdesk Webhook event: ${JSON.stringify(body)}`);

    // Verify webhook token if configured
    const token = headerToken || body.secretToken;
    if (!this.freshdeskService.verifyWebhookSecret(token)) {
      this.logger.warn('Freshdesk webhook authorization rejected: invalid secret token.');
      throw new UnauthorizedException('Invalid Freshdesk webhook secret token');
    }

    // Parse incoming payload (supporting both Freshdesk custom webhooks and standard payload structures)
    const ticketIdRaw = body.freshdeskTicketId || body.ticketId || body.ticket_id;
    const ticketStatusRaw = body.ticketStatus || body.status || body.ticket_status;
    const agentName = body.agentName || body.agent_name || 'TechArtha Support Agent';
    const agentEmail = body.agentEmail || body.agent_email;
    const replyBody = body.replyBody || body.reply || body.body || body.notes;
    const customerPhone = body.customerPhone || body.customer_phone || body.phone;
    const customerEmail = body.customerEmail || body.customer_email || body.email;

    let ticket: any = null;

    if (ticketIdRaw) {
      try {
        const bigIntId = BigInt(ticketIdRaw);
        ticket = await this.prisma.supportTicket.findFirst({
          where: { freshdeskTicketId: bigIntId },
        });
      } catch {
        // Not a numeric bigint
      }
    }

    if (!ticket && customerPhone) {
      const cleanPhone = customerPhone.replace(/[^0-9]/g, '');
      const last10 = cleanPhone.slice(-10);
      ticket = await this.prisma.supportTicket.findFirst({
        where: {
          customerPhone: { contains: last10 },
          status: { in: ['OPEN', 'RECEIVED', 'IN_REVIEW'] },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (!ticket) {
      this.logger.warn(
        `Freshdesk webhook received but no matching TechArtha SupportTicket found for ID: ${ticketIdRaw}, phone: ${customerPhone}`,
      );
      return {
        success: false,
        message: 'No matching TechArtha support ticket found',
        receivedTicketId: ticketIdRaw,
      };
    }

    // 1. Process Agent Reply if present
    let whatsappDispatched = false;
    if (replyBody && typeof replyBody === 'string' && replyBody.trim().length > 0) {
      const cleanReply = replyBody.trim();

      // Record agent reply in database conversation thread
      await this.prisma.supportMessage.create({
        data: {
          ticketId: ticket.id,
          senderType: 'AGENT',
          senderName: agentName,
          senderEmail: agentEmail || null,
          content: cleanReply,
          channel: 'WHATSAPP',
          deliveryStatus: 'SENT',
        },
      });

      // Update ticket header with latest agent reply
      await this.prisma.supportTicket.update({
        where: { id: ticket.id },
        data: {
          lastAgentReply: cleanReply,
          assignedAgentName: agentName,
          assignedAgentEmail: agentEmail || ticket.assignedAgentEmail,
          updatedAt: new Date(),
        },
      });

      // Send the reply back to the customer on WhatsApp!
      const targetPhone = customerPhone || ticket.customerPhone;
      if (targetPhone) {
        try {
          await this.whatsappService.sendWhatsAppMessage(targetPhone, cleanReply);
          whatsappDispatched = true;
          this.logger.log(`Dispatched Freshdesk agent reply to customer WhatsApp at ${targetPhone}`);
        } catch (error: any) {
          this.logger.error(`Failed to dispatch WhatsApp message to ${targetPhone}: ${error?.message}`);
        }
      }
    }

    // 2. Process Status Updates if present
    let mappedStatus: string | null = null;
    let isResolved = false;

    if (ticketStatusRaw !== undefined) {
      const statusStr = String(ticketStatusRaw).toLowerCase();
      if (statusStr === '4' || statusStr === 'resolved' || statusStr.includes('resolv')) {
        mappedStatus = 'RESOLVED';
        isResolved = true;
      } else if (statusStr === '5' || statusStr === 'closed' || statusStr.includes('clos')) {
        mappedStatus = 'CLOSED';
        isResolved = true;
      } else if (statusStr === '3' || statusStr === 'pending' || statusStr.includes('review')) {
        mappedStatus = 'IN_REVIEW';
      } else if (statusStr === '2' || statusStr === 'open') {
        mappedStatus = 'OPEN';
      }

      if (mappedStatus && mappedStatus !== ticket.status) {
        await this.prisma.supportTicket.update({
          where: { id: ticket.id },
          data: {
            status: mappedStatus,
            resolvedAt: isResolved ? new Date() : ticket.resolvedAt,
            updatedAt: new Date(),
          },
        });
      }
    }

    // 3. Log Audit Trail
    await this.prisma.supportAuditEvent.create({
      data: {
        ticketId: ticket.id,
        action: replyBody ? 'FRESHDESK_AGENT_REPLIED' : 'FRESHDESK_STATUS_UPDATED',
        actorName: agentName,
        actorRole: 'SUPPORT_AGENT',
        details: JSON.stringify({
          freshdeskTicketId: ticketIdRaw,
          newStatus: mappedStatus || ticket.status,
          whatsappDispatched,
          hasReply: Boolean(replyBody),
        }),
      },
    });

    return {
      success: true,
      ticketId: ticket.id,
      referenceId: ticket.referenceId,
      status: mappedStatus || ticket.status,
      whatsappDispatched,
    };
  }
}
