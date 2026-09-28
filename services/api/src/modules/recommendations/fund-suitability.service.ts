import { Injectable } from '@nestjs/common';
import { FundCategoryService, NormalizedCategory } from './fund-category.service';
import { FundAnalytics } from './fund-analytics.service';

export interface GoalContext {
  type: string; 
  horizonYears: number;
}

export enum RiskSignal {
  LOW = 'LOW',
  LOW_TO_MODERATE = 'LOW_TO_MODERATE',
  MODERATE = 'MODERATE',
  HIGH = 'HIGH',
  VERY_HIGH = 'VERY_HIGH'
}

@Injectable()
export class FundSuitabilityService {
  constructor(private readonly categoryService: FundCategoryService) {}

  evaluate(userProfile: string, goalContext: GoalContext, analytics: FundAnalytics, meta: any) {
    const reasons: string[] = [];
    const warnings: string[] = [];
    let isHardExcluded = false;

    const normalizedCategory = this.categoryService.normalize(meta?.scheme_name || '', meta?.scheme_category || '');

    // 1. Determine Quantitative Risk Signal
    let riskSignal = RiskSignal.MODERATE;
    if (analytics.volatility !== null) {
      if (analytics.volatility > 20) riskSignal = RiskSignal.VERY_HIGH;
      else if (analytics.volatility > 15) riskSignal = RiskSignal.HIGH;
      else if (analytics.volatility > 10) riskSignal = RiskSignal.MODERATE;
      else if (analytics.volatility > 4) riskSignal = RiskSignal.LOW_TO_MODERATE;
      else riskSignal = RiskSignal.LOW;
    } else {
      // Fallback to category risk
      if ([NormalizedCategory.EQUITY_SMALL_CAP, NormalizedCategory.EQUITY_MID_CAP, NormalizedCategory.EQUITY_MULTI_CAP].includes(normalizedCategory)) riskSignal = RiskSignal.VERY_HIGH;
      else if ([NormalizedCategory.EQUITY_LARGE_CAP, NormalizedCategory.EQUITY_FLEXI_CAP, NormalizedCategory.EQUITY_ELSS, NormalizedCategory.INDEX].includes(normalizedCategory)) riskSignal = RiskSignal.HIGH;
      else if ([NormalizedCategory.HYBRID_BALANCED, NormalizedCategory.HYBRID_AGGRESSIVE].includes(normalizedCategory)) riskSignal = RiskSignal.MODERATE;
      else riskSignal = RiskSignal.LOW;
    }

    // 2. Risk Suitability Score (Continuous)
    let riskScore = 0;
    if (userProfile === 'CONSERVATIVE') {
      if (riskSignal === RiskSignal.HIGH || riskSignal === RiskSignal.VERY_HIGH) {
        isHardExcluded = true;
        warnings.push('Fund quantitative risk is too high for a conservative profile.');
      } else if (riskSignal === RiskSignal.LOW) {
        riskScore = 100;
        reasons.push('Risk metrics are perfectly aligned with your conservative profile.');
      } else {
        riskScore = 80;
        reasons.push('Acceptable risk for a conservative investor with moderate growth.');
      }
    } else if (userProfile === 'MODERATE') {
      if (riskSignal === RiskSignal.VERY_HIGH) {
        riskScore = 40;
        warnings.push('Fund has very high historical volatility, exceeding typical moderate thresholds.');
      } else if (riskSignal === RiskSignal.MODERATE) {
        riskScore = 100;
        reasons.push('Risk metrics exactly match a moderate growth approach.');
      } else if (riskSignal === RiskSignal.HIGH) {
        riskScore = 80;
        reasons.push('Slightly higher risk, but generally acceptable for a moderate investor.');
      } else {
        riskScore = 75; // LOW
        reasons.push('Lower risk than typical for moderate profile, offering capital preservation.');
      }
    } else {
      // Aggressive
      if (riskSignal === RiskSignal.VERY_HIGH || riskSignal === RiskSignal.HIGH) {
        riskScore = 100;
        reasons.push('Excellent alignment with your aggressive risk tolerance.');
      } else if (riskSignal === RiskSignal.MODERATE) {
        riskScore = 80;
      } else {
        riskScore = 60;
        warnings.push('May be too conservative for an aggressive growth strategy.');
      }
    }

    // 3. Strategy Fit Score
    // Evaluates whether this specific asset class logically fits the objective
    let strategyFitScore = 100;
    if (goalContext.type.toUpperCase() === 'EMERGENCY') {
      if (normalizedCategory === NormalizedCategory.DEBT_LIQUID || normalizedCategory === NormalizedCategory.DEBT_SHORT_DURATION) {
        strategyFitScore = 100;
        reasons.push('Ideal strategy (Liquid/Short Duration) for emergency access.');
      } else {
        strategyFitScore = 60;
        warnings.push('Not the ideal strategy for emergency liquidity.');
      }
    } else if (goalContext.type.toUpperCase() === 'WEALTH_CREATION' || goalContext.type.toUpperCase() === 'RETIREMENT') {
      if (goalContext.horizonYears >= 5) {
        if (normalizedCategory === NormalizedCategory.DEBT_LIQUID) {
          strategyFitScore = 65; // Safe but loses to inflation
          warnings.push('Money market strategies may struggle to beat inflation over long horizons.');
        } else if (normalizedCategory === NormalizedCategory.HYBRID_CONSERVATIVE || normalizedCategory === NormalizedCategory.DEBT_CORPORATE) {
          strategyFitScore = 95;
          reasons.push('Strategy balances growth with preservation over your horizon.');
        } else {
          strategyFitScore = 85;
        }
      } else {
        // Short horizon wealth creation
        if (riskSignal === RiskSignal.HIGH) strategyFitScore = 50;
        else strategyFitScore = 85;
      }
    }

    // 4. Horizon Suitability Score (Continuous)
    let horizonScore = 0;
    if (goalContext.horizonYears < 3) {
      if (riskSignal === RiskSignal.HIGH || riskSignal === RiskSignal.VERY_HIGH) {
        isHardExcluded = true;
        warnings.push(`Highly volatile fund is completely unsuitable for a short ${goalContext.horizonYears}-year horizon.`);
      } else if (riskSignal === RiskSignal.LOW) {
        horizonScore = 100;
      } else {
        horizonScore = 75;
      }
    } else if (goalContext.horizonYears >= 7) {
      if (riskSignal === RiskSignal.LOW) {
        horizonScore = 60; // Penalty for low growth on long horizon
        warnings.push('May underperform inflation over your long-term horizon.');
      } else {
        horizonScore = 100;
        reasons.push(`Fund volatility and category are compatible with your ${goalContext.horizonYears}-year horizon.`);
      }
    } else {
      // 3-6 years
      if (riskSignal === RiskSignal.MODERATE || riskSignal === RiskSignal.LOW_TO_MODERATE) horizonScore = 100;
      else if (riskSignal === RiskSignal.LOW) horizonScore = 85;
      else horizonScore = 70;
    }

    // 5. Goal Suitability Score (Calculated from actual intent)
    let goalScore = 0;
    const type = goalContext.type.toUpperCase();
    if (type === 'EMERGENCY') {
      if (riskSignal !== RiskSignal.LOW) {
         isHardExcluded = true;
         warnings.push('Emergency funds require capital protection. This fund is too volatile.');
      } else {
         goalScore = 100;
      }
    } else if (type === 'EDUCATION' || type === 'RETIREMENT' || type === 'WEALTH_CREATION') {
      if (riskSignal === RiskSignal.LOW && goalContext.horizonYears > 5) {
         goalScore = 65; 
      } else if (riskSignal === RiskSignal.HIGH && goalContext.horizonYears < 5) {
         goalScore = 50;
      } else {
         goalScore = 95;
      }
    } else {
      goalScore = 85; // Custom generic goal
    }

    // 6. Category Score based on overall appropriateness
    let categoryScore = 100;
    if (normalizedCategory === NormalizedCategory.UNKNOWN) {
      categoryScore = 60;
      warnings.push('Unrecognized fund category limits suitability confidence.');
    } else if (normalizedCategory === NormalizedCategory.DEBT_OTHER) {
      categoryScore = 80;
    }

    return {
      riskScore,
      goalScore,
      horizonScore,
      categoryScore,
      strategyFitScore,
      isHardExcluded,
      reasons,
      warnings,
      riskSignal,
      normalizedCategory
    };
  }
}
