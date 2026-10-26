import { Module } from '@nestjs/common';
import { TwoFactorModule } from '../twofactor/twofactor.module';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { BucketsController } from './buckets.controller';
import { FundInvestController } from './fund-invest.controller';
import { BucketsService } from './buckets.service';
import { RecommendationsModule } from '../recommendations/recommendations.module';
import { FundsModule } from '../funds/funds.module';
import { CybrillaModule } from '../cybrilla/cybrilla.module';

@Module({
  imports: [TwoFactorModule, AuthModule, PrismaModule, RecommendationsModule, FundsModule, CybrillaModule],
  controllers: [BucketsController, FundInvestController], 
  providers: [BucketsService], 
  exports: [BucketsService] 
})
export class BucketsModule {}
