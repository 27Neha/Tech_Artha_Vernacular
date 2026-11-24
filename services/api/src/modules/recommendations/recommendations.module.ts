import { Module } from '@nestjs/common';
import { FundDataQualityService } from './fund-data-quality.service';
import { FundAnalyticsService } from './fund-analytics.service';
import { FundCategoryService } from './fund-category.service';
import { FundSuitabilityService } from './fund-suitability.service';
import { FundScoringService } from './fund-scoring.service';
import { FundRiskAlertService } from './fund-risk-alert.service';
import { FundRecommendationService } from './fund-recommendation.service';
import { RecommendationEngine } from './recommendation.engine';
import { FundsModule } from '../funds/funds.module';

@Module({
  imports: [FundsModule],
  providers: [
    FundDataQualityService,
    FundAnalyticsService,
    FundCategoryService,
    FundSuitabilityService,
    FundScoringService,
    FundRiskAlertService,
    FundRecommendationService,
    RecommendationEngine
  ],
  exports: [FundRecommendationService, RecommendationEngine]
})
export class RecommendationsModule {}
