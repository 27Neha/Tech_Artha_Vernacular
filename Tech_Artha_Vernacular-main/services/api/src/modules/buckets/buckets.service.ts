import { BadRequestException, Injectable } from '@nestjs/common';
import { RecommendationEngine } from '../recommendations/recommendation.engine';
import { FundsService } from '../funds/funds.service';

export type Bucket = { id: string; name: string; eligibleFor: string[]; allocation: { equity: number; debt: number; liquid: number }; horizon: string; explanation: string };

const BUCKETS: Bucket[] = [
  { id: 'stable', name: 'Stable foundation', eligibleFor: ['CONSERVATIVE', 'MODERATE'], allocation: { equity: 20, debt: 55, liquid: 25 }, horizon: '1–3 years', explanation: 'Designed to prioritise stability and access. It can still move in value.' },
  { id: 'balanced', name: 'Balanced growth', eligibleFor: ['MODERATE', 'AGGRESSIVE'], allocation: { equity: 55, debt: 35, liquid: 10 }, horizon: '3–7 years', explanation: 'Balances long-term growth potential with stabilising assets.' },
  { id: 'growth', name: 'Long-term growth', eligibleFor: ['AGGRESSIVE'], allocation: { equity: 75, debt: 20, liquid: 5 }, horizon: '7+ years', explanation: 'Built for a long horizon and the ability to accept larger temporary falls.' },
];

@Injectable()
export class BucketsService {
  constructor(
    private readonly recommendationEngine: RecommendationEngine,
    private readonly fundsService: FundsService,
  ) {}

  async listForProfile(category: string) {
    const filteredBuckets = BUCKETS.filter((bucket) => bucket.eligibleFor.includes(category)).map((bucket) => ({ ...bucket, recommended: bucket.eligibleFor[0] === category || bucket.eligibleFor[1] === category, riskMeter: 'SCHEME_RISK_METER_REQUIRED' }));
    
    // For each bucket, we can fetch recommendations and fund details
    const result = await Promise.all(filteredBuckets.map(async (bucket) => {
      const schemeCodes = await this.recommendationEngine.getRecommendations({
        riskProfile: bucket.eligibleFor[0],
        horizon: bucket.horizon,
      });

      const funds = await Promise.all(schemeCodes.map(async (code) => {
        try {
          const details = await this.fundsService.getFundDetails(code);
          const nav = await this.fundsService.getLatestNAV(code);
          return {
            schemeCode: code,
            name: details.meta?.scheme_name || 'Unknown Fund',
            category: details.meta?.scheme_category || 'Unknown',
            nav: nav?.nav || null,
            navDate: nav?.date || null,
          };
        } catch (e) {
          return { schemeCode: code, error: 'Could not fetch details' };
        }
      }));

            let bucketRiskLevel = 'Moderate';
      if (bucket.id === 'stable') bucketRiskLevel = 'Conservative';
      if (bucket.id === 'growth') bucketRiskLevel = 'Aggressive';

      return {
        ...bucket,
        bucketRiskLevel,
        recommendedFunds: funds,
      };
    }));

    return result;
  }

  getEligible(bucketId: string, category: string) {
    const bucket = BUCKETS.find((item) => item.id === bucketId);
    if (!bucket || !bucket.eligibleFor.includes(category)) throw new BadRequestException('This bucket is not suitable for the current investor profile. Reassess risk rather than manually increasing it.');
    return bucket;
  }
}
