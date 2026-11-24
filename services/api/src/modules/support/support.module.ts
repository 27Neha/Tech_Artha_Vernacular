import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';
import { SupportEmailService } from './email.service';
import { FreshdeskService } from './freshdesk.service';
import { FreshdeskController } from './freshdesk.controller';
import { WhatsappModule } from '../../integrations/whatsapp/whatsapp.module';

import { InboundEmailController } from './inbound-email.controller';
import { InboundEmailService } from './inbound-email.service';

@Module({
  imports: [PrismaModule, forwardRef(() => WhatsappModule)],
  controllers: [SupportController, FreshdeskController, InboundEmailController],
  providers: [SupportService, SupportEmailService, FreshdeskService, InboundEmailService],
  exports: [SupportService, SupportEmailService, FreshdeskService, InboundEmailService],
})
export class SupportModule {}
