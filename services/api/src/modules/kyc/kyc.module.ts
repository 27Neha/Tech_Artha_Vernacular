import { Module } from '@nestjs/common';
import { KycController } from './kyc.controller';
import { KycService } from './kyc.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { HypervergeModule } from '../../integrations/hyperverge/hyperverge.module';
import { AuthModule } from '../auth/auth.module';
import { ConsentModule } from '../consent/consent.module';

@Module({
  imports: [PrismaModule, HypervergeModule, AuthModule, ConsentModule],
  controllers: [KycController],
  providers: [KycService]
})
export class KycModule {}
