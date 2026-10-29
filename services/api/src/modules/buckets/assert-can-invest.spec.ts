import { BucketsService } from './buckets.service';

/**
 * The checks every order passes before its code is consumed. Each one maps to a
 * Cybrilla compliance point: KYC readiness (2), self-declared email and mobile (1, 3),
 * accepted terms (8), and no value assumed on the investor's behalf (11).
 */
const svc = BucketsService.prototype as any;

const firstOrder = {
  amount: 5000,
  gender: 'female',
  occupation: 'professional',
  incomeSlab: 'above_10lakh_upto_25lakh',
  sourceOfWealth: 'salary',
  pepDetails: 'not_applicable',
  placeOfBirth: 'Pune',
  residentIndianDeclaration: true,
  bankAccountHolderName: 'Asha Rao',
  bankAccountNumber: '1234567890',
  ifscCode: 'HDFC0000001',
  accountType: 'savings',
  addressLine1: '1 Test Road',
  postalCode: '411001',
};

const makeCtx = (overrides: { kyc?: object | null; user?: object; terms?: object | null; investor?: object | null } = {}) => ({
  missingAccountDetails: svc.missingAccountDetails,
  prisma: {
    userProfile: { findUnique: async () => ({ pan: 'AAAPL1234C', fullName: 'Asha Rao', dateOfBirth: new Date('1990-01-01') }) },
    kYCApplication: { findUnique: async () => ('kyc' in overrides ? overrides.kyc : { overallStatus: 'VERIFIED' }) },
    user: {
      findUnique: async () => ({ email: 'a@b.c', mobile: '+919999999999', emailBelongsTo: 'self', mobileBelongsTo: 'self', ...overrides.user }),
    },
    consent: { findFirst: async () => ('terms' in overrides ? overrides.terms : { id: 'c1' }) },
    fpInvestorProfile: { findUnique: async () => ('investor' in overrides ? overrides.investor : null) },
  },
});

const check = (ctx: object, dto?: object) => svc.assertCanInvest.call(ctx, 'u1', dto);

describe('BucketsService.assertCanInvest', () => {
  it('lets a first order through when every declaration is present', async () => {
    await expect(check(makeCtx(), firstOrder)).resolves.toMatchObject({ hasAccount: false });
  });

  it('refuses while KYC readiness is still being checked', async () => {
    await expect(check(makeCtx({ kyc: { overallStatus: 'IN_PROGRESS' } }), firstOrder)).rejects.toThrow(/still being verified/);
  });

  it('refuses when KYC is incomplete at the KRA, with the reason', async () => {
    const ctx = makeCtx({ kyc: { overallStatus: 'FAILED', readinessCode: 'kyc_incomplete', failureReason: 'readiness: kyc_incomplete' } });
    await expect(check(ctx, firstOrder)).rejects.toThrow(/incomplete/);
  });

  it('refuses until the terms have been accepted', async () => {
    await expect(check(makeCtx({ terms: null }), firstOrder)).rejects.toThrow(/Terms and Conditions/);
  });

  it.each([
    ['email', { emailBelongsTo: null }],
    ['mobile', { mobileBelongsTo: null }],
  ])('refuses until whose %s it is has been declared', async (_label, user) => {
    await expect(check(makeCtx({ user }), firstOrder)).rejects.toThrow(/Declare whose email address and mobile number/);
  });

  it('names every missing detail when a first order lacks them, rather than filling them in', async () => {
    const { occupation, pepDetails, accountType, ...partial } = firstOrder;
    await expect(check(makeCtx(), partial)).rejects.toThrow(
      'To open your investment account we still need: occupation, politically exposed person declaration, bank account type.',
    );
  });

  it('requires the residency declaration itself, not just its absence of a no', async () => {
    await expect(check(makeCtx(), { ...firstOrder, residentIndianDeclaration: undefined })).rejects.toThrow(/Indian citizen/);
  });

  it('does not ask a returning investor for account details again', async () => {
    const ctx = makeCtx({ investor: { mfAccounts: [{ id: 'acct1' }] } });
    await expect(check(ctx, { amount: 5000 })).resolves.toMatchObject({ hasAccount: true });
  });
});
