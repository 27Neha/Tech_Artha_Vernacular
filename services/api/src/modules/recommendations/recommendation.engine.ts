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

  async getRecommendations(params: RecommendationParams): Promise<number[]> {
    const { riskProfile } = params;
    const profile = riskProfile.toUpperCase();

    let query = 'Equity';
    if (profile === 'CONSERVATIVE') {
      query = 'Debt';
    } else if (profile === 'MODERATE') {
      query = 'Hybrid';
    }

    const funds = await this.fundsService.searchFunds(query);
    return funds.slice(0, 4).map(f => f.schemeCode);
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
