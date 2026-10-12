import { FundsService } from './funds.service';

/**
 * Replaces a `should be defined` stub that could not even construct the service.
 *
 * What is worth locking in here is the 0-NAV filter: MFAPI's dataset includes schemes
 * that stopped reporting years ago with a NAV of 0.00000, and those were being offered
 * as investable funds. The rule is narrow on purpose - only a NAV we successfully read
 * and found to be zero disqualifies a fund. A provider outage must not silently empty
 * the results.
 */
describe('FundsService.searchFunds', () => {
  const makeProvider = (overrides: Partial<Record<string, any>> = {}) =>
    ({
      searchFunds: jest.fn(),
      getLatestNAV: jest.fn(),
      getFundDetails: jest.fn(),
      ...overrides,
    }) as any;

  it('drops schemes whose latest NAV is zero', async () => {
    const provider = makeProvider({
      searchFunds: jest.fn().mockResolvedValue([
        { schemeCode: 1, schemeName: 'Live Fund' },
        { schemeCode: 2, schemeName: 'Dead Fund' },
      ]),
      getLatestNAV: jest.fn(async (code: number) =>
        code === 1 ? { nav: '83.89', date: '28-02-2026' } : { nav: '0.00000', date: '13-04-2007' },
      ),
    });

    const items = await new FundsService(provider).searchFunds('equity');
    expect(items.map((f) => f.schemeCode)).toEqual([1]);
  });

  it('drops schemes with no NAV record at all', async () => {
    const provider = makeProvider({
      searchFunds: jest.fn().mockResolvedValue([{ schemeCode: 3, schemeName: 'No History' }]),
      getLatestNAV: jest.fn().mockResolvedValue(null),
    });
    expect(await new FundsService(provider).searchFunds('equity')).toEqual([]);
  });

  it('KEEPS a fund whose NAV lookup errored, rather than hiding a live fund', async () => {
    // A transient MFAPI outage must not look like a dead fund.
    const provider = makeProvider({
      searchFunds: jest.fn().mockResolvedValue([{ schemeCode: 4, schemeName: 'Unknown NAV' }]),
      getLatestNAV: jest.fn().mockRejectedValue(new Error('MFAPI unavailable')),
    });
    const items = await new FundsService(provider).searchFunds('equity');
    expect(items.map((f) => f.schemeCode)).toEqual([4]);
    expect(items[0].nav).toBeNull();
  });

  it('returns the NAV alongside each result so callers need no second round trip', async () => {
    const provider = makeProvider({
      searchFunds: jest.fn().mockResolvedValue([{ schemeCode: 5, schemeName: 'Axis' }]),
      getLatestNAV: jest.fn().mockResolvedValue({ nav: '34.78', date: '18-09-2026' }),
    });
    const [fund] = await new FundsService(provider).searchFunds('axis');
    expect(fund).toMatchObject({ schemeCode: 5, nav: '34.78', navDate: '18-09-2026' });
  });

  it('caps the page at 20 even when more candidates survive the filter', async () => {
    const many = Array.from({ length: 40 }, (_, i) => ({ schemeCode: i + 1, schemeName: `Fund ${i + 1}` }));
    const provider = makeProvider({
      searchFunds: jest.fn().mockResolvedValue(many),
      getLatestNAV: jest.fn().mockResolvedValue({ nav: '10.00', date: '01-01-2026' }),
    });
    expect((await new FundsService(provider).searchFunds('fund')).length).toBe(20);
  });

  it('looks beyond the first 20 candidates so dead funds do not shrink the page', async () => {
    // 10 dead followed by 25 live: a naive slice(0,20) would return only 10 usable rows.
    const candidates = [
      ...Array.from({ length: 10 }, (_, i) => ({ schemeCode: i + 1, schemeName: `Dead ${i}` })),
      ...Array.from({ length: 25 }, (_, i) => ({ schemeCode: 100 + i, schemeName: `Live ${i}` })),
    ];
    const provider = makeProvider({
      searchFunds: jest.fn().mockResolvedValue(candidates),
      getLatestNAV: jest.fn(async (code: number) =>
        code < 100 ? { nav: '0.00000', date: '13-04-2007' } : { nav: '25.00', date: '01-01-2026' },
      ),
    });
    const items = await new FundsService(provider).searchFunds('fund');
    expect(items.length).toBe(20);
    expect(items.every((f) => Number(f.nav) > 0)).toBe(true);
  });
});
