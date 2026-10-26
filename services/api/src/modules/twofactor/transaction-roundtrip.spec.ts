import { UnauthorizedException } from '@nestjs/common';
import { TwoFactorService } from './twofactor.service';
import type { TransactionPayload } from './twofactor.service';
import { BucketsService } from '../buckets/buckets.service';
import { RedemptionService } from '../redemption/redemption.service';

/**
 * The round trip the mobile app actually makes: request a code with one payload, then
 * send the transaction with the same figures. The fingerprint is computed by the
 * challenge endpoint from what the app sends, and by the transaction service from what
 * it chooses to check, so the two sides must agree or every transaction is refused.
 *
 * The payloads below mirror InvestScreen and RedeemScreen exactly. Anything past the
 * authorisation step is stubbed to throw REACHED, which proves the code was accepted.
 */
const REACHED = 'REACHED';

const makeTwoFactor = () => {
  const rows: any[] = [];
  const prisma = {
    user: { findUnique: async () => ({ id: 'u1', mobile: '9999999999', email: 'a@b.c' }) },
    auditLog: { create: jest.fn(async () => ({})) },
    transactionChallenge: {
      count: async () => 0,
      updateMany: async ({ where, data }: any) => {
        rows.filter((r) => r.userId === where.userId && r.status === where.status).forEach((r) => Object.assign(r, data));
      },
      create: async ({ data }: any) => {
        const row = { id: `c${rows.length + 1}`, attempts: 0, ...data };
        rows.push(row);
        return row;
      },
      findFirst: async ({ where }: any) => rows.find((r) => r.id === where.id && r.userId === where.userId) ?? null,
      update: async ({ where, data }: any) => {
        const row = rows.find((r) => r.id === where.id);
        if (data.attempts?.increment) row.attempts += data.attempts.increment;
        else Object.assign(row, data);
        return row;
      },
    },
  };
  return { twoFactor: new TwoFactorService(prisma as never, null as never), rows };
};

const env = { ...process.env };
beforeAll(() => {
  process.env.OTP_PROVIDER = 'mock';
  process.env.AUTH_DEV_BYPASS = 'true';
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
});
afterAll(() => {
  process.env = env;
  jest.restoreAllMocks();
});

/** Issues a code exactly as POST /transactions/2fa/challenge would. */
const issue = async (twoFactor: TwoFactorService, payload: TransactionPayload) => {
  const { challengeId, devOtp } = await twoFactor.challenge('u1', payload);
  return { challengeId, otp: devOtp as string };
};

describe('purchase round trip', () => {
  const run = async (authorised: TransactionPayload, sentAmount: number) => {
    const { twoFactor } = makeTwoFactor();
    const auth = await issue(twoFactor, authorised);
    const ctx = {
      twoFactor,
      bucketScheme: async () => ({ isin: 'INF109K01605', gateway: 'cybrillapoa', fundName: 'Test' }),
      placePurchase: jest.fn().mockRejectedValue(new Error(REACHED)),
      registerSip: jest.fn().mockRejectedValue(new Error(REACHED)),
    };
    return BucketsService.prototype.invest.call(ctx, 'u1', 'balanced', { amount: sentAmount, ...auth } as any);
  };

  it('accepts the payload InvestScreen authorises for a lumpsum', async () => {
    await expect(run({ action: 'PURCHASE', amount: 500, bucketId: 'balanced' }, 500)).rejects.toThrow(REACHED);
  });

  it('refuses when the amount sent differs from the amount authorised', async () => {
    await expect(run({ action: 'PURCHASE', amount: 500, bucketId: 'balanced' }, 50000)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('refuses a code authorised for a different bucket', async () => {
    await expect(run({ action: 'PURCHASE', amount: 500, bucketId: 'growth' }, 500)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});

describe('SIP round trip', () => {
  const sipPayload: TransactionPayload = {
    action: 'SIP',
    amount: 1000,
    bucketId: 'balanced',
    frequency: 'monthly',
    numberOfInstallments: 12,
  };

  const run = async (authorised: TransactionPayload, sent: Record<string, unknown>) => {
    const { twoFactor } = makeTwoFactor();
    const auth = await issue(twoFactor, authorised);
    const ctx = {
      twoFactor,
      bucketScheme: async () => ({ isin: 'INF109K01605', gateway: 'cybrillapoa', fundName: 'Test' }),
      placePurchase: jest.fn().mockRejectedValue(new Error(REACHED)),
      registerSip: jest.fn().mockRejectedValue(new Error(REACHED)),
    };
    return BucketsService.prototype.startSip.call(ctx, 'u1', 'balanced', {
      amount: 1000,
      frequency: 'monthly',
      installmentDay: 5,
      numberOfInstallments: 12,
      ...sent,
      ...auth,
    } as any);
  };

  it('accepts the payload InvestScreen authorises for a SIP', async () => {
    await expect(run(sipPayload, {})).rejects.toThrow(REACHED);
  });

  it('refuses a changed instalment count', async () => {
    await expect(run(sipPayload, { numberOfInstallments: 24 })).rejects.toThrow(UnauthorizedException);
  });

  it('refuses a purchase code used for a SIP', async () => {
    await expect(run({ ...sipPayload, action: 'PURCHASE' }, {})).rejects.toThrow(UnauthorizedException);
  });
});

describe('redemption round trip', () => {
  const folios = [{ folio_number: 'F12345678', scheme: 'INF109K01605', redeemable_units: 12.345 }];
  const base = { folioNumber: 'F12345678', schemeIsin: 'INF109K01605' };

  const run = async (authorised: TransactionPayload, sent: Record<string, unknown>) => {
    const { twoFactor } = makeTwoFactor();
    const auth = await issue(twoFactor, authorised);
    const ctx = {
      twoFactor,
      cybrilla: { fetchFolios: async () => folios },
      accountFor: async () => ({ id: 'a1', fpAccountId: 'mfia_1' }),
      resolveQuantity: (RedemptionService.prototype as any).resolveQuantity,
      prisma: {
        user: { findUnique: async () => ({ email: 'a@b.c' }) },
        fpRedemptionOrder: { create: jest.fn().mockRejectedValue(new Error(REACHED)) },
      },
    };
    // RedeemScreen posts { ...payload, ...auth }; the pipe strips `action`.
    return RedemptionService.prototype.create.call(ctx, 'u1', { ...sent, ...auth } as any, '127.0.0.1');
  };

  it.each([
    ['by amount', { ...base, amount: 500 }],
    ['by units', { ...base, units: 2.5 }],
    ['full exit', { ...base, fullExit: true }],
  ])('accepts the payload RedeemScreen authorises %s', async (_label, fields) => {
    await expect(run({ action: 'REDEMPTION', ...fields }, fields)).rejects.toThrow(REACHED);
  });

  it('refuses a code authorised for a different folio', async () => {
    await expect(
      run({ action: 'REDEMPTION', ...base, folioNumber: 'F99999999', amount: 500 }, { ...base, amount: 500 }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('refuses a partial-withdrawal code used for a full exit', async () => {
    await expect(run({ action: 'REDEMPTION', ...base, amount: 500 }, { ...base, fullExit: true })).rejects.toThrow(
      UnauthorizedException,
    );
  });
});

describe('single use', () => {
  it('refuses the same code a second time', async () => {
    const { twoFactor } = makeTwoFactor();
    const payload: TransactionPayload = { action: 'PURCHASE', amount: 500, bucketId: 'balanced' };
    const { challengeId, otp } = await issue(twoFactor, payload);
    await expect(twoFactor.verifyAndConsume('u1', payload, challengeId, otp)).resolves.toBe(true);
    await expect(twoFactor.verifyAndConsume('u1', payload, challengeId, otp)).rejects.toThrow(/already been used/);
  });
});

describe('single-fund round trip', () => {
  // The app gets schemeIsin from GET /funds/:code/invest-eligibility and passes it to the
  // challenge; the server resolves the same ISIN from the scheme code.
  const fund = { isin: 'INF179K01XQ0', gateway: 'cybrillapoa', fundName: 'HDFC Mid Cap', category: 'Equity Scheme - Mid Cap Fund', schemeCode: '118989' };

  const ctxFor = (twoFactor: TwoFactorService) => ({
    twoFactor,
    resolveFund: async () => fund,
    checkSuitability: async () => ({ requiresAcknowledgement: false }),
    placePurchase: jest.fn().mockRejectedValue(new Error(REACHED)),
    registerSip: jest.fn().mockRejectedValue(new Error(REACHED)),
  });

  it('accepts the purchase payload InvestScreen authorises for a fund', async () => {
    const { twoFactor } = makeTwoFactor();
    const auth = await issue(twoFactor, { action: 'PURCHASE', amount: 500, schemeIsin: fund.isin });
    await expect(
      BucketsService.prototype.investInFund.call(ctxFor(twoFactor), 'u1', '118989', { amount: 500, ...auth } as any),
    ).rejects.toThrow(REACHED);
  });

  it('accepts the SIP payload InvestScreen authorises for a fund', async () => {
    const { twoFactor } = makeTwoFactor();
    const auth = await issue(twoFactor, { action: 'SIP', amount: 1000, schemeIsin: fund.isin, frequency: 'monthly', numberOfInstallments: 12 });
    await expect(
      BucketsService.prototype.startFundSip.call(ctxFor(twoFactor), 'u1', '118989', {
        amount: 1000,
        frequency: 'monthly',
        installmentDay: 5,
        numberOfInstallments: 12,
        ...auth,
      } as any),
    ).rejects.toThrow(REACHED);
  });

  it('refuses a code issued for a different fund', async () => {
    const { twoFactor } = makeTwoFactor();
    const auth = await issue(twoFactor, { action: 'PURCHASE', amount: 500, schemeIsin: 'INF109K01605' });
    await expect(
      BucketsService.prototype.investInFund.call(ctxFor(twoFactor), 'u1', '118989', { amount: 500, ...auth } as any),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('refuses a bucket code used for a single fund', async () => {
    const { twoFactor } = makeTwoFactor();
    const auth = await issue(twoFactor, { action: 'PURCHASE', amount: 500, bucketId: 'balanced' });
    await expect(
      BucketsService.prototype.investInFund.call(ctxFor(twoFactor), 'u1', '118989', { amount: 500, ...auth } as any),
    ).rejects.toThrow(UnauthorizedException);
  });
});
