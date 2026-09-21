import { Injectable } from '@nestjs/common';
import { FundsService } from '../funds/funds.service';

export type RecommendationParams = {
  riskProfile: string;
  horizon: string;
  goal?: string;
};

@Injectable()
export class RecommendationEngine {
  constructor(private readonly fundsService: FundsService) {}

  async getRecommendations(params: RecommendationParams, candidatePoolSize = 40): Promise<number[]> {
    const { riskProfile } = params;
    const profile = riskProfile.toUpperCase();

    // MFAPI's search is a plain substring match on scheme names, not a category search - a single
    // term like "Debt" only catches funds with that literal word in their name (most debt funds are
    // named "Bond Fund"/"Income Fund"/"Banking & PSU Fund"/etc.), and returns very few results overall.
    // Query several relevant terms per profile and merge/dedupe to get a real candidate pool.
    const queries =
      profile === 'CONSERVATIVE'
        ? ['Debt', 'Banking and PSU', 'Corporate Bond', 'Short Duration', 'Money Market']
        : profile === 'MODERATE'
        ? ['Hybrid', 'Balanced Advantage', 'Multi Asset']
        : ['Equity', 'Flexi Cap', 'Large Cap', 'Multi Cap'];

    const resultSets = await Promise.all(queries.map((q) => this.fundsService.searchFunds(q)));
    const seen = new Set<number>();
    const merged: number[] = [];
    for (const results of resultSets) {
      for (const fund of results) {
        if (!seen.has(fund.schemeCode)) {
          seen.add(fund.schemeCode);
          merged.push(fund.schemeCode);
        }
        if (merged.length >= candidatePoolSize) break;
      }
      if (merged.length >= candidatePoolSize) break;
    }

    return merged.slice(0, candidatePoolSize);
  }

  isRiskMismatch(userProfile: string, fundCategory: string): boolean {
    const profile = userProfile.toUpperCase();
    const category = fundCategory.toUpperCase();
    
    if (profile === 'CONSERVATIVE') {
      return category.includes('EQUITY') || category.includes('HYBRID') || category.includes('SMALL CAP');
    }
    
    if (profile === 'MODERATE') {
      return category.includes('SMALL CAP') || category.includes('EQUITY');
    }

    return false;
  }
}
