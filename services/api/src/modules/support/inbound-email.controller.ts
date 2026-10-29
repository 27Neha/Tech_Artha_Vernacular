import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { InboundEmailService } from './inbound-email.service';

@Controller(['support/email', 'api/v1/support/email', 'email', 'api/v1/email'])
export class InboundEmailController {
  private readonly logger = new Logger(InboundEmailController.name);

  constructor(private readonly inboundEmailService: InboundEmailService) {}

  @Get('health')
  getHealth() {
    return {
      status: 'UP',
      channel: 'EMAIL_INBOUND',
      service: 'TechArtha Inbound Support Email Webhook',
      timestamp: new Date().toISOString(),
    };
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleInboundEmailWebhook(
    @Body() body: Record<string, any>,
    @Headers('x-inbound-secret') headerSecret?: string,
    @Headers('x-webhook-secret') altSecret?: string,
    @Headers('authorization') authHeader?: string,
  ) {
    const configuredSecret = process.env.INBOUND_EMAIL_WEBHOOK_SECRET;

    // Verify webhook secret if configured in environment
    if (configuredSecret && configuredSecret !== '<secret-key>' && !configuredSecret.includes('<')) {
      const incomingSecret =
        headerSecret ||
        altSecret ||
        (authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader) ||
        body?.secretToken;

      if (!incomingSecret || incomingSecret !== configuredSecret) {
        this.logger.warn('Inbound email webhook rejected: invalid or missing secret token');
        throw new UnauthorizedException('Invalid inbound email webhook secret');
      }
    }

    this.logger.log(`Received Inbound Email Webhook event: from="${body?.from || body?.fromEmail || body?.From}"`);
    return this.inboundEmailService.handleInboundEmail(body);
  }
}
