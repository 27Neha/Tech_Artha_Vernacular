import { Module } from '@nestjs/common';
import { KycController } from './kyc.controller';
import { KycService } from './kyc.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { KycWebhookController } from './kyc-webhook.controller';

@Module({
  imports: [PrismaModule],
  controllers: [KycController, KycWebhookController],
  providers: [KycService],
  exports: [KycService],
})
export class KycModule {}
