import { Injectable, Logger, Optional, Inject, forwardRef } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../../prisma/prisma.service';
import { FreshdeskService } from '../../modules/support/freshdesk.service';

export interface WhatsAppInboundMessage {
  from: string;
  senderName?: string;
  messageId: string;
  text: string;
  timestamp?: string;
}

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly whatsappApiToken: string;
  private readonly whatsappPhoneId: string;
  private readonly interaktApiKey: string;

  constructor(
    @Optional() private readonly prisma?: PrismaService,
    @Optional()
    @Inject(forwardRef(() => FreshdeskService))
    private readonly freshdeskService?: FreshdeskService,
  ) {
    this.whatsappApiToken = (process.env.WHATSAPP_API_TOKEN || '').trim();
    this.whatsappPhoneId = (process.env.WHATSAPP_PHONE_ID || '').trim();
    this.interaktApiKey = (process.env.INTERAKT_SECRET_KEY || process.env.INTERAKT_API_KEY || '').trim();
  }

  /**
   * Dispatches an outbound WhatsApp message to a customer's phone.
   * Prioritizes Interakt (official WhatsApp BSP for TechArtha), with Meta Cloud API and mock fallback.
   */
  async sendWhatsAppMessage(
    toPhone: string,
    messageText: string,
  ): Promise<{ success: boolean; channel: string; messageId?: string; error?: string }> {
    const cleanPhone = toPhone.replace(/[^0-9]/g, '');

    // 1. Format country code and 10-digit phone
    let countryCode = '+91';
    let phoneNumber = cleanPhone;
    if (cleanPhone.startsWith('91') && cleanPhone.length > 10) {
      countryCode = '+91';
      phoneNumber = cleanPhone.slice(2);
    } else if (cleanPhone.length === 10) {
      countryCode = '+91';
      phoneNumber = cleanPhone;
    }

    // 2. Dispatch via Interakt WhatsApp API if configured
    if (this.interaktApiKey) {
      try {
        const url = 'https://api.interakt.ai/v1/public/message/';
        const payload = {
          countryCode,
          phoneNumber,
          type: 'Text',
          data: {
            message: messageText,
          },
        };

        const res = await axios.post(url, payload, {
          headers: {
            Authorization: `Basic ${this.interaktApiKey}`,
            'Content-Type': 'application/json',
          },
        });

        this.logger.log(`Outbound WhatsApp reply dispatched via Interakt to ${countryCode} ${phoneNumber}`);
        return { success: true, channel: 'INTERAKT', messageId: res.data?.id };
      } catch (error: any) {
        const errorMsg = error?.response?.data?.message || error?.message || '';
        if (errorMsg.includes('last 24 hours') || error?.response?.status === 400) {
          this.logger.warn(
            `WhatsApp 24h Window Notice for ${phoneNumber}: Customer must message +91 83088 16023 within 24 hours to receive direct text replies. (${errorMsg})`,
          );
          return { success: false, channel: 'INTERAKT', error: 'WHATSAPP_24H_WINDOW_CLOSED' };
        } else {
          this.logger.error(
            `Failed to send WhatsApp message via Interakt: ${error?.response?.status} ${JSON.stringify(error?.response?.data || error.message)}`,
          );
        }
      }
    }

    // 3. Fallback to Meta Cloud API if configured
    if (this.whatsappApiToken && this.whatsappPhoneId) {
      try {
        const url = `https://graph.facebook.com/v19.0/${this.whatsappPhoneId}/messages`;
        const payload = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanPhone,
          type: 'text',
          text: {
            preview_url: false,
            body: messageText,
          },
        };

        const res = await axios.post(url, payload, {
          headers: {
            Authorization: `Bearer ${this.whatsappApiToken}`,
            'Content-Type': 'application/json',
          },
        });

        const msgId = res.data?.messages?.[0]?.id;
        this.logger.log(`Outbound WhatsApp message sent via Meta Cloud API to ${cleanPhone} (id: ${msgId})`);
        return { success: true, channel: 'META_CLOUD_API', messageId: msgId };
      } catch (error: any) {
        this.logger.error(
          `Failed to send WhatsApp message via Meta Cloud API: ${error?.response?.status} ${JSON.stringify(error?.response?.data || error.message)}`,
        );
      }
    }

    // 4. Safe simulated delivery when live credentials are not present
    this.logger.log(`[WHATSAPP DEV DISPATCH] To: ${cleanPhone} | Message: "${messageText}"`);
    return { success: true, channel: 'MOCK_DEV' };
  }

  /**
   * Handles an inbound webhook payload from WhatsApp / Meta Cloud API or Interakt.
   */
  async handleWhatsAppMessage(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    // 0. Handle Interakt Status Webhooks (Delivery, Read, Failed Receipts)
    const eventType = String(payload?.type || '').toLowerCase();
    if (eventType.includes('delivered') || eventType.includes('read') || eventType.includes('failed')) {
      const status = eventType.includes('read')
        ? 'READ'
        : eventType.includes('delivered')
        ? 'DELIVERED'
        : 'FAILED';

      const dataObj = (payload?.data || {}) as Record<string, any>;
      const channelMsgId = dataObj?.message?.id || dataObj?.id || payload?.id;

      if (channelMsgId && this.prisma) {
        try {
          await this.prisma.supportMessage.updateMany({
            where: { channelMessageId: String(channelMsgId) },
            data: { deliveryStatus: status },
          });
          this.logger.log(`Updated WhatsApp message ${channelMsgId} delivery status to ${status}`);
          return { accepted: true, processed: true, event: eventType, status };
        } catch (err: any) {
          this.logger.warn(`Failed to update status for message ${channelMsgId}: ${err?.message}`);
        }
      }
      return { accepted: true, processed: true, event: eventType };
    }

    const parsed = this.parseInboundPayload(payload);

    if (!parsed) {
      return { accepted: true, processed: false };
    }

    // If Prisma is not injected (e.g. isolated unit tests or unconfigured stub),
    // maintain the original safe unconfigured behaviour.
    if (!this.prisma) {
      this.logger.log('Received a WhatsApp message event. Stateful conversation processing is not configured.');
      return {
        accepted: true,
        processed: false,
        status: 'NOT_CONFIGURED — WHATSAPP BUSINESS ACCESS REQUIRED',
        message: 'No customer data was read or replied to because the authorised WhatsApp provider flow is not configured.',
      };
    }

    const { from: rawPhone, senderName, messageId, text: messageText } = parsed;
    const cleanPhoneDigits = rawPhone.replace(/[^0-9]/g, '');
    const last10 = cleanPhoneDigits.slice(-10);
    const e164Phone = cleanPhoneDigits.startsWith('91') ? `+${cleanPhoneDigits}` : `+91${last10}`;

    // 1. Idempotency Check
    if (messageId) {
      const existingMessage = await this.prisma.supportMessage.findFirst({
        where: { channelMessageId: messageId },
      });
      if (existingMessage) {
        this.logger.warn(`Deduplicated WhatsApp message with channelMessageId: ${messageId}`);
        return { accepted: true, processed: true, duplicate: true };
      }
    }

    // 2. Identify Registered Customer in TechArtha
    const matchedUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { mobile: last10 },
          { mobile: e164Phone },
          { mobile: cleanPhoneDigits },
          { mobile: `0${last10}` },
        ],
      },
      include: {
        profile: true,
        kycApplication: true,
        riskProfile: true,
      },
    });

    const customerDisplayName =
      senderName ||
      matchedUser?.profile?.fullName ||
      (matchedUser?.email ? matchedUser.email.split('@')[0] : `Customer (${last10})`);

    // 3. Threading / Active Ticket Check (Reopen if previously resolved/closed)
    const activeTicket = await this.prisma.supportTicket.findFirst({
      where: {
        customerPhone: { contains: last10 },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (activeTicket) {
      const wasClosedOrResolved =
        activeTicket.status === 'RESOLVED' || activeTicket.status === 'CLOSED';

      this.logger.log(
        `Support ticket #${activeTicket.referenceId} found for ${last10} (Status: ${activeTicket.status}). Appending message and ensuring OPEN status.`,
      );

      // Append follow-up message to conversation thread
      await this.prisma.supportMessage.create({
        data: {
          ticketId: activeTicket.id,
          senderType: 'USER',
          senderName: customerDisplayName,
          senderEmail: matchedUser?.email || activeTicket.customerEmail,
          content: messageText,
          channel: 'WHATSAPP',
          channelMessageId: messageId || undefined,
          deliveryStatus: 'DELIVERED',
        },
      });

      // Update ticket last message and reopen to OPEN if it was resolved/closed
      await this.prisma.supportTicket.update({
        where: { id: activeTicket.id },
        data: {
          lastCustomerMessage: messageText,
          status: 'OPEN', // Reopens automatically on customer reply!
          updatedAt: new Date(),
        },
      });

      // Forward reply to Freshdesk if ticket ID exists
      if (activeTicket.freshdeskTicketId && this.freshdeskService) {
        try {
          await this.freshdeskService.addCustomerReplyNote(
            activeTicket.freshdeskTicketId.toString(),
            messageText,
          );
          if (wasClosedOrResolved) {
            await this.freshdeskService.updateTicketStatus(
              activeTicket.freshdeskTicketId.toString(),
              2, // Reopen ticket in Freshdesk (2 = Open)
            );
          }
        } catch (err: any) {
          this.logger.warn(`Failed to push note to Freshdesk: ${err?.message}`);
        }
      }

      await this.prisma.supportAuditEvent.create({
        data: {
          ticketId: activeTicket.id,
          action: wasClosedOrResolved
            ? 'CUSTOMER_REOPENED_TICKET_VIA_WHATSAPP'
            : 'CUSTOMER_WHATSAPP_FOLLOWUP',
          actorName: customerDisplayName,
          actorRole: 'CUSTOMER',
          details: wasClosedOrResolved
            ? `Customer sent a new message on resolved ticket. Reopened ticket to OPEN.`
            : `Appended follow-up WhatsApp message (${messageText.length} chars)`,
        },
      });

      return {
        accepted: true,
        processed: true,
        action: wasClosedOrResolved ? 'TICKET_REOPENED' : 'NOTE_APPENDED',
        ticketId: activeTicket.id,
        referenceId: activeTicket.referenceId,
      };
    }

    // 4. Create New Support Ticket
    const shortHash = Math.random().toString(36).substring(2, 8).toUpperCase();
    const referenceId = `TA-W-${shortHash}`;
    const subject = `WhatsApp Support: ${messageText.slice(0, 48)}`;

    const description = [
      `Source: WhatsApp Support (+91 83088 16023)`,
      `Customer Phone: ${e164Phone}`,
      `Customer Name: ${customerDisplayName}`,
      `TechArtha Client ID: ${matchedUser ? matchedUser.id : 'Unregistered / Visitor'}`,
      `Registered Email: ${matchedUser?.email || 'N/A'}`,
      `KYC Status: ${matchedUser?.kycApplication?.overallStatus || 'N/A'}`,
      `Risk Category: ${matchedUser?.riskProfile?.category || 'N/A'}`,
      `\n--- Initial Message ---`,
      messageText,
    ].join('\n');

    let freshdeskTicketId: bigint | null = null;
    let freshdeskStatus = 2; // Open

    if (this.freshdeskService) {
      try {
        const fdTicket = await this.freshdeskService.createTicket({
          subject,
          description,
          phone: e164Phone,
          email: matchedUser?.email || undefined,
          name: customerDisplayName,
          priority: 2, // Medium
          status: 2,   // Open
          source: 7,   // Chat
        });
        if (fdTicket?.id) {
          freshdeskTicketId = BigInt(fdTicket.id);
          freshdeskStatus = fdTicket.status || 2;
        }
      } catch (err: any) {
        this.logger.error(`Freshdesk ticket creation error: ${err?.message}. Saving to DB regardless.`);
      }
    }

    const newTicket = await this.prisma.supportTicket.create({
      data: {
        referenceId,
        freshdeskTicketId,
        freshdeskStatus,
        channel: 'WHATSAPP',
        priority: 'MEDIUM',
        customerPhone: e164Phone,
        customerEmail: matchedUser?.email || null,
        customerName: customerDisplayName,
        lastCustomerMessage: messageText,
        userId: matchedUser?.id || null,
        subject,
        message: messageText,
        status: 'OPEN',
      },
    });

    // Save initial message in thread
    await this.prisma.supportMessage.create({
      data: {
        ticketId: newTicket.id,
        senderType: 'USER',
        senderName: customerDisplayName,
        senderEmail: matchedUser?.email || null,
        content: messageText,
        channel: 'WHATSAPP',
        channelMessageId: messageId || undefined,
        deliveryStatus: 'DELIVERED',
      },
    });

    // Save audit log
    await this.prisma.supportAuditEvent.create({
      data: {
        ticketId: newTicket.id,
        action: 'TICKET_CREATED_VIA_WHATSAPP',
        actorName: customerDisplayName,
        actorRole: 'CUSTOMER',
        details: `Created via WhatsApp inbound. Freshdesk ticket: #${freshdeskTicketId ? freshdeskTicketId.toString() : 'LOCAL'}`,
      },
    });

    // Send immediate automatic WhatsApp acknowledgement to the customer
    const ackMessage = `Hello ${customerDisplayName}, thank you for contacting TechArtha Support! We've received your inquiry (Ref: ${referenceId}). Our team is reviewing it and will respond to you right here on WhatsApp shortly.`;
    try {
      await this.sendWhatsAppMessage(e164Phone, ackMessage);
    } catch (err: any) {
      this.logger.warn(`Failed to send initial WhatsApp acknowledgement: ${err?.message}`);
    }

    return {
      accepted: true,
      processed: true,
      action: 'TICKET_CREATED',
      ticketId: newTicket.id,
      referenceId,
      freshdeskTicketId: freshdeskTicketId ? freshdeskTicketId.toString() : null,
    };
  }

  /**
   * Helper to parse WhatsApp messages across Meta Cloud API, Interakt, or direct testing payloads.
   */
  private parseInboundPayload(payload: Record<string, any>): WhatsAppInboundMessage | null {
    // 1. Meta Cloud API format
    const entry = Array.isArray(payload?.entry) ? payload.entry[0] : undefined;
    const changes = entry && Array.isArray(entry.changes) ? entry.changes[0] : undefined;
    const value = changes?.value;
    const messages = value && Array.isArray(value.messages) ? value.messages : [];

    if (messages.length > 0) {
      const msg = messages[0];
      const contacts = value?.contacts && Array.isArray(value.contacts) ? value.contacts : [];
      const contact = contacts[0];
      const text = msg.text?.body || msg.caption || '';
      if (!text) return null;

      return {
        from: msg.from,
        senderName: contact?.profile?.name,
        messageId: msg.id,
        text,
        timestamp: msg.timestamp,
      };
    }

    // 2. Interakt Inbound webhook format
    if ((payload?.type === 'message_received' || payload?.event === 'message_received') && payload?.data) {
      const data = payload.data as Record<string, any>;
      const customer = data.customer || {};
      const traits = customer.traits || {};
      const msg = data.message || {};

      const phone =
        customer.channel_phone_number ||
        (customer.phone_number
          ? `${customer.country_code || '+91'}${customer.phone_number}`
          : '');

      const senderName =
        customer.name ||
        traits.Name ||
        traits.name ||
        traits.fullName ||
        undefined;

      const text =
        msg.text?.body ||
        msg.message ||
        (typeof msg.text === 'string' ? msg.text : '') ||
        msg.caption ||
        (msg.media ? '[Media Attachment]' : '');

      if (phone && text) {
        return {
          from: phone,
          senderName,
          messageId: msg.id || data.id || payload.id || `interakt-${Date.now()}`,
          text,
        };
      }
    }

    // 3. Direct/Testing payload format ({ phone, text/message, senderName })
    if (payload?.phone && (payload?.text || payload?.message)) {
      return {
        from: String(payload.phone),
        senderName: payload.senderName ? String(payload.senderName) : undefined,
        messageId: payload.messageId ? String(payload.messageId) : `test-${Date.now()}`,
        text: String(payload.text || payload.message),
      };
    }

    return null;
  }
}
