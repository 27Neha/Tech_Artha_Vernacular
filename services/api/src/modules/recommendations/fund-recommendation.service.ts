import { Injectable, Logger } from '@nestjs/common';
import { FundsService } from '../funds/funds.service';
import { FundDataQualityService, DataQualityStatus } from './fund-data-quality.service';
import { FundAnalyticsService } from './fund-analytics.service';
import { FundSuitabilityService, GoalContext } from './fund-suitability.service';
import { FundScoringService } from './fund-scoring.service';
import { FundRiskAlertService } from './fund-risk-alert.service';

@Injectable()
export class FundRecommendationService {
  private readonly logger = new Logger(FundRecommendationService.name);
  private recommendationCache = new Map<string, { expiresAt: number; data: any }>();

  constructor(
    private readonly fundsService: FundsService,
    private readonly dataQuality: FundDataQualityService,
    private readonly analytics: FundAnalyticsService,
    private readonly suitability: FundSuitabilityService,
    private readonly scoring: FundScoringService,
    private readonly riskAlert: FundRiskAlertService
  ) {}

  async getRecommendations(profile: string, goalContext: GoalContext): Promise<any> {
    const userProfile = profile.toUpperCase();
    const cacheKey = `${userProfile}-${goalContext.type}-${goalContext.horizonYears}`;
    const cached = this.recommendationCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }
    
    const diagnostics = {
      discovered: 0,
      validData: 0,
      stale: 0,
      navZero: 0,
      insufficientHistory: 0,
      riskExcluded: 0,
      horizonExcluded: 0,
      goalExcluded: 0,
      eligible: 0,
      finalRecommendations: 0,
      eligibleByCategory: {} as Record<string, number>,
      selectedByCategory: {} as Record<string, number>,
      sampleRejected: [] as any[]
    };

    // 1. Broad Discovery (Fetch up to ~150 candidates total)
    const queries =
      userProfile === 'CONSERVATIVE'
        ? ['Debt Direct Growth', 'Banking and PSU Direct Growth', 'Corporate Bond Direct Growth', 'Short Duration Direct Growth', 'Money Market Direct Growth', 'Liquid Direct Growth']
        : userProfile === 'MODERATE'
        ? ['Hybrid Direct Growth', 'Balanced Advantage Direct Growth', 'Multi Asset Direct Growth', 'Index Direct Growth', 'Large Cap Direct Growth']
        : ['Equity Direct Growth', 'Flexi Cap Direct Growth', 'Large Cap Direct Growth', 'Multi Cap Direct Growth', 'Mid Cap Direct Growth', 'Small Cap Direct Growth'];

    const candidates = [];
    const seen = new Set<number>();
    
    for (const q of queries) {
      if (candidates.length >= 30) break;
      const results = await this.fundsService.searchFunds(q);
      for (const fund of results) {
        if (!seen.has(fund.schemeCode)) {
          seen.add(fund.schemeCode);
          candidates.push(fund);
        }
        if (candidates.length >= 30) break; 
      }
    }

    diagnostics.discovered = candidates.length;
    this.logger.debug(`Discovery phase found ${candidates.length} unique candidates for ${profile}`);

    // 2. Fetch Details & Evaluate
    const evaluatedFunds: any[] = [];
    
    // Batch requests to prevent overwhelming MFAPI
    const batchSize = 10;
    for (let i = 0; i < candidates.length; i += batchSize) {
      console.log(`Processing batch ${i / batchSize + 1} of ${Math.ceil(candidates.length / batchSize)}...`);
      const batch = candidates.slice(i, i + batchSize);
      await Promise.all(batch.map(async (candidate) => {
      try {
        const details = await this.fundsService.getFundDetails(candidate.schemeCode);
        if (!details || !details.data) return;
        
        const meta = details.meta;
        const normalizedNavs = this.dataQuality.normalizeNavs(details.data);

        // HARD FILTER: Data Quality
        const quality = this.dataQuality.evaluate(normalizedNavs);
        const logRejection = (reason: string) => {
          if (diagnostics.sampleRejected.length < 5) {
            diagnostics.sampleRejected.push({
              schemeCode: candidate.schemeCode,
              schemeName: meta.scheme_name,
              rejectionReason: reason,
              latestNavDate: normalizedNavs[0].date,
              latestNav: normalizedNavs[0].nav,
              freshnessDays: quality.freshnessDays
            });
          }
        };

        if (quality.status === DataQualityStatus.NAV_ZERO) { diagnostics.navZero++; logRejection('NAV_ZERO'); return; }
        if (quality.status === DataQualityStatus.VALID_STALE) { diagnostics.stale++; logRejection('VALID_STALE'); return; }
        if (quality.status === DataQualityStatus.INSUFFICIENT_HISTORY) { diagnostics.insufficientHistory++; logRejection('INSUFFICIENT_HISTORY'); return; }
        if (quality.status !== DataQualityStatus.VALID_FRESH) { return; }
        diagnostics.validData++;

        const fundAnalytics = this.analytics.calculate(normalizedNavs);
        if (!fundAnalytics) return;

        // Add dynamically calculated dynamic reasons based on real metrics
        // We do this before suitability so suitability can append to them.
        if (fundAnalytics.cagr3Y) {
            // we will let suitability build the reasons array entirely for clean flow.
        }

        // HARD FILTER: Suitability
        const fundSuitability = this.suitability.evaluate(userProfile, goalContext, fundAnalytics, meta);
        if (fundSuitability.isHardExcluded) {
          let reason = 'RISK';
          if (fundSuitability.warnings.some(w => w.includes('short'))) { diagnostics.horizonExcluded++; reason = 'HORIZON'; }
          else if (fundSuitability.warnings.some(w => w.includes('Emergency'))) { diagnostics.goalExcluded++; reason = 'GOAL'; }
          else diagnostics.riskExcluded++;
          logRejection(reason);
          return; 
        }

        diagnostics.eligible++;

        // Add data-driven reasons
        if (fundAnalytics.cagr3Y) fundSuitability.reasons.push(`Historical 3Y CAGR is ${fundAnalytics.cagr3Y.toFixed(1)}%`);
        if (fundAnalytics.volatility) fundSuitability.reasons.push(`Annualized volatility is ${fundAnalytics.volatility.toFixed(1)}%`);
        if (fundAnalytics.maxDrawdown) fundSuitability.reasons.push(`Historical maximum drawdown observed was ${fundAnalytics.maxDrawdown.toFixed(1)}%`);

        const { totalScore, confidenceScore } = this.scoring.score(fundSuitability, quality, fundAnalytics);

        evaluatedFunds.push({
          fundId: candidate.schemeCode,
          schemeCode: candidate.schemeCode,
          fundName: meta.scheme_name,
          category: meta.scheme_category || 'Mutual Fund',
          normalizedCategory: fundSuitability.normalizedCategory,
          currentNav: normalizedNavs[0].nav,
          navDate: normalizedNavs[0].date,
          dataQuality: quality,
          analytics: fundAnalytics,
          suitability: fundSuitability,
          totalScore,
          confidenceScore,
          matchLevel: totalScore > 80 ? 'Strong Match' : 'Good Match',
          reasons: fundSuitability.reasons,
          warnings: fundSuitability.warnings,
          scoringVersion: this.scoring.SCORING_VERSION,
          calculatedAt: new Date().toISOString()
        });
      } catch (e) {
        // Ignore API failures for individual funds
      }
    }));
    }

    // 3. Cluster and Diversify by Strategy
    const clusters = new Map<string, any[]>();
    for (const fund of evaluatedFunds) {
      const cat = fund.normalizedCategory;
      diagnostics.eligibleByCategory[cat] = (diagnostics.eligibleByCategory[cat] || 0) + 1;
      
      if (!clusters.has(cat)) clusters.set(cat, []);
      clusters.get(cat)!.push(fund);
    }

    // Sort each cluster internally by total score
    for (const [cat, clusterFunds] of clusters.entries()) {
      clusterFunds.sort((a, b) => b.totalScore - a.totalScore);
    }

    // Build the final diversified set by picking top candidates across categories
    const finalSet = [];
    
    // Iteratively pick the #1 fund from each cluster, then the #2, etc., up to max 6 funds
    const sortedCategories = Array.from(clusters.keys()).sort((a, b) => clusters.get(b)![0].totalScore - clusters.get(a)![0].totalScore);
    
    for (const cat of sortedCategories) {
      const topFund = clusters.get(cat)![0];
      topFund.reasons.push(`Selected as the strongest representative in the ${cat.replace(/_/g, ' ')} category for diversification.`);
      finalSet.push(topFund);
      diagnostics.selectedByCategory[cat] = (diagnostics.selectedByCategory[cat] || 0) + 1;
      if (finalSet.length >= 6) break;
    }

    // If we still need more funds to hit a decent basket size (e.g. 4), take the #2s
    if (finalSet.length < 4) {
      for (const cat of sortedCategories) {
        if (clusters.get(cat)!.length > 1) {
          const secondFund = clusters.get(cat)![1];
          secondFund.reasons.push(`Included to broaden representation within the ${cat.replace(/_/g, ' ')} space.`);
          finalSet.push(secondFund);
          diagnostics.selectedByCategory[cat] = (diagnostics.selectedByCategory[cat] || 0) + 1;
          if (finalSet.length >= 4) break;
        }
      }
    }

    // Final sort of the diversified basket
    finalSet.sort((a, b) => b.totalScore - a.totalScore);

    diagnostics.finalRecommendations = finalSet.length;
    this.logger.debug(`Recommendation Diagnostics: ${JSON.stringify(diagnostics)}`);

    evaluatedFunds.sort((a, b) => b.totalScore - a.totalScore);
    const finalResult = {
      diagnostics,
      funds: finalSet,
      _allEvaluatedFunds: evaluatedFunds
    };
    this.recommendationCache.set(cacheKey, { expiresAt: Date.now() + 6 * 60 * 60 * 1000, data: finalResult });
    return finalResult;
  }

  async evaluateAddedFund(schemeCode: string | number, profile: string, goalContext: GoalContext) {
    const details = await this.fundsService.getFundDetails(schemeCode);
    if (!details || !details.data) throw new Error("Fund data unavailable");

    const normalizedNavs = this.dataQuality.normalizeNavs(details.data);
    const quality = this.dataQuality.evaluate(normalizedNavs);
    const fundAnalytics = this.analytics.calculate(normalizedNavs) || ({} as any);
    const fundSuitability = this.suitability.evaluate(profile.toUpperCase(), goalContext, fundAnalytics, details.meta);
    const alert = this.riskAlert.evaluateRiskMismatch(profile.toUpperCase(), fundSuitability.riskSignal);

    return {
      fundId: schemeCode,
      schemeCode,
      fundName: details.meta.scheme_name,
      category: details.meta.scheme_category || 'Mutual Fund',
      dataQuality: quality,
      analytics: fundAnalytics,
      suitability: fundSuitability,
      riskSignal: fundSuitability.riskSignal,
      riskAlert: alert,
      warnings: fundSuitability.warnings,
      currentNav: normalizedNavs.length > 0 ? normalizedNavs[0].nav : null
    };
  }
}
