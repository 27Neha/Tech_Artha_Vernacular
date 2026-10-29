import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  WhatsAppProvider,
  MetaWhatsAppCloudProvider,
  MockWhatsAppProvider,
  WhatsAppReminderMessageInput,
  WhatsAppMessageResult,
} from './whatsapp.provider';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private provider: WhatsAppProvider;
  public mockProvider: MockWhatsAppProvider;

  constructor(private readonly prisma?: PrismaService) {
    this.mockProvider = new MockWhatsAppProvider();
    this.initProvider();
  }

  private initProvider() {
    const apiToken = process.env.WHATSAPP_API_TOKEN?.trim();
    const phoneId = process.env.WHATSAPP_PHONE_ID?.trim();
    const explicitProvider = process.env.WHATSAPP_PROVIDER?.toLowerCase();

    if (apiToken && phoneId && explicitProvider !== 'mock') {
      this.logger.log('[WhatsAppService] Initialized with Meta WhatsApp Cloud API Provider.');
      this.provider = new MetaWhatsAppCloudProvider(apiToken, phoneId);
    } else {
      this.logger.log('[WhatsAppService] Initialized with Sandbox/Mock Provider (no production credentials).');
      this.provider = this.mockProvider;
    }
  }

  /**
   * Allows injecting a custom or mock provider during testing.
   */
  setProvider(customProvider: WhatsAppProvider) {
    this.provider = customProvider;
  }

  getProviderName(): 'meta_cloud' | 'mock' {
    return this.provider.providerName;
  }

  /**
   * Sends the approved WhatsApp Incomplete Signup reminder template message.
   * Template body:
   * "Hey {{name}}! 👋 Your TechArtha journey has already begun. 🌱
   *  You're just one step away from completing your profile!
   *  Finish setting up your account and get ready to explore smarter ways to plan your financial goals. 💚
   *  Your goals deserve that next step. ✨
   *  Tap below to pick up right where you left off!
   *  Button: Open TechArtha 🚀"
   */
  async sendIncompleteSignupReminder(input: {
    mobile: string;
    userName?: string;
    resumeToken: string;
    resumeStep?: string;
    templateName?: string;
    languageCode?: string;
  }): Promise<WhatsAppMessageResult> {
    const baseUrl = process.env.APP_RESUME_BASE_URL || 'https://techartha.com/resume';
    const resumeUrl = `${baseUrl}?ref=${encodeURIComponent(input.resumeToken)}`;

    const reminderInput: WhatsAppReminderMessageInput = {
      to: input.mobile,
      userName: input.userName?.trim() || 'there',
      resumeToken: input.resumeToken,
      resumeUrl,
      templateName: input.templateName,
      languageCode: input.languageCode,
    };

    return this.provider.sendIncompleteSignupReminder(reminderInput);
  }

  /**
   * Handles user opt-out (e.g. from incoming WhatsApp STOP / UNSUBSCRIBE messages).
   * Persists the opt-out status on SignupReminder so no future reminders are ever sent.
   */
  async handleOptOut(mobile: string): Promise<{ optedOut: boolean; count: number }> {
    if (!this.prisma) {
      return { optedOut: true, count: 0 };
    }
    const cleanedDigits = mobile.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
    const searchVariants = [cleanedDigits, `+91${cleanedDigits}`, `91${cleanedDigits}`];

    // Find all users with matching mobile
    const users = await this.prisma.user.findMany({
      where: {
        mobile: { in: searchVariants },
      },
      select: { id: true, mobile: true },
    });

    if (!users.length) {
      this.logger.warn('[WhatsApp] Received opt-out for unregistered or unknown mobile variant.');
      return { optedOut: false, count: 0 };
    }

    let updatedCount = 0;
    for (const u of users) {
      // Upsert or update SignupReminder status to OPTED_OUT
      await this.prisma.signupReminder.upsert({
        where: { userId: u.id },
        update: {
          status: 'OPTED_OUT',
          failureReason: 'User opted out via WhatsApp reply.',
        },
        create: {
          userId: u.id,
          mobile: u.mobile || cleanedDigits,
          status: 'OPTED_OUT',
          failureReason: 'User opted out via WhatsApp reply.',
        },
      });

      // Audit log the opt-out
      await this.prisma.auditLog.create({
        data: {
          userId: u.id,
          action: 'WHATSAPP_REMINDER_OPTED_OUT',
          details: JSON.stringify({ channel: 'WHATSAPP', optedOutAt: new Date().toISOString() }),
        },
      });
      updatedCount++;
    }

    this.logger.log(`[WhatsApp] Successfully processed opt-out for ${updatedCount} user record(s).`);
    return { optedOut: true, count: updatedCount };
  }

  /**
   * Webhook message handler for incoming WhatsApp events.
   * Safely checks for opt-out keywords without logging personal data.
   */
  async handleWhatsAppMessage(payload: Record<string, unknown>) {
    const entry = Array.isArray(payload.entry) ? (payload.entry[0] as Record<string, unknown>) : undefined;
    const changes = entry && Array.isArray(entry.changes) ? (entry.changes[0] as Record<string, unknown>) : undefined;
    const value = changes?.value as Record<string, unknown> | undefined;
    const messages = value && Array.isArray(value.messages) ? value.messages : [];

    if (!messages.length) {
      return { accepted: true, processed: false };
    }

    const firstMsg = messages[0] as Record<string, unknown>;
    const sender = typeof firstMsg.from === 'string' ? firstMsg.from : undefined;
    const textBody =
      typeof firstMsg.text === 'object' && firstMsg.text !== null
        ? ((firstMsg.text as Record<string, unknown>).body as string)
        : '';
    const buttonPayload =
      typeof firstMsg.button === 'object' && firstMsg.button !== null
        ? ((firstMsg.button as Record<string, unknown>).payload as string)
        : '';

    const contentToCheck = `${textBody} ${buttonPayload}`.trim().toUpperCase();
    const optOutKeywords = ['STOP', 'UNSUBSCRIBE', 'OPT OUT', 'OPTOUT', 'CANCEL', 'NO'];

    const isOptOut = optOutKeywords.some((kw) => contentToCheck.includes(kw));

    if (isOptOut && sender) {
      this.logger.log('[WhatsApp Webhook] Opt-out keyword detected from incoming message.');
      const res = await this.handleOptOut(sender);
      return { accepted: true, processed: true, action: 'OPTED_OUT', recordsUpdated: res.count };
    }

    this.logger.log('[WhatsApp Webhook] Message received. Non-opt-out event ignored.');
    return { accepted: true, processed: false, status: 'RECEIVED' };
  }
}
