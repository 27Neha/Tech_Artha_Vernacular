import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { FundRecommendationService } from './src/modules/recommendations/fund-recommendation.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const service = app.get(FundRecommendationService);
  
  console.log('Running Recommendation Engine (V2 - Continuous Scoring)...');
  const result = await service.getRecommendations('CONSERVATIVE', { type: 'WEALTH_CREATION', horizonYears: 5 });
  
  console.log('\n=== DIAGNOSTICS ===');
  console.log('Eligible By Category:', result.diagnostics.eligibleByCategory);
  console.log('Selected By Category:', result.diagnostics.selectedByCategory);
  
  console.log('\n=== TOP 10 ELIGIBLE CANDIDATES (BEFORE CLUSTERING) ===');
  const top10 = (result as any)._allEvaluatedFunds.slice(0, 10);
  
  top10.forEach((fund: any, idx: number) => {
    console.log(`\n--- Candidate #${idx + 1} ---`);
    console.log('Scheme Name:', fund.fundName);
    console.log('Normalized Strategy:', fund.normalizedCategory);
    console.log('Total Score:', fund.totalScore);
    console.log('Risk/Goal/Horizon/Strategy:', fund.suitability.riskScore, '/', fund.suitability.goalScore, '/', fund.suitability.horizonScore, '/', fund.strategyFitScore);
    console.log('Cons/Perf/RiskAdj/Data:', fund.consistencyScore, '/', fund.historicalPerformanceScore, '/', fund.riskAdjustedScore, '/', fund.dataQualityScore);
    console.log('Reasons:', fund.reasons);
  });

  console.log('\n=== FINAL SELECTED CANDIDATES ===');
  result.funds.forEach((fund: any, idx: number) => {
    console.log(`\n--- Final Pick #${idx + 1} ---`);
    console.log('Scheme Name:', fund.fundName, '[', fund.normalizedCategory, ']');
    console.log('Reasons:', fund.reasons);
  });
  
  await app.close();
  process.exit(0);
}

bootstrap().catch(console.error);
