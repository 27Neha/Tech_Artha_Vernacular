import { Module } from '@nestjs/common';
import { RiskController } from './risk.controller';
import { RiskService } from './risk.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { ConsentModule } from '../consent/consent.module';

@Module({
  imports: [PrismaModule, AuthModule, ConsentModule],
  controllers: [RiskController],
  providers: [RiskService],
})
export class RiskModule {}
