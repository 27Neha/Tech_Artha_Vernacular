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
  UNDER_REVIEW: 'Order in progress',
  SUBMITTED: 'Order in progress',
  ACTIVE: 'Order fulfilled',
  COMPLETED: 'Order fulfilled',
  SUCCEEDED: 'Order fulfilled',
  CONFIRMED: 'Order fulfilled',
  FAILED: 'Order failed',
  REVERSED: 'Order failed',
  CANCELLED: 'Cancelled',
};

const bucketIdForIsin = (isin: string): string | undefined => Object.entries(BUCKET_SCHEME).find(([, s]) => s.isin === isin)?.[0];

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

      // folio_defaults fields are references to separately-created contact resources, not inline values.
      const [email, phone, address] = await Promise.all([
        this.cybrilla.createEmailAddress(fpProfileId, dto.email),
        this.cybrilla.createPhoneNumber(fpProfileId, '91', user!.mobile.replace(/^\+?91/, '')),
        this.cybrilla.createAddress(fpProfileId, dto.addressLine1, 'IN', dto.postalCode),
      ]);

      const cybrillaAccount = await this.cybrilla.createInvestmentAccount(fpProfileId, 'single', {
        communication_email_address: email.id,
        communication_mobile_number: phone.id,
        communication_address: address.id,
        payout_bank_account: bank.data.id,
      });

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

    // Real one-time (lumpsum) order placement. Recurring SIP via auto-debit mandate isn't wired
    // yet - Cybrilla's mandate request schema isn't confirmed (see conversation notes), so for now
    // each "invest" call places a single real order rather than registering a recurring plan.
    const orderResult = await this.cybrilla.createPurchaseOrder({
      mfInvestmentAccount: account.fpAccountId,
      scheme: scheme.isin,
      gateway: scheme.gateway,
      amount: dto.amount,
      userIp: '127.0.0.1',
    });

    const orderStatus = this.mapCybrillaOrderState(orderResult.state);

    const order = await this.prisma.fpPurchaseOrder.create({
      data: {
        accountId: account.id,
        fpOrderId: orderResult.id,
        schemeIsin: scheme.isin,
        amount: dto.amount,
        status: orderStatus,
      },
    });

    await this.prisma.auditLog.create({
      data: { userId, action: 'ORDER_PLACED', details: JSON.stringify({ bucketId, amount: dto.amount, schemeIsin: scheme.isin, orderId: order.id, fpOrderId: orderResult.id }) },
    });

    return {
      orderId: order.id,
      bucketId,
      fundName: scheme.fundName,
      schemeIsin: scheme.isin,
      amount: order.amount,
      status: order.status,
      statusLabel: ORDER_STATUS_LABELS[order.status] ?? order.status,
      message: 'Your order has been placed with Cybrilla. This is a one-time investment - recurring SIP auto-debit is coming soon.',
    };
  }

  /** Maps a Cybrilla mf_purchase "state" onto our own FpPurchaseOrder status vocabulary. */
  private mapCybrillaOrderState(state: string): string {
    const map: Record<string, string> = {
      under_review: 'UNDER_REVIEW',
      submitted: 'SUBMITTED',
      succeeded: 'SUCCEEDED',
      confirmed: 'CONFIRMED',
      failed: 'FAILED',
      reversed: 'REVERSED',
      cancelled: 'CANCELLED',
    };
    return map[state] ?? 'UNDER_REVIEW';
  }

  async listInvestments(userId: string) {
    const investorProfile = await this.prisma.fpInvestorProfile.findUnique({
      where: { userId },
      include: { mfAccounts: { include: { plans: true, orders: true } } },
    });
    if (!investorProfile) return { plans: [], orders: [] };

    const plans = investorProfile.mfAccounts.flatMap((a) => a.plans);
    let orders = investorProfile.mfAccounts.flatMap((a) => a.orders);

    // Self-heal: poll Cybrilla for any order still in a non-terminal state.
    const terminal = new Set(['SUCCEEDED', 'CONFIRMED', 'FAILED', 'REVERSED', 'CANCELLED']);
    orders = await Promise.all(
      orders.map(async (o) => {
        if (terminal.has(o.status) || !o.fpOrderId) return o;
        try {
          const fresh = await this.cybrilla.fetchPurchaseOrder(o.fpOrderId);
          const freshStatus = this.mapCybrillaOrderState(fresh.state);
          if (freshStatus === o.status) return o;
          return this.prisma.fpPurchaseOrder.update({
            where: { id: o.id },
            data: {
              status: freshStatus,
              folioNumber: fresh.folio_number ?? o.folioNumber,
              allottedUnits: fresh.allotted_units ?? o.allottedUnits,
              purchasedPrice: fresh.purchased_price ?? o.purchasedPrice,
            },
          });
        } catch {
          return o; // Cybrilla unreachable - show last known state rather than failing the whole list.
        }
      }),
    );

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
        bucketId: bucketIdForIsin(o.schemeIsin),
        fundName: BUCKET_SCHEME[bucketIdForIsin(o.schemeIsin) ?? '']?.fundName ?? o.schemeIsin,
        schemeIsin: o.schemeIsin,
        amount: o.amount,
        status: o.status,
        statusLabel: ORDER_STATUS_LABELS[o.status] ?? o.status,
        createdAt: o.createdAt,
      })),
    };
  }
}
