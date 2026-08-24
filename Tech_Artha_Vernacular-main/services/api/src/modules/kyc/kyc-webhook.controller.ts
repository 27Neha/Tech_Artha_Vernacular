import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { KycService } from './kyc.service';

@Controller('api/v1/webhooks/hyperverge')
export class KycWebhookController {
  constructor(private readonly kycService: KycService) {}

  @Post()
  @HttpCode(200)
  async handleWebhook(@Body() payload: any) {
    await this.kycService.handleHypervergeWebhook(payload);
    return { received: true };
  }
}
