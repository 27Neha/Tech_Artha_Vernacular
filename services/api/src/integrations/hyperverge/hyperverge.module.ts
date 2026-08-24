import { Module } from '@nestjs/common';
import { HypervergeService } from './hyperverge.service';
import { WebhookController } from './webhook/webhook.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [HypervergeService],
  controllers: [WebhookController],
  exports: [HypervergeService]
})
export class HypervergeModule {}
