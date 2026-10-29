import { Logger } from '@nestjs/common';
import axios from 'axios';

export interface WhatsAppReminderMessageInput {
  to: string; // Recipient mobile number
  userName: string;
  resumeToken: string;
  resumeUrl: string;
  templateName?: string;
  languageCode?: string;
}

export interface WhatsAppMessageResult {
  success: boolean;
  messageId?: string;
  status: 'SENT' | 'FAILED' | 'MOCK_SENT';
  error?: string;
  provider: 'meta_cloud' | 'mock';
  dispatchedAt: Date;
}

export interface WhatsAppProvider {
  readonly providerName: 'meta_cloud' | 'mock';
  sendIncompleteSignupReminder(input: WhatsAppReminderMessageInput): Promise<WhatsAppMessageResult>;
}

/**
 * Production-ready Meta WhatsApp Cloud API Provider (Graph API v21.0)
 * Uses official WhatsApp Business template message with dynamic interactive URL button.
 */
export class MetaWhatsAppCloudProvider implements WhatsAppProvider {
  readonly providerName = 'meta_cloud' as const;
  private readonly logger = new Logger(MetaWhatsAppCloudProvider.name);

  constructor(
    private readonly apiToken: string,
    private readonly phoneId: string,
    private readonly apiVersion: string = 'v21.0',
    private readonly baseUrl: string = 'https://graph.facebook.com'
  ) {}

  async sendIncompleteSignupReminder(input: WhatsAppReminderMessageInput): Promise<WhatsAppMessageResult> {
    const templateName = input.templateName || process.env.WHATSAPP_REMINDER_TEMPLATE_NAME || 'techartha_incomplete_signup_reminder';
    const languageCode = input.languageCode || 'en';
    const rawTo = input.to || (input as any).mobile || '';
    const normalizedMobile = this.normalizeRecipientMobile(rawTo);

    // Meta template interactive URL buttons accept a dynamic text parameter which is appended
    // to the base URL registered in the WhatsApp Business Manager template (or the full token).
    const buttonParam = input.resumeToken || '';

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: normalizedMobile,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: languageCode,
        },
        components: [
          {
            type: 'body',
            parameters: [
              {
                type: 'text',
                text: input.userName || 'there',
              },
            ],
          },
          {
            type: 'button',
            sub_type: 'url',
            index: '0',
            parameters: [
              {
                type: 'text',
                text: buttonParam,
              },
            ],
          },
        ],
      },
    };

    const endpoint = `${this.baseUrl}/${this.apiVersion}/${this.phoneId}/messages`;

    try {
      this.logger.log(`[Meta WhatsApp] Dispatching template "${templateName}" to masked recipient`);
      const response = await axios.post(endpoint, payload, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiToken}`,
        },
        timeout: 10000,
      });

      const messageId = response.data?.messages?.[0]?.id;
      return {
        success: true,
        messageId: messageId || `wamid.meta_${Date.now()}`,
        status: 'SENT',
        provider: 'meta_cloud',
        dispatchedAt: new Date(),
      };
    } catch (err: any) {
      const metaError = err.response?.data?.error?.message || err.message || 'Unknown Meta Cloud API error';
      const statusCode = err.response?.status;
      // Never log sensitive authorization headers or secret payloads
      this.logger.error(`[Meta WhatsApp] API dispatch error (status: ${statusCode}): ${metaError}`);

      return {
        success: false,
        status: 'FAILED',
        error: `Meta Cloud API (${statusCode || 'network'}): ${metaError}`,
        provider: 'meta_cloud',
        dispatchedAt: new Date(),
      };
    }
  }

  private normalizeRecipientMobile(mobile: string): string {
    const cleaned = mobile.replace(/\D/g, '');
    if (cleaned.length === 10) return `91${cleaned}`;
    return cleaned;
  }
}

/**
 * Safe Sandbox / Mock Provider for local development, CI tests, and environments
 * where Meta production credentials are not yet provisioned.
 * Simulates real delivery, validates mobile number, logs safely, and returns realistic wamid IDs.
 */
export class MockWhatsAppProvider implements WhatsAppProvider {
  readonly providerName = 'mock' as const;
  private readonly logger = new Logger(MockWhatsAppProvider.name);

  // In-memory registry of dispatched messages for test inspection
  public sentMessages: Array<{ input: WhatsAppReminderMessageInput; result: WhatsAppMessageResult }> = [];
  public shouldSimulateFailure = false;
  public simulatedFailureMessage = 'Simulated telecom gateway timeout';

  async sendIncompleteSignupReminder(input: WhatsAppReminderMessageInput): Promise<WhatsAppMessageResult> {
    const templateName = input.templateName || 'techartha_incomplete_signup_reminder';
    const rawTo = input.to || (input as any).mobile || '';
    const cleanedMobile = rawTo.replace(/\D/g, '');

    // Validate phone number format
    if (cleanedMobile.length < 10) {
      const result: WhatsAppMessageResult = {
        success: false,
        status: 'FAILED',
        error: 'Invalid recipient phone number format. Must be at least 10 digits.',
        provider: 'mock',
        dispatchedAt: new Date(),
      };
      this.sentMessages.push({ input, result });
      return result;
    }

    if (this.shouldSimulateFailure) {
      const result: WhatsAppMessageResult = {
        success: false,
        status: 'FAILED',
        error: this.simulatedFailureMessage,
        provider: 'mock',
        dispatchedAt: new Date(),
      };
      this.sentMessages.push({ input, result });
      return result;
    }

    const messageId = `wamid.HBg${Date.now()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const result: WhatsAppMessageResult = {
      success: true,
      messageId,
      status: 'MOCK_SENT',
      provider: 'mock',
      dispatchedAt: new Date(),
    };

    this.logger.log(`[WhatsApp Sandbox] Simulated reminder delivered to masked number. Template: ${templateName}, MessageId: ${messageId}`);
    this.sentMessages.push({ input, result });
    return result;
  }

  clear() {
    this.sentMessages = [];
    this.shouldSimulateFailure = false;
  }
}
