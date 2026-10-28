import { NomineeService } from './nominee.service';

/**
 * Registering the nomination with the gateway - Cybrilla compliance point 4. Each
 * nominee becomes a related_party, and folio_defaults references those ids.
 */
const adult = (over: Record<string, unknown> = {}) => ({
  id: 'n1',
  fullName: 'Asha Rao',
  relationship: 'spouse',
  dateOfBirth: new Date('1988-04-02T00:00:00Z'),
  allocationPercentage: 60,
  identityProofType: 'pan',
  identityProofNumber: 'AAAPL1234C',
  guardianName: null,
  fpNomineeRef: null,
  ...over,
});

const makeCtx = (nominees: any[], account: object | null = { fpAccountId: 'mfia_1' }) => {
  const cybrilla = {
    createRelatedParty: jest.fn(async (body: any) => ({ id: `rp_${body.name.split(' ')[0]}` })),
    updateFolioDefaults: jest.fn(async (_id: string, _changes: Record<string, unknown>) => ({})),
  };
  const prisma = {
    nominee: { findMany: async () => nominees, update: jest.fn(), updateMany: jest.fn() },
    fpInvestorProfile: { findUnique: async () => (account ? { fpProfileId: 'invp_1', mfAccounts: [account] } : null) },
    auditLog: { create: jest.fn() },
  };
  const ctx = Object.assign(Object.create(NomineeService.prototype), { cybrilla, prisma, logger: { warn: jest.fn() } });
  return { ctx, cybrilla, prisma };
};

describe('NomineeService.syncToGateway', () => {
  it('creates a related party per nominee and references them in folio_defaults', async () => {
    const { ctx, cybrilla } = makeCtx([
      adult(),
      adult({ id: 'n2', fullName: 'Ravi Rao', relationship: 'grandson', allocationPercentage: 40, identityProofType: 'aadhaar', identityProofNumber: '9012' }),
    ]);
    await expect(ctx.syncToGateway('u1')).resolves.toEqual({ status: 'SYNCED' });

    expect(cybrilla.createRelatedParty).toHaveBeenNthCalledWith(1, expect.objectContaining({ profile: 'invp_1', name: 'Asha Rao', relationship: 'spouse', pan: 'AAAPL1234C' }));
    // Our values are mapped onto the gateway's enum, and Aadhaar goes as its last four digits.
    expect(cybrilla.createRelatedParty).toHaveBeenNthCalledWith(2, expect.objectContaining({ relationship: 'grand_son', aadhaar_number: '9012' }));
    expect(cybrilla.updateFolioDefaults).toHaveBeenCalledWith('mfia_1', {
      nominee1: 'rp_Asha',
      nominee1_allocation_percentage: 60,
      nominee1_identity_proof_type: 'pan',
      nominee2: 'rp_Ravi',
      nominee2_allocation_percentage: 40,
      nominee2_identity_proof_type: 'aadhaar',
      nominee3: null,
      nominee3_allocation_percentage: null,
    });
  });

  it('identifies a minor nominee through the guardian, not an identity proof', async () => {
    const minor = adult({ dateOfBirth: new Date(Date.now() - 5 * 365 * 24 * 3600 * 1000), allocationPercentage: 100, identityProofType: null, identityProofNumber: null, guardianName: 'Meera Rao' });
    const { ctx, cybrilla } = makeCtx([minor]);
    await ctx.syncToGateway('u1');
    expect(cybrilla.createRelatedParty).toHaveBeenCalledWith(expect.objectContaining({ guardian_name: 'Meera Rao' }));
    expect(cybrilla.updateFolioDefaults.mock.calls[0][1]).not.toHaveProperty('nominee1_identity_proof_type');
  });

  it('waits while the nomination does not total 100%', async () => {
    const { ctx, cybrilla } = makeCtx([adult()]);
    await expect(ctx.syncToGateway('u1')).resolves.toEqual({ status: 'PENDING' });
    expect(cybrilla.createRelatedParty).not.toHaveBeenCalled();
  });

  it('waits until there is an investment account to register it on', async () => {
    const { ctx } = makeCtx([adult({ allocationPercentage: 100 })], null);
    await expect(ctx.syncToGateway('u1')).resolves.toEqual({ status: 'PENDING' });
  });

  it('reuses a related party already registered for an unchanged nominee', async () => {
    const { ctx, cybrilla } = makeCtx([adult({ allocationPercentage: 100, fpNomineeRef: 'rp_existing' })]);
    await ctx.syncToGateway('u1');
    expect(cybrilla.createRelatedParty).not.toHaveBeenCalled();
    expect(cybrilla.updateFolioDefaults.mock.calls[0][1]).toMatchObject({ nominee1: 'rp_existing' });
  });

  it('records a gateway refusal on the rows instead of failing the edit', async () => {
    const { ctx, cybrilla, prisma } = makeCtx([adult({ allocationPercentage: 100 })]);
    cybrilla.updateFolioDefaults.mockRejectedValueOnce(new Error('nominee1_identity_proof_type is invalid.'));
    await expect(ctx.syncToGateway('u1')).resolves.toEqual({ status: 'FAILED', message: 'nominee1_identity_proof_type is invalid.' });
    expect(prisma.nominee.updateMany).toHaveBeenCalledWith({ where: { userId: 'u1' }, data: { fpSyncStatus: 'FAILED', fpSyncError: 'nominee1_identity_proof_type is invalid.' } });
  });
});
