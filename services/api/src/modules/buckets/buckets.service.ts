import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { RecommendationEngine } from '../recommendations/recommendation.engine';
import { FundsService } from '../funds/funds.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CybrillaService } from '../cybrilla/cybrilla.service';
import { resolveBankAccountOldId } from '../cybrilla/account-ids';
import { TwoFactorService } from '../twofactor/twofactor.service';
import { NomineeService } from '../nominee/nominee.service';
import { MandatesService } from '../mandates/mandates.service';
import { InvestInBucketDto } from './invest-in-bucket.dto';
import { StartSipDto } from './sip-in-bucket.dto';
import { CustomBucketDto } from './custom-bucket.dto';
import { InvestInFundDto, StartFundSipDto } from './fund-invest.dto';
import { assessSuitability } from './fund-suitability';
import { describeKycFailure } from '../kyc/kyc.service';

/** What an order is placed against: a bucket's fixed scheme or a directly chosen fund. */
type SchemeTarget = { isin: string; gateway: string; fundName: string };
type FundTarget = SchemeTarget & { category: string | null; schemeCode: string };

/** Recorded on the order and in the audit log, so it is clear how the fund was chosen. */
type OrderOrigin = { bucketId: string } | { schemeCode: string; riskAcknowledged: boolean };

// Every order and plan goes through ONDC, the gateway Cybrilla's purchase and purchase
// plan samples use. Plans default to it at the gateway anyway, so lumpsums sent through a
// different one left the two order types on different rails.
const DEFAULT_GATEWAY = 'ondc';

export type Bucket = { id: string; name: string; eligibleFor: string[]; allocation: { equity: number; debt: number; liquid: number }; horizon: string; explanation: string };

// MFAPI's dataset includes funds that stopped reporting NAVs years ago. Treat anything not
// updated in the last 45 days as dead/stale rather than a real, investable recommendation.
function isNavRecent(navDate: string | null, maxAgeDays = 45): boolean {
  if (!navDate) return false;
  const [day, month, year] = navDate.split('-').map(Number);
  if (!day || !month || !year) return false;
  const parsed = new Date(year, month - 1, day);
  if (Number.isNaN(parsed.getTime())) return false;
  const ageDays = (Date.now() - parsed.getTime()) / (1000 * 60 * 60 * 24);
  return ageDays <= maxAgeDays;
}

const BUCKETS: Bucket[] = [
  { id: 'stable', name: 'Stable foundation', eligibleFor: ['CONSERVATIVE', 'MODERATELY_LOW', 'MODERATE'], allocation: { equity: 20, debt: 55, liquid: 25 }, horizon: '1–3 years', explanation: 'Designed to prioritise stability and access. It can still move in value.' },
  { id: 'balanced', name: 'Balanced growth', eligibleFor: ['MODERATELY_LOW', 'MODERATE', 'MODERATELY_HIGH', 'AGGRESSIVE'], allocation: { equity: 55, debt: 35, liquid: 10 }, horizon: '3–7 years', explanation: 'Balances long-term growth potential with stabilising assets.' },
  { id: 'growth', name: 'Long-term growth', eligibleFor: ['MODERATE', 'MODERATELY_HIGH', 'AGGRESSIVE'], allocation: { equity: 75, debt: 20, liquid: 5 }, horizon: '7+ years', explanation: 'Built for a long horizon and the ability to accept larger temporary falls.' },
];

// Real Cybrilla sandbox test funds (verified live against the "techartha" tenant), one per bucket.
// These are placeholders until a real scheme-master crosswalk (MFAPI scheme code <-> Cybrilla ISIN) exists.
const BUCKET_SCHEME: Record<string, SchemeTarget> = {
  stable: { isin: 'INF109KC1TY0', gateway: 'ondc', fundName: 'ICICI Prudential Retirement Fund Hybrid Conservative Plan' },
  balanced: { isin: 'INF109K01605', gateway: 'ondc', fundName: "ICICI Prudential Children's Fund" },
  growth: { isin: 'INF109KC19T7', gateway: 'ondc', fundName: 'ICICI Prudential Nifty50 Value 20 Index Fund' },
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
  private readonly logger = new Logger(BucketsService.name);
  constructor(
    private readonly recommendationEngine: RecommendationEngine,
    private readonly fundsService: FundsService,
    private readonly prisma: PrismaService,
    private readonly cybrilla: CybrillaService,
    private readonly twoFactor: TwoFactorService,
    private readonly nominees: NomineeService,
    private readonly mandates: MandatesService,
  ) {}

  async listForProfile(category: string) {
    const filteredBuckets = BUCKETS.filter((bucket) => bucket.eligibleFor.includes(category)).map((bucket) => ({ ...bucket, recommended: bucket.eligibleFor[0] === category || bucket.eligibleFor[1] === category, riskMeter: 'SCHEME_RISK_METER_REQUIRED' }));
    
    // For each bucket, we can fetch recommendations and fund details
    const result = await Promise.all(filteredBuckets.map(async (bucket) => {
      const schemeCodes = await this.recommendationEngine.getRecommendations({
        riskProfile: bucket.eligibleFor[0],
        horizon: bucket.horizon,
      });

      const candidates = await Promise.all(schemeCodes.map(async (code) => {
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
          return { schemeCode: code, name: undefined, category: undefined, nav: null, navDate: null };
        }
      }));

      // Tiered fallback: prefer funds updated in the last 45 days; if MFAPI's search doesn't
      // surface any (a real gap for some categories, e.g. debt-fund search terms), fall back to
      // any fund with a real, non-zero NAV regardless of age. A literal 0.00000 NAV means the
      // fund stopped reporting entirely and must never be shown, even as a last resort.
      const nonZero = candidates.filter((f) => f.nav && parseFloat(f.nav) > 0);
      const fresh = nonZero.filter((f) => isNavRecent(f.navDate));
      const funds = (fresh.length ? fresh : nonZero).slice(0, 4);

            let bucketRiskLevel = 'Moderate';
      if (bucket.id === 'stable') bucketRiskLevel = 'Conservative';
      if (bucket.id === 'growth') bucketRiskLevel = 'Aggressive';

      return {
        ...bucket,
        bucketRiskLevel,
        // The one scheme a purchase in this bucket actually buys. recommendedFunds are
        // reference funds from MFAPI and are not what the money goes into, so the app
        // must be able to say which fund that is.
        investsIn: BUCKET_SCHEME[bucket.id]
          ? { fundName: BUCKET_SCHEME[bucket.id].fundName, schemeIsin: BUCKET_SCHEME[bucket.id].isin }
          : null,
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

  /** The bucket's scheme, once the investor's profile is confirmed eligible for it. */
  private async bucketScheme(userId: string, bucketId: string): Promise<SchemeTarget> {
    const scheme = BUCKET_SCHEME[bucketId];
    if (!scheme) throw new BadRequestException('Unknown bucket.');

    const riskProfile = await this.prisma.riskProfile.findUnique({ where: { userId } });
    if (!riskProfile) throw new BadRequestException('Complete your risk assessment before investing.');
    this.getEligible(bucketId, riskProfile.category);
    return scheme;
  }

  /**
   * Resolves an MFAPI scheme code to the ISIN Cybrilla buys. Always done here from the
   * scheme code, never taken from the client, so the fund named in the URL is the fund
   * that is bought. The growth ISIN is used because that is the option the app shows.
   */
  private async resolveFund(schemeCode: string): Promise<FundTarget> {
    if (!/^\d+$/.test(schemeCode)) throw new BadRequestException('Unknown fund.');

    const details = await this.fundsService.getFundDetails(schemeCode);
    const meta = details?.meta;
    if (!meta?.scheme_name) throw new BadRequestException('Unknown fund.');

    const isin = typeof meta.isin_growth === 'string' ? meta.isin_growth.trim() : '';
    if (!isin) {
      throw new BadRequestException('This fund has no growth option, so it cannot be bought through the app.');
    }
    // Same staleness rule as bucket recommendations: a fund that has stopped reporting
    // NAVs is closed or merged, and an order against it would only fail at the AMC.
    if (!isNavRecent(details.data?.[0]?.date ?? null)) {
      throw new BadRequestException('This fund has not reported a NAV recently, so it cannot be invested in.');
    }

    return {
      isin,
      gateway: DEFAULT_GATEWAY,
      fundName: meta.scheme_name,
      category: meta.scheme_category ?? null,
      schemeCode,
    };
  }

  /**
   * Refuses a fund riskier than the investor's profile unless they acknowledged it.
   * Runs before the second factor is consumed, so a missing acknowledgement does not
   * cost the investor their code.
   */
  private async checkSuitability(userId: string, fund: FundTarget, acknowledged: boolean | undefined) {
    const riskProfile = await this.prisma.riskProfile.findUnique({ where: { userId } });
    if (!riskProfile) throw new BadRequestException('Complete your risk assessment before investing.');

    const suitability = assessSuitability(fund.category, riskProfile.category);
    if (suitability.requiresAcknowledgement && !acknowledged) {
      throw new BadRequestException(
        'This fund carries more risk than your assessed profile. Review the warning and confirm you understand it to continue.',
      );
    }
    return suitability;
  }

  /**
   * What the invest screen needs before showing the form: whether the fund can be bought
   * at all, and whether the investor must acknowledge a risk mismatch. Never throws for
   * an un-investable fund, because "you can't buy this, here's why" is a normal answer.
   */
  async fundEligibility(userId: string, schemeCode: string) {
    let fund: FundTarget;
    try {
      fund = await this.resolveFund(schemeCode);
    } catch (e) {
      if (e instanceof BadRequestException) return { investable: false, reason: e.message, schemeCode };
      throw e;
    }

    const riskProfile = await this.prisma.riskProfile.findUnique({ where: { userId } });
    const base = { schemeCode, schemeIsin: fund.isin, fundName: fund.fundName, category: fund.category };
    if (!riskProfile) {
      return { ...base, investable: false, reason: 'Complete your risk assessment before investing.' };
    }
    return { ...base, investable: true, ...assessSuitability(fund.category, riskProfile.category) };
  }

  /**
   * Every read-only precondition for placing an order. Callers run it before the second
   * factor is consumed, so an investor who cannot invest yet is told why without losing
   * their code; ensureInvestmentAccount runs it again as the last guard before the gateway.
   *
   * When the investor has no investment account yet, this order is what opens it, so
   * the investor's own declarations for the account must all be in the request.
   */
  private async assertCanInvest(userId: string, dto?: InvestInBucketDto) {
    const [profile, kyc, user, termsAccepted, investor] = await Promise.all([
      this.prisma.userProfile.findUnique({ where: { userId } }),
      this.prisma.kYCApplication.findUnique({ where: { userId } }),
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.consent.findFirst({ where: { userId, type: 'TERMS_AND_CONDITIONS', status: 'GRANTED' } }),
      this.prisma.fpInvestorProfile.findUnique({ where: { userId }, include: { mfAccounts: true } }),
    ]);
    if (!profile?.pan || !profile.fullName || !profile.dateOfBirth) {
      throw new BadRequestException('Complete KYC before investing.');
    }
    // overallStatus includes readiness: KYC complete at the KRA, not just a valid PAN.
    // The gateway fails every order from an investor who is not ready.
    if (kyc?.overallStatus !== 'VERIFIED') {
      throw new BadRequestException(
        kyc?.overallStatus === 'IN_PROGRESS'
          ? 'Your KYC is still being verified. Please check again in a few minutes.'
          : (describeKycFailure(kyc?.readinessCode ?? null, kyc?.failureReason ?? null) ??
              'Your KYC must be verified before investing.'),
      );
    }
    // Enforced here rather than trusting dto.email: the AMC emails the statements and
    // order confirmations we are required to deliver, so the address has to be one the
    // investor proved they control via POST /auth/email/verify-otp.
    if (!user?.email) {
      throw new BadRequestException('Verify your email address before investing.');
    }
    if (!termsAccepted) {
      throw new BadRequestException('Accept the Terms and Conditions before investing.');
    }
    // Sent to Cybrilla as belongs_to when the account is opened (compliance points 1, 3).
    if (!user.emailBelongsTo || !user.mobileBelongsTo) {
      throw new BadRequestException(
        'Declare whose email address and mobile number these are before investing. You can do this from your profile.',
      );
    }
    const hasAccount = (investor?.mfAccounts.length ?? 0) > 0;
    if (!hasAccount && dto) {
      const missing = this.missingAccountDetails(dto);
      if (missing.length) {
        throw new BadRequestException(`To open your investment account we still need: ${missing.join(', ')}.`);
      }
    }
    // Narrowed for the caller: the checks above are what make these fields present.
    return {
      profile: profile as typeof profile & { pan: string; fullName: string; dateOfBirth: Date },
      user: user as typeof user & { email: string; emailBelongsTo: string; mobileBelongsTo: string },
      hasAccount,
    };
  }

  /** What a first order must carry to open the investment account, in form order. */
  private missingAccountDetails(dto: InvestInBucketDto): string[] {
    const checks: [boolean, string][] = [
      [!dto.gender, 'gender'],
      [!dto.occupation, 'occupation'],
      [!dto.incomeSlab, 'income range'],
      [!dto.sourceOfWealth, 'source of wealth'],
      [!dto.pepDetails, 'politically exposed person declaration'],
      [!dto.placeOfBirth?.trim(), 'place of birth'],
      [dto.residentIndianDeclaration !== true, 'confirmation that you are an Indian citizen and tax resident of India only'],
      [!dto.bankAccountHolderName?.trim(), 'account holder name'],
      [!dto.bankAccountNumber?.trim(), 'bank account number'],
      [!dto.ifscCode?.trim(), 'IFSC code'],
      [!dto.accountType, 'bank account type'],
      [!dto.addressLine1?.trim(), 'address'],
      [!dto.postalCode?.trim(), 'PIN code'],
    ];
    return checks.filter(([isMissing]) => isMissing).map(([, label]) => label);
  }

  /**
   * Status the invest form needs before it is shown: whether this order will open the
   * investment account (and so must collect the investor's details) and anything that
   * would block investing outright. Mirrors assertCanInvest, without throwing.
   */
  async accountStatus(userId: string) {
    const [kyc, user, termsAccepted, investor] = await Promise.all([
      this.prisma.kYCApplication.findUnique({ where: { userId } }),
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.consent.findFirst({ where: { userId, type: 'TERMS_AND_CONDITIONS', status: 'GRANTED' } }),
      this.prisma.fpInvestorProfile.findUnique({ where: { userId }, include: { mfAccounts: true } }),
    ]);
    const account = investor?.mfAccounts[0] ?? null;
    const [mandate, bankAccount] = account
      ? await Promise.all([this.mandates.approvedFor(userId, 0), this.registeredBankAccount(account.bankAccountId)])
      : [null, null];
    return {
      hasInvestmentAccount: Boolean(account),
      // What a SIP can collect through; a SIP above this limit needs a new mandate.
      approvedMandateLimit: mandate?.mandateLimit ?? null,
      bankAccount,
      kycStatus: kyc?.overallStatus ?? 'NOT_STARTED',
      kycMessage: kyc ? describeKycFailure(kyc.readinessCode, kyc.failureReason) : null,
      emailVerified: Boolean(user?.email),
      termsAccepted: Boolean(termsAccepted),
      emailBelongsTo: user?.emailBelongsTo ?? null,
      mobileBelongsTo: user?.mobileBelongsTo ?? null,
    };
  }

  /**
   * The payout bank account registered at the gateway, masked for display. Read from
   * Cybrilla rather than stored here: the full account number is not kept locally.
   */
  private async registeredBankAccount(bankAccountId: string | null) {
    if (!bankAccountId) return null;
    try {
      const bank = await this.cybrilla.fetchBankAccount(bankAccountId);
      const number = String(bank?.account_number ?? bank?.data?.account_number ?? '');
      return {
        holderName: bank?.primary_account_holder_name ?? null,
        maskedNumber: number ? `${'•'.repeat(Math.max(0, number.length - 4))}${number.slice(-4)}` : null,
        ifscCode: bank?.ifsc_code ?? null,
        type: bank?.type ?? null,
      };
    } catch {
      return null;
    }
  }

  /**
   * Everything both the lumpsum and the SIP path need before a transaction can be sent:
   * KYC guards, the Cybrilla investor profile, the bank account and the MF investment
   * account. Shared by buckets and single funds so the paths cannot drift - an order
   * placed against a differently-built account would be very hard to diagnose.
   *
   * Every value sent to create the profile and account is the investor's own: the
   * declarations in the request, the declarations on the user, and the request's IP.
   */
  private async ensureInvestmentAccount(userId: string, dto: InvestInBucketDto, userIp: string) {
    const { profile, user } = await this.assertCanInvest(userId, dto);

    const dobStr = profile.dateOfBirth.toISOString().slice(0, 10);

    let investorProfile = await this.prisma.fpInvestorProfile.findUnique({ where: { userId } });
    if (!investorProfile) {
      // assertCanInvest has confirmed these are present for a first order.
      const details = dto as Required<Pick<InvestInBucketDto, 'gender' | 'occupation' | 'incomeSlab' | 'sourceOfWealth' | 'pepDetails' | 'placeOfBirth'>>;
      const created = await this.cybrilla.createInvestorProfile({
        type: 'individual',
        // These four follow from residentIndianDeclaration, which the investor made.
        tax_status: 'resident_individual',
        country_of_birth: 'IN',
        nationality_country: 'IN',
        first_tax_residency: { country: 'IN', taxid_type: 'pan', taxid_number: profile.pan },
        name: profile.fullName,
        date_of_birth: dobStr,
        gender: details.gender,
        occupation: details.occupation,
        pan: profile.pan,
        place_of_birth: details.placeOfBirth.trim(),
        source_of_wealth: details.sourceOfWealth,
        income_slab: details.incomeSlab,
        pep_details: details.pepDetails,
        ip_address: userIp,
      });

      investorProfile = await this.prisma.fpInvestorProfile.create({
        data: {
          userId,
          fpProfileId: created.data.id,
          name: profile.fullName,
          pan: profile.pan,
          dateOfBirth: dobStr,
          gender: details.gender,
          occupation: details.occupation,
          incomeSlab: details.incomeSlab,
          sourceOfWealth: details.sourceOfWealth,
          pepDetails: details.pepDetails,
          placeOfBirth: details.placeOfBirth.trim(),
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
      const bankDetails = dto as Required<Pick<InvestInBucketDto, 'bankAccountHolderName' | 'bankAccountNumber' | 'ifscCode' | 'accountType' | 'addressLine1' | 'postalCode'>>;
      const bank = await this.cybrilla.createBankAccount({
        profile: fpProfileId,
        primary_account_holder_name: bankDetails.bankAccountHolderName.trim(),
        account_number: bankDetails.bankAccountNumber.trim(),
        ifsc_code: bankDetails.ifscCode.trim(),
        type: bankDetails.accountType,
      });

      // folio_defaults fields are references to separately-created contact resources, not inline values.
      const [email, phone, address] = await Promise.all([
        this.cybrilla.createEmailAddress(fpProfileId, user.email, user.emailBelongsTo),
        this.cybrilla.createPhoneNumber(fpProfileId, '91', (user.mobile || '').replace(/^\+?91/, ''), user.mobileBelongsTo),
        this.cybrilla.createAddress(fpProfileId, bankDetails.addressLine1.trim(), 'IN', bankDetails.postalCode.trim()),
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
          bankAccountOldId: Number.isInteger(bank.data.old_id) ? bank.data.old_id : null,
          fpAccountOldId: Number.isInteger(cybrillaAccount.old_id) ? cybrillaAccount.old_id : null,
          holdingPattern: 'single',
          status: 'ACTIVE',
        },
      });

      // A nomination made before the account existed is registered now that it does.
      // syncToGateway records its own failures, so the order is not held up by one.
      await this.nominees.syncToGateway(userId);
    }
    return { account, user };
  }
  /**
   * The gateway's numeric order id. `amc_order_ids` on the payment endpoint takes this
   * `old_id`, not the `mfp_...` string, which is the one detail in Cybrilla's sample
   * that is easy to miss and fails the payment outright.
   */
  private numericOrderId(orderResult: any): number | null {
    const raw = orderResult?.old_id ?? orderResult?.data?.old_id;
    const parsed = Number(raw);
    return Number.isInteger(parsed) ? parsed : null;
  }

  /**
   * Starts collection for a confirmed order and returns the investor-facing token_url.
   *
   * Deliberately non-fatal: the order exists and is confirmed by this point, so a failed
   * payment hand-off must not discard it. The order is stored without a token_url and
   * the caller tells the investor payment could not be started, which is recoverable -
   * throwing here would leave a confirmed order at the gateway that our side forgot.
   */
  /** See resolveBankAccountOldId; shared with mandates, which need the same id. */
  private async bankAccountOldId(account: { id: string; bankAccountId: string | null; bankAccountOldId: number | null }) {
    return resolveBankAccountOldId(this.prisma, this.cybrilla, account, this.logger);
  }

  private async startPayment(
    orderResult: any,
    account: { id: string; bankAccountId: string | null; bankAccountOldId: number | null },
  ) {
    const amcOrderId = this.numericOrderId(orderResult);
    const bankAccountId = amcOrderId === null ? null : await this.bankAccountOldId(account);
    if (amcOrderId === null || bankAccountId === null) {
      this.logger.warn(
        `Cannot start payment for ${orderResult?.id}: ${amcOrderId === null ? 'no numeric old_id in the gateway response' : 'no numeric bank account id'}.`,
      );
      return null;
    }

    try {
      return await this.cybrilla.createPayment({
        amcOrderIds: [amcOrderId],
        bankAccountId,
        // Where the gateway returns the investor after paying. The app registers this
        // scheme (see app.json), so the deep link reopens it on the order screen.
        paymentPostbackUrl: process.env.PAYMENT_POSTBACK_URL || 'techartha://payment-complete',
      });
    } catch (e) {
      this.logger.warn(`Order ${orderResult?.id} confirmed but payment could not be started.`);
      return null;
    }
  }

  async invest(userId: string, bucketId: string, dto: InvestInBucketDto, userIp: string) {
    // Eligibility is read-only, so it runs before the code is consumed: an investor who
    // is not eligible should not lose their code finding that out.
    const scheme = await this.bucketScheme(userId, bucketId);
    await this.assertCanInvest(userId, dto);

    // Authorised before any Cybrilla resource is created. The code is bound to this
    // amount and bucket, so one issued for a smaller order will not authorise this.
    // The bucket fixes the scheme server-side, so the client is not asked to send an ISIN.
    await this.twoFactor.verifyAndConsume(
      userId,
      { action: 'PURCHASE', amount: dto.amount, bucketId },
      dto.challengeId,
      dto.otp,
      dto.transactionConsent,
    );

    return this.placePurchase(userId, scheme, dto, { bucketId }, userIp);
  }

  /**
   * A one-time purchase of a single fund. The code is bound to the resolved ISIN, which
   * the client learns from GET /funds/:schemeCode/invest-eligibility and passes to the
   * challenge unchanged.
   */
  async investInFund(userId: string, schemeCode: string, dto: InvestInFundDto, userIp: string) {
    const fund = await this.resolveFund(schemeCode);
    await this.checkSuitability(userId, fund, dto.acknowledgeRiskMismatch);
    await this.assertCanInvest(userId, dto);

    await this.twoFactor.verifyAndConsume(
      userId,
      { action: 'PURCHASE', amount: dto.amount, schemeIsin: fund.isin },
      dto.challengeId,
      dto.otp,
      dto.transactionConsent,
    );

    return this.placePurchase(
      userId,
      fund,
      dto,
      { schemeCode, riskAcknowledged: dto.acknowledgeRiskMismatch === true },
      userIp,
    );
  }

  /** The order itself, once the caller has authorised it and settled the scheme. */
  private async placePurchase(userId: string, scheme: SchemeTarget, dto: InvestInBucketDto, origin: OrderOrigin, userIp: string) {
    const { account, user } = await this.ensureInvestmentAccount(userId, dto, userIp);

    // Real one-time (lumpsum) order placement. Recurring SIP via auto-debit mandate isn't wired
    // yet - Cybrilla's mandate request schema isn't confirmed (see conversation notes), so for now
    // each "invest" call places a single real order rather than registering a recurring plan.
    const orderResult = await this.cybrilla.createPurchaseOrder({
      mfInvestmentAccount: account.fpAccountId,
      scheme: scheme.isin,
      gateway: scheme.gateway,
      amount: dto.amount,
      userIp,
    });

    // Step 2 of Cybrilla's purchase flow: a created order sits in `under_review` and
    // never progresses until it is explicitly confirmed with the investor's consent.
    // Skipping this is why every order we placed ended up `failed` with
    // `confirmed_at: null`.
    let confirmed = orderResult;
    try {
      confirmed = await this.cybrilla.confirmPurchaseOrder({
        fpOrderId: orderResult.id,
        email: user.email!,
        mobile: (user.mobile || '').replace(/^\+?91/, ''),
      });
    } catch (e) {
      // The order exists either way; surface it as in-progress rather than losing the
      // reference, and let /buckets/investments reconcile the real state later.
      this.logger.warn(`Order ${orderResult.id} created but could not be confirmed.`);
    }

    const orderStatus = this.mapCybrillaOrderState(confirmed.state ?? orderResult.state);

    // Step 3 of Cybrilla's purchase flow. A confirmed order is not a paid one: without
    // this call nothing is ever collected, so no units are allotted and no folio is
    // created. Every order we placed before this existed was confirmed and unfunded.
    const payment = await this.startPayment(orderResult, account);

    const order = await this.prisma.fpPurchaseOrder.create({
      data: {
        accountId: account.id,
        fpOrderId: orderResult.id,
        fpOldId: this.numericOrderId(orderResult),
        schemeIsin: scheme.isin,
        fundName: scheme.fundName,
        amount: dto.amount,
        status: orderStatus,
        paymentTokenUrl: payment?.token_url ?? null,
        paymentId: payment?.id ?? null,
      },
    });

    await this.prisma.auditLog.create({
      data: { userId, action: 'ORDER_PLACED', details: JSON.stringify({ ...origin, amount: dto.amount, schemeIsin: scheme.isin, orderId: order.id, fpOrderId: orderResult.id }) },
    });

    return {
      orderId: order.id,
      bucketId: 'bucketId' in origin ? origin.bucketId : null,
      fundName: scheme.fundName,
      schemeIsin: scheme.isin,
      amount: order.amount,
      status: order.status,
      statusLabel: ORDER_STATUS_LABELS[order.status] ?? order.status,
      // The investor must open this to actually pay; the order is confirmed but unfunded
      // until they do. Null means the hand-off failed, which the message then says.
      paymentUrl: order.paymentTokenUrl,
      message: order.paymentTokenUrl
        ? 'Your order has been placed. Complete the payment to confirm your investment - units are allotted only once payment succeeds.'
        : 'Your order has been placed, but we could not start the payment. Open it from your portfolio to pay, or contact support if it does not appear.',
    };
  }

  /**
   * Registers a recurring SIP through POST /v2/mf_purchase_plans, following Cybrilla's
   * purchase plan flow: the plan is created against an APPROVED auto-debit mandate as
   * its payment_source, confirmed, and its first instalment fetched and paid.
   *
   * The mandate is set up separately (MandatesService) and checked here before the code
   * is consumed: without one the gateway cannot confirm the plan.
   */
  async startSip(userId: string, bucketId: string, dto: StartSipDto, userIp: string) {
    const scheme = await this.bucketScheme(userId, bucketId);
    await this.assertCanInvest(userId, dto);
    const mandate = await this.requireMandate(userId, dto.amount);

    await this.twoFactor.verifyAndConsume(
      userId,
      {
        action: 'SIP',
        amount: dto.amount,
        bucketId,
        frequency: dto.frequency,
        numberOfInstallments: dto.numberOfInstallments,
      },
      dto.challengeId,
      dto.otp,
      dto.transactionConsent,
    );

    return this.registerSip(userId, scheme, dto, { bucketId }, userIp, mandate);
  }

  /** The approved mandate this SIP will collect through, or a clear refusal. */
  private async requireMandate(userId: string, amount: number) {
    const mandate = await this.mandates.approvedFor(userId, amount);
    if (!mandate) {
      throw new BadRequestException(
        `A SIP collects its instalments by auto-debit. Set up and approve a UPI Autopay or e-NACH mandate with a limit of at least ₹${amount} first.`,
      );
    }
    return mandate;
  }

  /** A SIP in a single fund. Authorised against the resolved ISIN, as investInFund is. */
  async startFundSip(userId: string, schemeCode: string, dto: StartFundSipDto, userIp: string) {
    const fund = await this.resolveFund(schemeCode);
    await this.checkSuitability(userId, fund, dto.acknowledgeRiskMismatch);
    await this.assertCanInvest(userId, dto);
    const mandate = await this.requireMandate(userId, dto.amount);

    await this.twoFactor.verifyAndConsume(
      userId,
      {
        action: 'SIP',
        amount: dto.amount,
        schemeIsin: fund.isin,
        frequency: dto.frequency,
        numberOfInstallments: dto.numberOfInstallments,
      },
      dto.challengeId,
      dto.otp,
      dto.transactionConsent,
    );

    return this.registerSip(
      userId,
      fund,
      dto,
      { schemeCode, riskAcknowledged: dto.acknowledgeRiskMismatch === true },
      userIp,
      mandate,
    );
  }

  /** The plan itself, once the caller has authorised it and settled the scheme and mandate. */
  private async registerSip(
    userId: string,
    scheme: SchemeTarget,
    dto: StartSipDto,
    origin: OrderOrigin,
    userIp: string,
    mandate: { id: string; fpMandateId: number },
  ) {
    const bucketId = 'bucketId' in origin ? origin.bucketId : null;
    const { account, user } = await this.ensureInvestmentAccount(userId, dto, userIp);

    const planResult = await this.cybrilla.createPurchasePlan({
      mfInvestmentAccount: account.fpAccountId,
      scheme: scheme.isin,
      gateway: scheme.gateway,
      amount: dto.amount,
      frequency: dto.frequency,
      installmentDay: dto.installmentDay,
      numberOfInstallments: dto.numberOfInstallments,
      userIp,
      // Recorded on the plan itself, as Cybrilla's sample does. Without it the plan
      // carries no consent for the recurring debit it is authorising.
      consent: {
        email: user!.email!,
        mobile: (user!.mobile || '').replace(/^\+?91/, ''),
      },
      // payment_method 'mandate' with the mandate's id as payment_source, as the
      // purchase plan sample requires before the plan can be confirmed.
      mandate: String(mandate.fpMandateId),
      // The first instalment is raised now and paid by the investor online (step 4 of
      // the sample); later ones are collected through the mandate.
      generateFirstInstallmentNow: true,
    });

    // Plans need the same confirmation step as orders.
    let planState: string | null = planResult?.state ?? null;
    try {
      const confirmed = await this.cybrilla.confirmPurchasePlan(planResult?.id ?? planResult?.data?.id);
      planState = confirmed?.state ?? planState;
    } catch (e) {
      this.logger.warn('SIP plan created but could not be confirmed.');
    }

    // Steps 3 and 4 of Cybrilla's purchase-plan sample: the plan's first instalment is a
    // purchase order of its own, which has to be fetched and then paid for. Without this
    // the plan is registered but its first instalment is never funded.
    const fpPlanId = planResult?.id ?? planResult?.data?.id ?? null;
    let firstInstallment: any = null;
    let planPayment: { id: number; token_url: string } | null = null;
    if (fpPlanId) {
      firstInstallment = await this.cybrilla.fetchPlanInstallment(fpPlanId);
      if (firstInstallment) {
        planPayment = await this.startPayment(firstInstallment, account);
      } else {
        this.logger.warn(`Plan ${fpPlanId} confirmed but no first instalment order was returned.`);
      }
    }

    const plan = await this.prisma.fpPurchasePlan.create({
      data: {
        accountId: account.id,
        bucketId,
        schemeIsin: scheme.isin,
        fundName: scheme.fundName,
        amount: dto.amount,
        frequency: dto.frequency,
        installmentDay: dto.installmentDay,
        status: this.mapPlanState(planState),
        mandateId: mandate.id,
        fpPlanId,
        firstOrderId: firstInstallment?.id ?? null,
        paymentTokenUrl: planPayment?.token_url ?? null,
        paymentId: planPayment?.id ?? null,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'SIP_REGISTERED',
        details: JSON.stringify({
          ...origin,
          amount: dto.amount,
          frequency: dto.frequency,
          installmentDay: dto.installmentDay,
          schemeIsin: scheme.isin,
          planId: plan.id,
        }),
      },
    });

    return {
      planId: plan.id,
      bucketId,
      fundName: scheme.fundName,
      schemeIsin: scheme.isin,
      amount: plan.amount,
      frequency: plan.frequency,
      installmentDay: plan.installmentDay,
      status: plan.status,
      statusLabel: ORDER_STATUS_LABELS[plan.status] ?? plan.status,
      // The first instalment is payable now; the rest are collected by the mandate.
      paymentUrl: plan.paymentTokenUrl,
      message: plan.paymentTokenUrl
        ? 'Your SIP has been registered. Pay the first instalment to start it; later instalments are collected through your auto-debit mandate.'
        : 'Your SIP has been registered. Its instalments are collected through your auto-debit mandate.',
    };
  }

  /** Maps a Cybrilla mf_purchase_plan "state" onto our plan status vocabulary. */
  private mapPlanState(state: string | null): string {
    const map: Record<string, string> = {
      created: 'CREATED',
      review_completed: 'CREATED',
      confirmed: 'CONFIRMED',
      submitted: 'SUBMITTED',
      active: 'ACTIVE',
      completed: 'COMPLETED',
      failed: 'FAILED',
      cancelled: 'CANCELLED',
    };
    return map[state ?? ''] ?? 'CREATED';
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
        // Stored names first; rows from before single-fund orders only carry the bucket.
        fundName: p.fundName ?? BUCKET_SCHEME[p.bucketId ?? '']?.fundName ?? p.schemeIsin,
        schemeIsin: p.schemeIsin,
        amount: p.amount,
        frequency: p.frequency,
        installmentDay: p.installmentDay,
        status: p.status,
        statusLabel: ORDER_STATUS_LABELS[p.status] ?? p.status,
        paymentUrl: p.paymentTokenUrl,
        createdAt: p.createdAt,
      })),
      orders: orders.map((o) => ({
        id: o.id,
        bucketId: bucketIdForIsin(o.schemeIsin),
        fundName: o.fundName ?? BUCKET_SCHEME[bucketIdForIsin(o.schemeIsin) ?? '']?.fundName ?? o.schemeIsin,
        schemeIsin: o.schemeIsin,
        amount: o.amount,
        status: o.status,
        statusLabel: ORDER_STATUS_LABELS[o.status] ?? o.status,
        // Offered only while the order can still be paid; a settled or failed order's
        // old payment page must not be reopened.
        paymentUrl: ['SUCCEEDED', 'CONFIRMED', 'FAILED', 'REVERSED', 'CANCELLED'].includes(o.status) ? null : o.paymentTokenUrl,
        folioNumber: o.folioNumber,
        createdAt: o.createdAt,
      })),
    };
  }

  async createCustomBucket(userId: string, dto: CustomBucketDto) {
    const totalAllocation = dto.funds.reduce((sum, fund) => sum + fund.allocation, 0);
    if (totalAllocation !== 100) {
      throw new BadRequestException('Total allocation must equal exactly 100');
    }

    const bucket = await this.prisma.customBucket.create({
      data: {
        userId,
        name: dto.name?.trim() || 'My Custom Bucket',
        funds: dto.funds as unknown as Prisma.InputJsonValue,
      },
    });

    return { id: bucket.id, name: bucket.name, funds: bucket.funds, createdAt: bucket.createdAt };
  }

  async listCustomBuckets(userId: string) {
    const buckets = await this.prisma.customBucket.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
    return buckets.map((b) => ({ id: b.id, name: b.name, funds: b.funds, createdAt: b.createdAt }));
  }
}
