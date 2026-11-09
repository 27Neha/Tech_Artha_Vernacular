import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { FundRecommendationService } from './src/modules/recommendations/fund-recommendation.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const service = app.get(FundRecommendationService);
  
  console.log('Running Recommendation Engine...');
  const result = await service.getRecommendations('CONSERVATIVE', { type: 'WEALTH_CREATION', horizonYears: 5 });
  
  console.log('\n=== DIAGNOSTICS ===');
  console.log(`1. Total discovered candidates: ${result.diagnostics.discovered}`);
  console.log(`2. Valid current-data candidates: ${result.diagnostics.validData}`);
  console.log(`3. NAV_ZERO: ${result.diagnostics.navZero}`);
  console.log(`4. Stale: ${result.diagnostics.stale}`);
  console.log(`5. Insufficient history: ${result.diagnostics.insufficientHistory}`);
  console.log(`6. Risk excluded: ${result.diagnostics.riskExcluded}`);
  console.log(`7. Goal excluded: ${result.diagnostics.goalExcluded}`);
  console.log(`8. Horizon excluded: ${result.diagnostics.horizonExcluded}`);
  console.log(`9. Final eligible candidates: ${result.diagnostics.eligible}`);
  
  console.log('\n=== TOP 10 ELIGIBLE CANDIDATES BEFORE SLICING ===');
  const top10 = (result as any)._allEvaluatedFunds.slice(0, 10);
  
  top10.forEach((fund: any, idx: number) => {
    console.log(`\n--- Candidate #${idx + 1} ---`);
    console.log(`Scheme Code: ${fund.schemeCode}`);
    console.log(`Scheme Name: ${fund.fundName}`);
    console.log(`Category (Raw): ${fund.category}`);
    console.log(`Normalized Category: ${fund.normalizedCategory}`);
    console.log(`Current NAV: ${fund.currentNav}`);
    console.log(`NAV Date: ${fund.navDate}`);
    console.log(`Freshness Days: ${fund.dataQuality.freshnessDays.toFixed(1)}`);
    console.log(`History Years: ${fund.dataQuality.historyYears.toFixed(1)}`);
    console.log(`1Y Return: ${fund.analytics.return1Y !== null ? fund.analytics.return1Y.toFixed(2) + '%' : 'N/A'}`);
    console.log(`3Y CAGR: ${fund.analytics.cagr3Y !== null ? fund.analytics.cagr3Y.toFixed(2) + '%' : 'N/A'}`);
    console.log(`5Y CAGR: ${fund.analytics.cagr5Y !== null ? fund.analytics.cagr5Y.toFixed(2) + '%' : 'N/A'}`);
    console.log(`Volatility: ${fund.analytics.volatility !== null ? fund.analytics.volatility.toFixed(2) + '%' : 'N/A'}`);
    console.log(`Max Drawdown: ${fund.analytics.maxDrawdown !== null ? fund.analytics.maxDrawdown.toFixed(2) + '%' : 'N/A'}`);
    console.log(`Consistency (Pos Months): ${fund.analytics.consistency !== null ? fund.analytics.consistency.toFixed(2) + '%' : 'N/A'}`);
    
    // Reverse engineer scoring if not explicitly stored, wait, the scoring service returned totalScore and confidenceScore.
    // The individual component scores were evaluated inside the method but not stored on the fund object directly!
    console.log(`Risk Suitability Score: ${fund.suitability.riskScore}`);
    console.log(`Goal Suitability Score: ${fund.suitability.goalScore}`);
    console.log(`Horizon Suitability Score: ${fund.suitability.horizonScore}`);
    console.log(`Category Score: ${fund.suitability.categoryScore}`);
    console.log(`Total Score: ${fund.totalScore}`);
    console.log(`Confidence Score: ${fund.confidenceScore}`);
    console.log(`Reasons: ${JSON.stringify(fund.reasons)}`);
    console.log(`Warnings: ${JSON.stringify(fund.warnings)}`);
  });
  
  await app.close();
  process.exit(0);
}

bootstrap().catch(console.error);
