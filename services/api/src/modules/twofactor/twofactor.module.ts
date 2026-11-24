import { Module } from '@nestjs/common';
import { TwoFactorController } from './twofactor.controller';
import { TwoFactorService } from './twofactor.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { InteraktModule } from '../../integrations/interakt/interakt.module';

@Module({
  imports: [PrismaModule, AuthModule, InteraktModule],
  controllers: [TwoFactorController],
  providers: [TwoFactorService],
  exports: [TwoFactorService],
})
export class TwoFactorModule {}
