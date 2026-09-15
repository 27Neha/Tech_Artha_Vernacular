import { BadRequestException, Injectable } from '@nestjs/common';
import { RecommendationEngine } from '../recommendations/recommendation.engine';
import { FundsService } from '../funds/funds.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CybrillaService } from '../cybrilla/cybrilla.service';
import { InvestInBucketDto } from './invest-in-bucket.dto';

export type Bucket = { id: string; name: string; eligibleFor: string[]; allocation: { equity: number; debt: number; liquid: number }; horizon: string; explanation: string };

const BUCKETS: Bucket[] = [
  { id: 'stable', name: 'Stable foundation', eligibleFor: ['CONSERVATIVE', 'MODERATE'], allocation: { equity: 20, debt: 55, liquid: 25 }, horizon: '1–3 years', explanation: 'Designed to prioritise stability and access. It can still move in value.' },
  { id: 'balanced', name: 'Balanced growth', eligibleFor: ['MODERATE', 'AGGRESSIVE'], allocation: { equity: 55, debt: 35, liquid: 10 }, horizon: '3–7 years', explanation: 'Balances long-term growth potential with stabilising assets.' },
  { id: 'growth', name: 'Long-term growth', eligibleFor: ['AGGRESSIVE'], allocation: { equity: 75, debt: 20, liquid: 5 }, horizon: '7+ years', explanation: 'Built for a long horizon and the ability to accept larger temporary falls.' },
];

// Real Cybrilla sandbox test funds (verified live against the "techartha" tenant), one per bucket.
// These are placeholders until a real scheme-master crosswalk (MFAPI scheme code <-> Cybrilla ISIN) exists.
const BUCKET_SCHEME: Record<string, { isin: string; gateway: string; fundName: string }> = {
  stable: { isin: 'INF109KC1TY0', gateway: 'cybrillapoa', fundName: 'ICICI Prudential Retirement Fund Hybrid Conservative Plan' },
  balanced: { isin: 'INF109K01605', gateway: 'cybrillapoa', fundName: "ICICI Prudential Children's Fund" },
  growth: { isin: 'INF109KC19T7', gateway: 'cybrillapoa', fundName: 'ICICI Prudential Nifty50 Value 20 Index Fund' },
};

const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING_MANDATE_SETUP: 'Order in progress',
  CREATED: 'Order in progress',
  PENDING: 'Order in progress',
  ACTIVE: 'Order fulfilled',
  COMPLETED: 'Order fulfilled',
  FAILED: 'Order failed',
  CANCELLED: 'Cancelled',
};

@Injectable()
export class BucketsService {
  constructor(
    private readonly recommendationEngine: RecommendationEngine,
    private readonly fundsService: FundsService,
    private readonly prisma: PrismaService,
    private readonly cybrilla: CybrillaService,
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

  async invest(userId: string, bucketId: string, dto: InvestInBucketDto) {
    const scheme = BUCKET_SCHEME[bucketId];
    if (!scheme) throw new BadRequestException('Unknown bucket.');

    const riskProfile = await this.prisma.riskProfile.findUnique({ where: { userId } });
    if (!riskProfile) throw new BadRequestException('Complete your risk assessment before investing.');
    this.getEligible(bucketId, riskProfile.category);

    const [profile, kyc, user] = await Promise.all([
      this.prisma.userProfile.findUnique({ where: { userId } }),
      this.prisma.kYCApplication.findUnique({ where: { userId } }),
      this.prisma.user.findUnique({ where: { id: userId } }),
    ]);
    if (!profile?.pan || !profile.fullName || !profile.dateOfBirth) {
      throw new BadRequestException('Complete KYC before investing.');
    }
    if (kyc?.panStatus !== 'VERIFIED') {
      throw new BadRequestException('Your PAN must be verified before investing.');
    }

    const dobStr = profile.dateOfBirth.toISOString().slice(0, 10);

    let investorProfile = await this.prisma.fpInvestorProfile.findUnique({ where: { userId } });
    if (!investorProfile) {
      const created = await this.cybrilla.createInvestorProfile({
        type: 'individual',
        tax_status: 'resident_individual',
        name: profile.fullName,
        date_of_birth: dobStr,
        gender: dto.gender,
        occupation: 'private_sector_service',
        pan: profile.pan,
        country_of_birth: 'IN',
        place_of_birth: 'India',
        nationality_country: 'IN',
        source_of_wealth: 'salary',
        income_slab: 'above_5lakh_upto_10lakh',
        pep_details: 'not_applicable',
        first_tax_residency: { country: 'IN', taxid_type: 'pan', taxid_number: profile.pan },
        ip_address: '127.0.0.1',
      });

      investorProfile = await this.prisma.fpInvestorProfile.create({
        data: {
          userId,
          fpProfileId: created.data.id,
          name: profile.fullName,
          pan: profile.pan,
          dateOfBirth: dobStr,
          gender: dto.gender,
          occupation: 'private_sector_service',
          incomeSlab: 'above_5lakh_upto_10lakh',
          sourceOfWealth: 'salary',
          status: 'CREATED',
        },
      });
    }

    if (!investorProfile.fpProfileId) {
      throw new BadRequestException('Investor profile is missing its Cybrilla reference. Please contact support.');
    }
    const fpProfileId = investorProfile.fpProfileId;

    let account = await this.prisma.fpMfInvestmentAccount.findFirst({ where: { investorProfileId: investorProfile.id } });
    if (!account) {
      const bank = await this.cybrilla.createBankAccount({
        profile: fpProfileId,
        primary_account_holder_name: dto.bankAccountHolderName,
        account_number: dto.bankAccountNumber,
        ifsc_code: dto.ifscCode,
        type: dto.accountType ?? 'savings',
      });

      const cybrillaAccount = await this.cybrilla.createInvestmentAccount(fpProfileId, 'single');

      account = await this.prisma.fpMfInvestmentAccount.create({
        data: {
          fpAccountId: cybrillaAccount.id,
          investorProfileId: investorProfile.id,
          bankAccountId: bank.data.id,
          holdingPattern: 'single',
          status: 'ACTIVE',
        },
      });
    }

    // Actual order/SIP submission to Cybrilla (POST /v2/mf_purchases) requires the investment
    // account's `folio_defaults` to be set first - the exact nested schema for that isn't
    // confirmed yet (see conversation notes). Queue the SIP honestly rather than fake activation.
    const plan = await this.prisma.fpPurchasePlan.create({
      data: {
        accountId: account.id,
        bucketId,
        schemeIsin: scheme.isin,
        amount: dto.amount,
        frequency: 'MONTHLY',
        installmentDay: dto.installmentDay,
        status: 'PENDING_MANDATE_SETUP',
      },
    });

    await this.prisma.auditLog.create({
      data: { userId, action: 'SIP_QUEUED', details: JSON.stringify({ bucketId, amount: dto.amount, schemeIsin: scheme.isin, planId: plan.id }) },
    });

    return {
      planId: plan.id,
      bucketId,
      fundName: scheme.fundName,
      schemeIsin: scheme.isin,
      amount: plan.amount,
      installmentDay: plan.installmentDay,
      status: plan.status,
      statusLabel: ORDER_STATUS_LABELS[plan.status] ?? plan.status,
      message: 'Your SIP has been queued. Final activation is pending bank mandate setup completion.',
    };
  }

  async listInvestments(userId: string) {
    const investorProfile = await this.prisma.fpInvestorProfile.findUnique({
      where: { userId },
      include: { mfAccounts: { include: { plans: true, orders: true } } },
    });
    if (!investorProfile) return { plans: [], orders: [] };

    const plans = investorProfile.mfAccounts.flatMap((a) => a.plans);
    const orders = investorProfile.mfAccounts.flatMap((a) => a.orders);

    return {
      plans: plans.map((p) => ({
        id: p.id,
        bucketId: p.bucketId,
        fundName: BUCKET_SCHEME[p.bucketId]?.fundName ?? p.schemeIsin,
        schemeIsin: p.schemeIsin,
        amount: p.amount,
        frequency: p.frequency,
        installmentDay: p.installmentDay,
        status: p.status,
        statusLabel: ORDER_STATUS_LABELS[p.status] ?? p.status,
        createdAt: p.createdAt,
      })),
      orders: orders.map((o) => ({
        id: o.id,
        schemeIsin: o.schemeIsin,
        amount: o.amount,
        status: o.status,
        statusLabel: ORDER_STATUS_LABELS[o.status] ?? o.status,
        createdAt: o.createdAt,
      })),
    };
  }
}
