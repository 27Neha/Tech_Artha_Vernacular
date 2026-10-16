import { BadRequestException } from '@nestjs/common';
import { RedemptionService } from './redemption.service';

/**
 * The decisions a redemption gets wrong expensively: how much to sell, and whether an
 * empty holdings list means "you hold nothing" or "we could not find out".
 */
describe('RedemptionService.resolveQuantity', () => {
  const svc = RedemptionService.prototype as any;

  const resolve = (dto: Record<string, unknown>, folios: unknown[] | null = []) =>
    svc.resolveQuantity.call({ cybrilla: { fetchFolios: async () => folios } }, 'mfia_1', dto);

  it('passes an amount straight through', async () => {
    await expect(resolve({ amount: 500 })).resolves.toEqual({ amount: 500, units: undefined });
  });

  it('passes units straight through', async () => {
    await expect(resolve({ units: 2.5 })).resolves.toEqual({ amount: undefined, units: 2.5 });
  });

  it.each([
    ['amount and units', { amount: 500, units: 2 }],
    ['amount and fullExit', { amount: 500, fullExit: true }],
    ['units and fullExit', { units: 2, fullExit: true }],
    ['all three', { amount: 500, units: 2, fullExit: true }],
    ['nothing at all', {}],
  ])('refuses %s', async (_label, dto) => {
    await expect(resolve(dto)).rejects.toThrow(BadRequestException);
  });

  it('resolves a full exit to the live folio balance, not a client-supplied number', async () => {
    // The investor says "sell everything"; the quantity comes from the gateway, so the
    // order cannot overshoot the balance and be rejected.
    const folios = [{ folio_number: 'F1', scheme: 'INF109K01605', redeemable_units: 12.345 }];
    await expect(resolve({ fullExit: true, folioNumber: 'F1', schemeIsin: 'INF109K01605' }, folios)).resolves.toEqual({
      amount: undefined,
      units: 12.345,
    });
  });

  it('matches on folio AND scheme, since one folio can hold several schemes', async () => {
    const folios = [{ folio_number: 'F1', scheme: 'OTHER_ISIN', redeemable_units: 10 }];
    await expect(
      resolve({ fullExit: true, folioNumber: 'F1', schemeIsin: 'INF109K01605' }, folios),
    ).rejects.toThrow(/no units available/);
  });

  it('refuses a full exit on a zero balance', async () => {
    const folios = [{ folio_number: 'F1', scheme: 'INF109K01605', redeemable_units: 0 }];
    await expect(
      resolve({ fullExit: true, folioNumber: 'F1', schemeIsin: 'INF109K01605' }, folios),
    ).rejects.toThrow(/no units available/);
  });

  it('does not treat an unreadable holdings call as an empty holding', async () => {
    // null means the fetch failed. Selling "all units" of an unknown balance, or telling
    // the investor they hold nothing, would both be wrong.
    await expect(
      resolve({ fullExit: true, folioNumber: 'F1', schemeIsin: 'INF109K01605' }, null),
    ).rejects.toThrow(/could not read your holdings/);
  });
});

describe('RedemptionService.mapState', () => {
  const map = (state: string) => (RedemptionService.prototype as any).mapState.call(null, state) as string;

  it.each([
    ['succeeded', 'CONFIRMED'],
    ['SUCCESS', 'CONFIRMED'],
    ['confirmed', 'CONFIRMED'],
    ['failed', 'FAILED'],
    ['REJECTED', 'FAILED'],
    ['reversed', 'FAILED'],
    ['under_review', 'PENDING'],
    ['', 'PENDING'],
  ])('maps %s to %s', (state, expected) => {
    expect(map(state)).toBe(expected);
  });

  it('treats an unrecognised state as pending rather than confirmed', () => {
    // Guessing CONFIRMED would tell an investor their money is on the way when the
    // gateway has said something we do not understand.
    expect(map('some_new_gateway_state')).toBe('PENDING');
  });
});
