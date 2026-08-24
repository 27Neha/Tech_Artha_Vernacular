import { Controller, Get, Post, Body, Query, BadRequestException, HttpCode } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';

@Controller('whatsapp')
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @Get('webhook')
  verifyWhatsAppWebhook(@Query('hub.mode') mode: string, @Query('hub.verify_token') token: string, @Query('hub.challenge') challenge: string) {
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN ?? 'techartha_whatsapp_token';
    if (mode === 'subscribe' && token === verifyToken) {
      return challenge;
    }
    throw new BadRequestException('Invalid verification token');
  }

  @Post('webhook')
  @HttpCode(200)
  async handleWhatsAppWebhook(@Body() body: Record<string, unknown>) {
    await this.whatsappService.handleWhatsAppMessage(body);
    return 'EVENT_RECEIVED';
  }
}
