import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { WhatsappModule } from '../../integrations/whatsapp/whatsapp.module';
import { SignupReminderService } from './signup-reminder.service';
import { SignupReminderScheduler } from './signup-reminder.scheduler';
import { ReminderController } from './reminder.controller';

@Module({
  imports: [PrismaModule, WhatsappModule],
  controllers: [ReminderController],
  providers: [SignupReminderService, SignupReminderScheduler],
  exports: [SignupReminderService, SignupReminderScheduler],
})
export class ReminderModule {}
