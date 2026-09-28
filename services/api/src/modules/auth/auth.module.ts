import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { AccessTokenGuard } from '../../common/auth';
import { InteraktModule } from '../../integrations/interakt/interakt.module';
import { MtalkzModule } from '../mtalkz/mtalkz.module';
import { ZohoModule } from '../zoho/zoho.module';

@Module({
  imports: [
    PrismaModule,
    InteraktModule,
    MtalkzModule,
    ZohoModule,
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET ?? 'development-only-change-me',
      signOptions: { expiresIn: (process.env.JWT_EXPIRES_IN ?? '15m') as any },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AccessTokenGuard],
  exports: [AuthService, AccessTokenGuard],
})
export class AuthModule {}
