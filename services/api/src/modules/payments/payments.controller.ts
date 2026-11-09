import { Controller, Get, Post, Param, Body, HttpCode } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { getFeatureFlags } from '../../common/feature-flags';

@Controller()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get(['mandates/:id/status', 'api/v1/mandates/:id/status'])
  async getMandateStatus(@Param('id') id: string) {
    return this.paymentsService.getMandateStatus(id);
  }

  @Get(['payments/:id/status', 'api/v1/payments/:id/status'])
  async getPaymentStatus(@Param('id') id: string) {
    return this.paymentsService.getPaymentStatus(id);
  }

  @Post(['webhooks/cybrilla/mandate', 'api/webhooks/cybrilla/mandate'])
  @HttpCode(200)
  async handleMandateWebhook(@Body() payload: any) {
    return this.paymentsService.handleMandateWebhook(payload);
  }

  @Post(['webhooks/cybrilla/payment', 'api/webhooks/cybrilla/payment'])
  @HttpCode(200)
  async handlePaymentWebhook(@Body() payload: any) {
    return this.paymentsService.handlePaymentWebhook(payload);
  }

  @Get(['config/feature-flags', 'api/v1/config/feature-flags'])
  getFeatureFlags() {
    return getFeatureFlags();
  }
}
