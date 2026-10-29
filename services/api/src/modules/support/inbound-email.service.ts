import { Injectable, Logger, Optional, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SupportEmailService } from './email.service';

export interface NormalizedInboundEmail {
  fromEmail: string;
  fromName?: string;
  toEmail?: string;
  subject: string;
  textBody: string;
  htmlBody?: string;
  messageId?: string;
  inReplyTo?: string;
  references?: string;
  timestamp?: Date;
}

@Injectable()
export class InboundEmailService {
  private readonly logger = new Logger(InboundEmailService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: SupportEmailService,
  ) {}

  /**
   * Processes an incoming email payload from Cloudflare Email Routing, Postmark,
   * SendGrid Inbound Parse, Mailgun, or direct webhook bridge.
   */
  async handleInboundEmail(payload: Record<string, any>): Promise<{
    accepted: boolean;
    processed: boolean;
    action?: 'TICKET_CREATED' | 'NOTE_APPENDED' | 'DUPLICATE_IGNORED';
    ticketId?: string;
    referenceId?: string;
    message?: string;
  }> {
    const parsed = this.normalizeInboundPayload(payload);

    if (!parsed || !parsed.fromEmail || !parsed.fromEmail.includes('@')) {
      this.logger.warn(`Rejected invalid inbound email payload: missing sender email`);
      return {
        accepted: false,
        processed: false,
        message: 'Invalid email payload: missing valid fromEmail',
      };
    }

    const {
      fromEmail,
      fromName,
      subject,
      textBody,
      messageId,
      inReplyTo,
      references,
    } = parsed;

    // 1. Idempotency Check: Prevent duplicate messages from webhook retries
    if (messageId) {
      const existingMessage = await this.prisma.supportMessage.findFirst({
        where: { channelMessageId: messageId },
      });
      if (existingMessage) {
        this.logger.warn(`Deduplicated incoming email with channelMessageId: ${messageId}`);
        return {
          accepted: true,
          processed: true,
          action: 'DUPLICATE_IGNORED',
          message: 'Message already processed',
        };
      }
    }

    // 2. Identify Registered TechArtha Client (by verified email)
    const matchedUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: fromEmail, mode: 'insensitive' } },
          { profile: { email: { equals: fromEmail, mode: 'insensitive' } } },
        ],
      },
      include: {
        profile: true,
        kycApplication: true,
        riskProfile: true,
      },
    });

    const customerDisplayName =
      fromName ||
      matchedUser?.profile?.fullName ||
      matchedUser?.email?.split('@')[0] ||
      fromEmail.split('@')[0];

    // 3. Thread Matching
    // Check subject for existing Reference ID [TA-E-XXXX] or [TA-Q-XXXX] or [TA-W-XXXX]
    const refMatch = subject.match(/\b(TA-[EQWSA]-[A-Z0-9]+)\b/i);
    const subjectReferenceId = refMatch ? refMatch[1].toUpperCase() : null;

    let matchedTicket: any = null;

    if (subjectReferenceId) {
      matchedTicket = await this.prisma.supportTicket.findFirst({
        where: {
          referenceId: { equals: subjectReferenceId, mode: 'insensitive' },
        },
      });
    }

    // Fallback: match by In-Reply-To / References against previous support messages
    if (!matchedTicket && (inReplyTo || references)) {
      const targetHeader = inReplyTo || references;
      const priorMsg = await this.prisma.supportMessage.findFirst({
        where: { channelMessageId: targetHeader },
        include: { ticket: true },
      });
      if (priorMsg?.ticket) {
        matchedTicket = priorMsg.ticket;
      }
    }

    // Fallback: match open / recent ticket from the same customer email
    if (!matchedTicket) {
      matchedTicket = await this.prisma.supportTicket.findFirst({
        where: {
          customerEmail: { equals: fromEmail, mode: 'insensitive' },
          status: { in: ['OPEN', 'RECEIVED', 'IN_REVIEW'] },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    // 4. Thread Found: Append to Existing Ticket
    if (matchedTicket) {
      const wasClosedOrResolved =
        matchedTicket.status === 'RESOLVED' || matchedTicket.status === 'CLOSED';

      this.logger.log(
        `Inbound email matched existing ticket #${matchedTicket.referenceId} from ${fromEmail}. Appending message to thread.`,
      );

      // Append message
      await this.prisma.supportMessage.create({
        data: {
          ticketId: matchedTicket.id,
          senderType: 'USER',
          senderName: customerDisplayName,
          senderEmail: fromEmail,
          content: textBody,
          channel: 'EMAIL',
          channelMessageId: messageId || `email-${Date.now()}`,
          deliveryStatus: 'DELIVERED',
        },
      });

      // Update ticket header and ensure status is OPEN
      await this.prisma.supportTicket.update({
        where: { id: matchedTicket.id },
        data: {
          lastCustomerMessage: textBody,
          status: 'OPEN',
          updatedAt: new Date(),
        },
      });

      // Log audit trail
      await this.prisma.supportAuditEvent.create({
        data: {
          ticketId: matchedTicket.id,
          action: wasClosedOrResolved
            ? 'CUSTOMER_REOPENED_TICKET_VIA_EMAIL'
            : 'CUSTOMER_EMAIL_FOLLOWUP',
          actorName: customerDisplayName,
          actorRole: 'CUSTOMER',
          details: `Appended follow-up email message (${textBody.length} characters). Subject: "${subject}"`,
        },
      });

      // Notify active support agents
      await this.notifyActiveAgents(matchedTicket, customerDisplayName, `Email reply on ${matchedTicket.referenceId}`);

      return {
        accepted: true,
        processed: true,
        action: 'NOTE_APPENDED',
        ticketId: matchedTicket.id,
        referenceId: matchedTicket.referenceId,
      };
    }

    // 5. No Ticket Found: Create New Support Ticket
    const shortHash = Math.random().toString(36).substring(2, 8).toUpperCase();
    const referenceId = `TA-E-${shortHash}`;
    const cleanSubject = subject ? subject.slice(0, 120) : 'Support Inquiry via Email';

    const newTicket = await this.prisma.supportTicket.create({
      data: {
        referenceId,
        channel: 'EMAIL',
        priority: 'MEDIUM',
        customerEmail: fromEmail,
        customerName: customerDisplayName,
        customerPhone: matchedUser?.mobile || null,
        lastCustomerMessage: textBody,
        userId: matchedUser?.id || null,
        subject: cleanSubject,
        message: textBody,
        status: 'OPEN',
      },
    });

    // Save initial message in thread
    await this.prisma.supportMessage.create({
      data: {
        ticketId: newTicket.id,
        senderType: 'USER',
        senderName: customerDisplayName,
        senderEmail: fromEmail,
        content: textBody,
        channel: 'EMAIL',
        channelMessageId: messageId || `email-${Date.now()}`,
        deliveryStatus: 'DELIVERED',
      },
    });

    // Save audit log
    await this.prisma.supportAuditEvent.create({
      data: {
        ticketId: newTicket.id,
        action: 'TICKET_CREATED_VIA_EMAIL',
        actorName: customerDisplayName,
        actorRole: 'CUSTOMER',
        details: `Created via Email inbound to support@techartha.com. Subject: "${cleanSubject}"`,
      },
    });

    // Dispatch automatic query acknowledgement email via ZeptoMail
    try {
      await this.emailService.sendQueryAcknowledgementEmail({
        to: fromEmail,
        userName: customerDisplayName,
        referenceId,
        subject: cleanSubject,
        message: textBody,
        status: 'Received',
        createdAt: newTicket.createdAt,
      });
      this.logger.log(`Dispatched automated acknowledgement email for ${referenceId} to ${fromEmail}`);
    } catch (err: any) {
      this.logger.warn(`Failed to dispatch automatic email acknowledgement: ${err?.message}`);
    }

    // Notify active technical agents
    await this.notifyActiveAgents(newTicket, customerDisplayName, `New Email Ticket: ${referenceId}`);

    return {
      accepted: true,
      processed: true,
      action: 'TICKET_CREATED',
      ticketId: newTicket.id,
      referenceId,
    };
  }

  /**
   * Normalizes incoming email payloads across multiple webhook formats:
   * 1. Cloudflare Email Worker
   * 2. Postmark Inbound
   * 3. SendGrid Inbound Parse
   * 4. Mailgun Routes
   * 5. Direct / Custom webhook format
   */
  private normalizeInboundPayload(body: Record<string, any>): NormalizedInboundEmail | null {
    if (!body || typeof body !== 'object') return null;

    // Format 1: Cloudflare Email Routing / Worker
    if (body.from && (body.text || body.html || body.subject)) {
      const rawFrom = String(body.from);
      const emailMatch = rawFrom.match(/<([^>]+)>/) || [null, rawFrom];
      const fromEmail = (emailMatch[1] || rawFrom).trim().toLowerCase();
      const fromName = body.fromName || (rawFrom.includes('<') ? rawFrom.split('<')[0].trim() : undefined);

      return {
        fromEmail,
        fromName,
        toEmail: body.to ? String(body.to).trim().toLowerCase() : undefined,
        subject: String(body.subject || 'Support Inquiry').trim(),
        textBody: String(body.text || body.message || body.html || '').trim(),
        htmlBody: body.html ? String(body.html) : undefined,
        messageId: body.messageId ? String(body.messageId).trim() : undefined,
        inReplyTo: body.inReplyTo ? String(body.inReplyTo).trim() : undefined,
        references: body.references ? String(body.references).trim() : undefined,
        timestamp: body.timestamp ? new Date(body.timestamp) : new Date(),
      };
    }

    // Format 2: Postmark Inbound JSON
    if (body.From && body.Subject) {
      const fromEmail = String(body.From).trim().toLowerCase();
      const fromName = body.FromName ? String(body.FromName).trim() : undefined;
      const textBody = String(body.TextBody || body.HtmlBody || '').trim();

      return {
        fromEmail,
        fromName,
        toEmail: body.To ? String(body.To).trim().toLowerCase() : undefined,
        subject: String(body.Subject).trim(),
        textBody,
        htmlBody: body.HtmlBody ? String(body.HtmlBody) : undefined,
        messageId: body.MessageID ? String(body.MessageID).trim() : undefined,
        timestamp: body.Date ? new Date(body.Date) : new Date(),
      };
    }

    // Format 3: Mailgun Inbound Routes
    if (body.sender && body.subject) {
      const fromEmail = String(body.sender).trim().toLowerCase();
      const textBody = String(body['stripped-text'] || body['body-plain'] || body['body-html'] || '').trim();

      return {
        fromEmail,
        fromName: body['from'] ? String(body['from']).split('<')[0].trim() : undefined,
        toEmail: body.recipient ? String(body.recipient).trim().toLowerCase() : undefined,
        subject: String(body.subject).trim(),
        textBody,
        htmlBody: body['body-html'] ? String(body['body-html']) : undefined,
        messageId: body['Message-Id'] ? String(body['Message-Id']).trim() : undefined,
        inReplyTo: body['In-Reply-To'] ? String(body['In-Reply-To']).trim() : undefined,
      };
    }

    // Format 4: Generic direct testing payload { fromEmail, subject, message }
    if (body.fromEmail && (body.message || body.text || body.subject)) {
      return {
        fromEmail: String(body.fromEmail).trim().toLowerCase(),
        fromName: body.fromName ? String(body.fromName).trim() : undefined,
        toEmail: body.toEmail ? String(body.toEmail).trim().toLowerCase() : undefined,
        subject: String(body.subject || 'Support Inquiry').trim(),
        textBody: String(body.message || body.text || '').trim(),
        messageId: body.messageId ? String(body.messageId).trim() : undefined,
        inReplyTo: body.inReplyTo ? String(body.inReplyTo).trim() : undefined,
      };
    }

    return null;
  }

  private async notifyActiveAgents(ticket: any, customerName: string, title: string) {
    if ((this.prisma as any)?.technicalAgent?.findMany) {
      try {
        const activeAgents = await (this.prisma as any).technicalAgent.findMany({
          where: { isActive: true, notifyOnTickets: true },
        });

        const targetUserId = ticket.userId || (await this.prisma.user.findFirst({ select: { id: true } }))?.id;

        if (targetUserId) {
          for (const agent of activeAgents) {
            await this.prisma.notification.create({
              data: {
                userId: targetUserId,
                type: 'AGENT_NEW_TICKET_ALERT',
                title,
                body: `${customerName} (${ticket.customerEmail || 'Email Investor'}): "${ticket.subject}"`,
                channel: 'ADMIN_PORTAL',
                status: 'SENT',
              },
            }).catch(() => {});
          }
        }
      } catch (err: any) {
        this.logger.warn(`Failed to notify technical agents: ${err?.message}`);
      }
    }
  }
}
