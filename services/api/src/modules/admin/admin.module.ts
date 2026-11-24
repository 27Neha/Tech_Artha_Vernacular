import { Module, forwardRef } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminGuard } from './admin.guard';
import { AdminBootstrapService } from './admin-bootstrap.service';
import { AdminInvitationEmailService } from './admin-invitation-email.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { SupportModule } from '../support/support.module';
import { WhatsappModule } from '../../integrations/whatsapp/whatsapp.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => SupportModule),
    forwardRef(() => WhatsappModule),
    JwtModule.register({
      global: false,
      secret: process.env.JWT_SECRET ?? 'development-only-change-me',
      signOptions: { expiresIn: '8h' },
    }),
  ],
  controllers: [AdminController],
  providers: [
    AdminService,
    AdminGuard,
    AdminBootstrapService,
    AdminInvitationEmailService,
  ],
  exports: [AdminService, AdminGuard, AdminInvitationEmailService],
})
export class AdminModule {}
