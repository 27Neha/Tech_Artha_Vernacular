import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  async handleWhatsAppMessage(payload: Record<string, unknown>) {
    const entry = Array.isArray(payload.entry) ? payload.entry[0] as Record<string, unknown> : undefined;
    const changes = entry && Array.isArray(entry.changes) ? entry.changes[0] as Record<string, unknown> : undefined;
    const value = changes?.value as Record<string, unknown> | undefined;
    const messages = value && Array.isArray(value.messages) ? value.messages : [];
    if (!messages.length) return { accepted: true, processed: false };

    // Do not log message text, phone numbers, portfolio data or fabricated status.
    this.logger.log('Received a WhatsApp message event. Stateful conversation processing is not configured.');
    return { accepted: true, processed: false, status: 'NOT_CONFIGURED — WHATSAPP BUSINESS ACCESS REQUIRED', message: 'No customer data was read or replied to because the authorised WhatsApp provider flow is not configured.' };
  }
}
