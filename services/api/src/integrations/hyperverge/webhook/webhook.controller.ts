import { Controller, Post, Body, Headers, HttpCode } from '@nestjs/common';
import { HypervergeService } from '../hyperverge.service';

@Controller('webhooks/hyperverge')
export class WebhookController {
  constructor(private readonly hypervergeService: HypervergeService) {}

  @Post()
  @HttpCode(200)
  async handleWebhook(
    @Body() payload: any,
    @Headers('x-hyperverge-signature') signature: string
  ) {
    // HyperVerge expects a 200 OK fast to acknowledge receipt.
    // In production, we might queue this for processing.
    await this.hypervergeService.processWebhook(payload, signature || '');
    return { received: true };
  }
}
