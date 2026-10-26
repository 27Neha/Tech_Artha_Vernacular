import { BadRequestException } from '@nestjs/common';
import { BucketsService } from './buckets.service';
import { assessSuitability, fundRiskLevel } from './fund-suitability';

/**
 * Investing in a single fund: which ISIN is bought, which funds are refused outright, and
 * when the investor has to acknowledge that a fund is riskier than their profile.
 */
const svc = BucketsService.prototype as any;

const navDate = (daysAgo: number) => {
  const d = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
};

const mfapiFund = (meta: Record<string, unknown>, daysAgo = 1) => ({
  meta: { scheme_name: 'Axis ELSS Tax Saver Fund - Direct Plan - Growth', scheme_category: 'Equity Scheme - ELSS', isin_growth: 'INF846K01EW2', ...meta },
  data: [{ date: navDate(daysAgo), nav: '100.0' }],
});

describe('fundRiskLevel', () => {
  // Categories exactly as MFAPI reports them.
  it.each([
    ['Debt Scheme - Liquid Fund', 'CONSERVATIVE'],
    ['Debt Scheme - Overnight Fund', 'CONSERVATIVE'],
    ['Hybrid Scheme - Arbitrage Fund', 'CONSERVATIVE'],
    ['Income/Debt Oriented Schemes - Banking and PSU Debt Fund', 'MODERATELY_LOW'],
    ['Debt Scheme - Gilt Fund', 'MODERATELY_LOW'],
    ['Hybrid Scheme - Conservative Hybrid Fund', 'MODERATELY_LOW'],
    ['Debt Scheme - Credit Risk Fund', 'MODERATE'],
    ['Hybrid Scheme - Balanced Advantage', 'MODERATE'],
    ['Hybrid Scheme - Aggressive Hybrid Fund', 'MODERATELY_HIGH'],
    ['Equity Scheme - Large Cap Fund', 'MODERATELY_HIGH'],
    ['Equity Schemes - ELSS- Tax Saver Fund', 'MODERATELY_HIGH'],
    ['Other Scheme - Index Funds', 'MODERATELY_HIGH'],
    ['Equity Scheme - Mid Cap Fund', 'AGGRESSIVE'],
    ['Equity Schemes - Small Cap Fund', 'AGGRESSIVE'],
    ['Equity Scheme - Sectoral/ Thematic', 'AGGRESSIVE'],
    ['Other Scheme - FoF Overseas', 'AGGRESSIVE'],
  ])('rates %s as %s', (category, level) => {
    expect(fundRiskLevel(category)).toBe(level);
  });

  it('treats a category it does not recognise as the riskiest, so it always asks', () => {
    expect(fundRiskLevel('Something New')).toBe('AGGRESSIVE');
    expect(fundRiskLevel(null)).toBe('AGGRESSIVE');
  });
});

describe('assessSuitability', () => {
  it('needs no acknowledgement for a fund at or below the profile', () => {
    expect(assessSuitability('Debt Scheme - Liquid Fund', 'MODERATE').requiresAcknowledgement).toBe(false);
    expect(assessSuitability('Hybrid Scheme - Balanced Advantage', 'MODERATE').requiresAcknowledgement).toBe(false);
  });

  it('needs acknowledgement for a fund above the profile', () => {
    expect(assessSuitability('Equity Schemes - Small Cap Fund', 'MODERATE').requiresAcknowledgement).toBe(true);
    expect(assessSuitability('Equity Scheme - Large Cap Fund', 'CONSERVATIVE').requiresAcknowledgement).toBe(true);
  });

  it('lets an aggressive investor buy anything without acknowledgement', () => {
    expect(assessSuitability('Equity Schemes - Small Cap Fund', 'AGGRESSIVE').requiresAcknowledgement).toBe(false);
  });

  it('treats an unknown profile as the most cautious', () => {
    expect(assessSuitability('Debt Scheme - Gilt Fund', 'SOMETHING_ELSE').requiresAcknowledgement).toBe(true);
  });
});

describe('BucketsService.resolveFund', () => {
  const resolve = (fund: unknown, code = '120503') =>
    svc.resolveFund.call({ fundsService: { getFundDetails: async () => fund } }, code);

  it('buys the growth ISIN MFAPI reports for the scheme code', async () => {
    await expect(resolve(mfapiFund({}))).resolves.toMatchObject({
      isin: 'INF846K01EW2',
      gateway: 'cybrillapoa',
      schemeCode: '120503',
      category: 'Equity Scheme - ELSS',
    });
  });

  it.each([
    ['a non-numeric scheme code', mfapiFund({}), 'INF846K01EW2', /Unknown fund/],
    ['a scheme MFAPI has no record of', { meta: {}, data: [] }, '1', /Unknown fund/],
    ['a scheme with no growth ISIN', mfapiFund({ isin_growth: null }), '1', /no growth option/],
    ['a scheme that stopped reporting NAVs', mfapiFund({}, 120), '1', /not reported a NAV recently/],
  ])('refuses %s', async (_label, fund, code, message) => {
    await expect(resolve(fund, code)).rejects.toThrow(message);
  });
});

describe('BucketsService.investInFund', () => {
  const fund = { isin: 'INF179K01XQ0', gateway: 'cybrillapoa', fundName: 'HDFC Mid Cap', category: 'Equity Scheme - Mid Cap Fund', schemeCode: '118989' };

  const makeCtx = (profile: string) => ({
    resolveFund: async () => fund,
    checkSuitability: svc.checkSuitability,
    prisma: { riskProfile: { findUnique: async () => ({ category: profile }) } },
    twoFactor: { verifyAndConsume: jest.fn().mockResolvedValue(true) },
    placePurchase: jest.fn().mockResolvedValue({ orderId: 'o1' }),
  });

  it('refuses a riskier fund without acknowledgement, before the code is consumed', async () => {
    const ctx = makeCtx('MODERATE');
    await expect(svc.investInFund.call(ctx, 'u1', '118989', { amount: 500 })).rejects.toThrow(BadRequestException);
    expect(ctx.twoFactor.verifyAndConsume).not.toHaveBeenCalled();
  });

  it('places the order once acknowledged, and records that it was', async () => {
    const ctx = makeCtx('MODERATE');
    await svc.investInFund.call(ctx, 'u1', '118989', { amount: 500, acknowledgeRiskMismatch: true, challengeId: 'c', otp: '1' });
    expect(ctx.twoFactor.verifyAndConsume).toHaveBeenCalledWith(
      'u1',
      { action: 'PURCHASE', amount: 500, schemeIsin: 'INF179K01XQ0' },
      'c',
      '1',
    );
    expect(ctx.placePurchase).toHaveBeenCalledWith('u1', fund, expect.anything(), { schemeCode: '118989', riskAcknowledged: true });
  });

  it('needs no acknowledgement when the fund suits the profile', async () => {
    const ctx = makeCtx('AGGRESSIVE');
    await svc.investInFund.call(ctx, 'u1', '118989', { amount: 500 });
    expect(ctx.placePurchase).toHaveBeenCalledWith('u1', fund, expect.anything(), { schemeCode: '118989', riskAcknowledged: false });
  });

  it('refuses an investor who has not taken the risk assessment', async () => {
    const ctx = { ...makeCtx('X'), prisma: { riskProfile: { findUnique: async () => null } } };
    await expect(svc.investInFund.call(ctx, 'u1', '118989', { amount: 500, acknowledgeRiskMismatch: true })).rejects.toThrow(
      /risk assessment/,
    );
  });
});

describe('BucketsService.fundEligibility', () => {
  const run = (resolveFund: () => Promise<unknown>, profile: string | null) =>
    svc.fundEligibility.call(
      { resolveFund, prisma: { riskProfile: { findUnique: async () => (profile ? { category: profile } : null) } } },
      'u1',
      '118989',
    );

  it('answers rather than throws for a fund that cannot be bought', async () => {
    const result = await run(async () => {
      throw new BadRequestException('This fund has no growth option, so it cannot be bought through the app.');
    }, 'MODERATE');
    expect(result).toEqual({ investable: false, reason: expect.stringContaining('no growth option'), schemeCode: '118989' });
  });

  it('returns the ISIN the app needs for the 2FA challenge and the mismatch flag', async () => {
    const result = await run(async () => ({ isin: 'INF179K01XQ0', fundName: 'HDFC Mid Cap', category: 'Equity Scheme - Mid Cap Fund' }), 'MODERATE');
    expect(result).toMatchObject({ investable: true, schemeIsin: 'INF179K01XQ0', fundRiskLevel: 'AGGRESSIVE', requiresAcknowledgement: true });
  });

  it('is not investable before the risk assessment', async () => {
    const result = await run(async () => ({ isin: 'X', fundName: 'F', category: 'Debt Scheme - Liquid Fund' }), null);
    expect(result).toMatchObject({ investable: false, reason: expect.stringContaining('risk assessment') });
  });
});
