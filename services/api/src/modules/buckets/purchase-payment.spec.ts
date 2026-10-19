import { BucketsService } from './buckets.service';

/**
 * The payment hand-off - step 3 of Cybrilla's purchase sample, and the step that was
 * missing entirely. A confirmed order is not a funded one: without this call nothing is
 * ever collected, no units are allotted and no folio is created, which is a second and
 * independent reason the sandbox has no folios besides the KYC block.
 */
const svc = BucketsService.prototype as any;

describe('BucketsService.numericOrderId', () => {
  const idOf = (result: unknown) => svc.numericOrderId.call(null, result) as number | null;

  it('reads old_id from the gateway response', () => {
    expect(idOf({ id: 'mfp_911ec1ea', old_id: 71 })).toBe(71);
  });

  it('reads it through a data wrapper', () => {
    expect(idOf({ data: { id: 'mfp_911ec1ea', old_id: 71 } })).toBe(71);
  });

  it('accepts a numeric string, since JSON types vary across these endpoints', () => {
    expect(idOf({ old_id: '71' })).toBe(71);
  });

  it.each([
    ['the mfp_ string id only', { id: 'mfp_911ec1eaf5474165b37a005d6daba81d' }],
    ['a null old_id', { old_id: null }],
    ['a non-numeric old_id', { old_id: 'mfp_911' }],
    ['a fractional id', { old_id: 7.5 }],
    ['nothing at all', {}],
    ['undefined', undefined],
  ])('returns null for %s', (_label, input) => {
    // Never fall back to the mfp_ string: amc_order_ids takes the numeric old_id, and
    // sending the wrong one fails the payment at the gateway.
    expect(idOf(input)).toBeNull();
  });
});

describe('BucketsService.startPayment', () => {
  const makeService = (createPayment: jest.Mock) => ({
    cybrilla: { createPayment },
    logger: { warn: jest.fn(), log: jest.fn() },
    numericOrderId: svc.numericOrderId,
  });

  const run = (orderResult: unknown, bankAccountId: string | null, createPayment = jest.fn()) =>
    svc.startPayment.call(makeService(createPayment), orderResult, bankAccountId);

  it('passes the numeric old_id and bank account to the gateway', async () => {
    const createPayment = jest.fn().mockResolvedValue({ id: 45, token_url: 'https://pay.example/t' });
    const result = await run({ id: 'mfp_1', old_id: 71 }, '33', createPayment);

    expect(createPayment).toHaveBeenCalledWith(
      expect.objectContaining({ amcOrderIds: [71], bankAccountId: 33 }),
    );
    expect(result.token_url).toBe('https://pay.example/t');
  });

  it('does not call the gateway without a numeric order id', async () => {
    const createPayment = jest.fn();
    expect(await run({ id: 'mfp_1' }, '33', createPayment)).toBeNull();
    expect(createPayment).not.toHaveBeenCalled();
  });

  it('does not call the gateway without a bank account', async () => {
    const createPayment = jest.fn();
    expect(await run({ old_id: 71 }, null, createPayment)).toBeNull();
    expect(createPayment).not.toHaveBeenCalled();
  });

  it('refuses a non-numeric bank account id rather than sending it', async () => {
    // The endpoint takes an integer; posting a uuid would fail at the gateway with a
    // far less obvious error than this.
    const createPayment = jest.fn();
    expect(await run({ old_id: 71 }, 'bank_a174108c', createPayment)).toBeNull();
    expect(createPayment).not.toHaveBeenCalled();
  });

  it('swallows a payment failure so the confirmed order is not lost', async () => {
    // The order exists and is confirmed at the gateway by this point. Throwing here
    // would abandon it, leaving a live order our side never recorded.
    const createPayment = jest.fn().mockRejectedValue(new Error('gateway down'));
    await expect(run({ old_id: 71 }, '33', createPayment)).resolves.toBeNull();
  });
});
