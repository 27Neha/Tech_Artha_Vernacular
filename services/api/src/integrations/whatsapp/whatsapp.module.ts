import { Module, forwardRef } from '@nestjs/common';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { SupportModule } from '../../modules/support/support.module';

@Module({
  imports: [PrismaModule, forwardRef(() => SupportModule)],
  controllers: [WhatsappController],
  providers: [WhatsappService],
  exports: [WhatsappService],
})
export class WhatsappModule {}
