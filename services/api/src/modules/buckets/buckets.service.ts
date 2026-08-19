import { BadRequestException, Injectable } from '@nestjs/common';

export type Bucket = { id: string; name: string; eligibleFor: string[]; allocation: { equity: number; debt: number; liquid: number }; horizon: string; explanation: string };

const BUCKETS: Bucket[] = [
  { id: 'stable', name: 'Stable foundation', eligibleFor: ['CONSERVATIVE', 'MODERATE'], allocation: { equity: 20, debt: 55, liquid: 25 }, horizon: '1–3 years', explanation: 'Designed to prioritise stability and access. It can still move in value.' },
  { id: 'balanced', name: 'Balanced growth', eligibleFor: ['MODERATE', 'AGGRESSIVE'], allocation: { equity: 55, debt: 35, liquid: 10 }, horizon: '3–7 years', explanation: 'Balances long-term growth potential with stabilising assets.' },
  { id: 'growth', name: 'Long-term growth', eligibleFor: ['AGGRESSIVE'], allocation: { equity: 75, debt: 20, liquid: 5 }, horizon: '7+ years', explanation: 'Built for a long horizon and the ability to accept larger temporary falls.' },
];

@Injectable()
export class BucketsService {
  listForProfile(category: string) {
    return BUCKETS.filter((bucket) => bucket.eligibleFor.includes(category)).map((bucket) => ({ ...bucket, recommended: bucket.eligibleFor[0] === category || bucket.eligibleFor[1] === category, riskMeter: 'SCHEME_RISK_METER_REQUIRED' }));
  }

  getEligible(bucketId: string, category: string) {
    const bucket = BUCKETS.find((item) => item.id === bucketId);
    if (!bucket || !bucket.eligibleFor.includes(category)) throw new BadRequestException('This bucket is not suitable for the current investor profile. Reassess risk rather than manually increasing it.');
    return bucket;
  }
}
