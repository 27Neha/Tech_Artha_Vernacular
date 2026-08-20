import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { BucketsController } from './buckets.controller';
import { BucketsService } from './buckets.service';
import { RecommendationsModule } from '../recommendations/recommendations.module';
import { FundsModule } from '../funds/funds.module';

@Module({ 
  imports: [AuthModule, PrismaModule, RecommendationsModule, FundsModule], 
  controllers: [BucketsController], 
  providers: [BucketsService], 
  exports: [BucketsService] 
})
export class BucketsModule {}
