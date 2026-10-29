import { HoldingsService } from './holdings.service';

/**
 * Holdings are shown on the portfolio and redemption screens straight from Cybrilla's
 * holdings report (compliance points 9 and 10). These pin the mapping from the
 * report's documented shape, and that nothing is filled in when a figure is missing.
 */
const report = {
  id: 7,
  folios: [
    {
      folio_number: '12345678',
      schemes: [
        {
          isin: 'INF109KC1TY0',
          name: 'ICICI Prudential Retirement Fund Hybrid Conservative Plan',
          type: 'equity',
          holdings: { as_on: '2026-10-26', units: 120.5, redeemable_units: 100.25 },
          market_value: { as_on: '2026-10-26', amount: 6025.0, redeemable_amount: 5012.5 },
          invested_value: { as_on: '2026-10-26', amount: 5000 },
          payout: { as_on: '2026-10-26', amount: 0 },
          nav: { as_on: '2026-10-25', value: 50.0 },
        },
        {
          isin: 'INF109K01605',
          name: "ICICI Prudential Children's Fund",
          holdings: { as_on: '2026-10-26', units: 10, redeemable_units: 10 },
          market_value: { as_on: '2026-10-26', amount: 1100, redeemable_amount: 1100 },
          invested_value: { as_on: '2026-10-26', amount: 1000 },
          nav: { as_on: '2026-10-25', value: 110 },
        },
      ],
    },
  ],
};

describe('HoldingsService.normalise', () => {
  it('gives one row per folio and scheme, with folio, scheme name and units', () => {
    const rows = HoldingsService.normalise(report);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      folioNumber: '12345678',
      schemeIsin: 'INF109KC1TY0',
      schemeName: 'ICICI Prudential Retirement Fund Hybrid Conservative Plan',
      units: 120.5,
      redeemableUnits: 100.25,
      nav: 50,
      navDate: '2026-10-25',
      marketValue: 6025,
      redeemableValue: 5012.5,
      investedValue: 5000,
      asOn: '2026-10-26',
    });
  });

  it('reads an empty report as no holdings', () => {
    expect(HoldingsService.normalise({ id: 7, folios: [] })).toEqual([]);
    expect(HoldingsService.normalise(undefined)).toEqual([]);
  });

  it('leaves a missing NAV or value as null rather than zero', () => {
    const [row] = HoldingsService.normalise({ folios: [{ folio_number: 'F1', schemes: [{ isin: 'X', holdings: { units: 5, redeemable_units: 5 } }] }] });
    expect(row).toMatchObject({ units: 5, nav: null, marketValue: null, investedValue: null });
  });
});

describe('HoldingsService.totals', () => {
  it('sums invested and current value, and gives the gain', () => {
    expect(HoldingsService.totals(HoldingsService.normalise(report))).toEqual({ invested: 6000, current: 7125, gain: 1125 });
  });

  it('gives no total when any holding lacks the figure, instead of a partial sum', () => {
    const rows = HoldingsService.normalise(report);
    rows[1].marketValue = null;
    expect(HoldingsService.totals(rows)).toEqual({ invested: 6000, current: null, gain: null });
  });
});
