import { Module } from '@nestjs/common';
import { RecommendationEngine } from './recommendation.engine';
import { FundsModule } from '../funds/funds.module';

@Module({
  imports: [FundsModule],
  providers: [RecommendationEngine],
  exports: [RecommendationEngine],
})
export class RecommendationsModule {}
