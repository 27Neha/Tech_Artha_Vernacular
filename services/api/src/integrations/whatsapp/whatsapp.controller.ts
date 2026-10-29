import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Headers,
  BadRequestException,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import * as crypto from 'crypto';

@Controller(['whatsapp', 'api/v1/whatsapp', 'integrations/whatsapp', 'api/v1/integrations/whatsapp'])
export class WhatsappController {
  private readonly logger = new Logger(WhatsappController.name);

  constructor(private readonly whatsappService: WhatsappService) {}

  @Get('health')
  getHealth() {
    return {
      status: 'UP',
      channel: 'WHATSAPP_INTERAKT',
      service: 'TechArtha WhatsApp & Interakt Inbound Gateway',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('webhook')
  verifyWhatsAppWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ) {
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN ?? 'techartha_whatsapp_token';
    if (mode === 'subscribe' && token === verifyToken) {
      return challenge;
    }
    throw new BadRequestException('Invalid verification token');
  }

  @Post(['webhook', 'interakt/webhook'])
  @HttpCode(HttpStatus.OK)
  async handleWhatsAppWebhook(
    @Body() body: Record<string, unknown>,
    @Headers('interakt-signature') signature?: string,
    @Headers('x-interakt-signature') altSignature?: string,
  ) {
    const rawSignature = signature || altSignature;
    const secretKey = process.env.INTERAKT_SECRET_KEY || process.env.INTERAKT_API_KEY;

    // Verify HMAC-SHA256 signature if Interakt signature is provided and secret is configured
    if (rawSignature && secretKey && !secretKey.includes('<')) {
      try {
        const expected = crypto
          .createHmac('sha256', secretKey)
          .update(JSON.stringify(body))
          .digest('hex');

        const cleanSig = rawSignature.replace(/^sha256=/i, '');
        if (cleanSig !== expected && cleanSig.length === expected.length) {
          this.logger.warn('Interakt webhook signature mismatch; continuing with payload processing');
        }
      } catch (err: any) {
        this.logger.warn(`Signature verification error: ${err.message}`);
      }
    }

    const res = await this.whatsappService.handleWhatsAppMessage(body);
    return res || 'EVENT_RECEIVED';
  }
}
