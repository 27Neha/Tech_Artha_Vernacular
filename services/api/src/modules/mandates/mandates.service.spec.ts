import { MandatesService } from './mandates.service';

/**
 * Auto-debit mandates. A SIP needs an APPROVED one before the gateway will confirm the
 * plan, and its type and limit are the investor's own choice.
 */
const account = { id: 'a1', fpAccountId: 'mfia_1', bankAccountId: 'bac_1', bankAccountOldId: 182 };

const makeCtx = (rows: any[] = [], remoteStatus: Record<number, string> = {}, hasAccount = true) => {
  const cybrilla = {
    createMandate: jest.fn(async () => ({ id: 901 })),
    authorizeMandate: jest.fn(async () => ({ id: 1, token_url: 'https://auth.example/m' })),
    fetchMandate: jest.fn(async (id: number) => ({ mandate_status: remoteStatus[id] ?? 'CREATED', umrn: null })),
    fetchBankAccount: jest.fn(),
  };
  const prisma = {
    fpInvestorProfile: { findUnique: async () => (hasAccount ? { mfAccounts: [account] } : null) },
    fpMandate: {
      findMany: async () => rows,
      findFirst: async ({ where }: any) => rows.find((r) => r.id === where.id) ?? null,
      create: jest.fn(async ({ data }: any) => ({ id: 'm_new', createdAt: new Date(), umrn: null, ...data })),
      update: jest.fn(async ({ where, data }: any) => ({ ...rows.find((r) => r.id === where.id), ...data })),
    },
    fpMfInvestmentAccount: { update: jest.fn() },
    auditLog: { create: jest.fn() },
  };
  const ctx = Object.assign(Object.create(MandatesService.prototype), { cybrilla, prisma, logger: { warn: jest.fn() } });
  return { ctx, cybrilla, prisma };
};

const row = (over: Record<string, unknown>) => ({
  id: 'm1', fpMandateId: 501, mandateType: 'UPI', mandateLimit: 5000, status: 'CREATED', umrn: null, authorizationUrl: 'u', createdAt: new Date(), ...over,
});

describe('MandatesService.create', () => {
  it('creates the mandate on the bank account and returns its authorisation page', async () => {
    const { ctx, cybrilla } = makeCtx();
    const result = await ctx.create('u1', { mandateType: 'UPI', mandateLimit: 10000 });
    expect(cybrilla.createMandate).toHaveBeenCalledWith({ bankAccountId: 182, mandateType: 'UPI', mandateLimit: 10000 });
    expect(cybrilla.authorizeMandate).toHaveBeenCalledWith(901, expect.any(String));
    expect(result).toMatchObject({ mandateType: 'UPI', mandateLimit: 10000, authorizationUrl: 'https://auth.example/m' });
  });

  it.each([
    ['no type chosen', {}],
    ['an unknown type', { mandateType: 'CHEQUE', mandateLimit: 5000 }],
    ['no limit', { mandateType: 'UPI' }],
    ['a limit below ₹100', { mandateType: 'E_MANDATE', mandateLimit: 50 }],
  ])('refuses %s rather than assuming one', async (_label, input) => {
    const { ctx, cybrilla } = makeCtx();
    await expect(ctx.create('u1', input)).rejects.toThrow();
    expect(cybrilla.createMandate).not.toHaveBeenCalled();
  });

  it('needs an investment account, since the mandate debits its bank account', async () => {
    const { ctx } = makeCtx([], {}, false);
    await expect(ctx.create('u1', { mandateType: 'UPI', mandateLimit: 5000 })).rejects.toThrow(/first investment/);
  });
});

describe('MandatesService.approvedFor', () => {
  it('finds a mandate the bank has since approved, refreshing it from the gateway', async () => {
    const { ctx, prisma } = makeCtx([row({})], { 501: 'APPROVED' });
    await expect(ctx.approvedFor('u1', 1000)).resolves.toMatchObject({ id: 'm1', status: 'APPROVED' });
    expect(prisma.fpMandate.update).toHaveBeenCalledWith({ where: { id: 'm1' }, data: { status: 'APPROVED', umrn: null } });
  });

  it('ignores a mandate whose limit is below the SIP amount', async () => {
    const { ctx } = makeCtx([row({ status: 'APPROVED', mandateLimit: 500 })]);
    await expect(ctx.approvedFor('u1', 1000)).resolves.toBeNull();
  });

  it('ignores a mandate the investor has not finished approving', async () => {
    const { ctx } = makeCtx([row({})], { 501: 'SUBMITTED' });
    await expect(ctx.approvedFor('u1', 1000)).resolves.toBeNull();
  });
});
