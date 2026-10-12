import { autoBalance, DraftFund } from '../customBucket';

/**
 * The API rejects a custom bucket whose allocations do not total exactly 100, so
 * autoBalance has to hit 100 for ANY number of funds - including counts that do not
 * divide evenly, which is where naive even-splitting silently produces 99 or 102.
 */
const funds = (n: number): DraftFund[] =>
  Array.from({ length: n }, (_, i) => ({ schemeCode: i + 1, name: `Fund ${i + 1}`, allocation: 0 }));

describe('autoBalance', () => {
  it.each([1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 13, 17, 23])(
    'totals exactly 100 for %i funds',
    (count) => {
      const total = autoBalance(funds(count)).reduce((sum, f) => sum + f.allocation, 0);
      expect(total).toBe(100);
    },
  );

  it('splits evenly when the count divides 100', () => {
    expect(autoBalance(funds(4)).map((f) => f.allocation)).toEqual([25, 25, 25, 25]);
    expect(autoBalance(funds(5)).map((f) => f.allocation)).toEqual([20, 20, 20, 20, 20]);
  });

  it('gives the remainder to the earliest funds when it does not divide evenly', () => {
    // 3 funds: 34 + 33 + 33 = 100, not 33 + 33 + 33 = 99.
    expect(autoBalance(funds(3)).map((f) => f.allocation)).toEqual([34, 33, 33]);
    // 7 funds: 15 + 15 + 14*5 = 100.
    expect(autoBalance(funds(7)).map((f) => f.allocation)).toEqual([15, 15, 14, 14, 14, 14, 14]);
  });

  it('never allocates a negative or zero share', () => {
    autoBalance(funds(23)).forEach((f) => expect(f.allocation).toBeGreaterThan(0));
  });

  it('returns an empty list unchanged rather than dividing by zero', () => {
    expect(autoBalance([])).toEqual([]);
  });

  it('preserves scheme identity and name while rewriting allocations', () => {
    const input: DraftFund[] = [
      { schemeCode: 100350, name: 'ICICI Large Cap', category: 'Equity', allocation: 99 },
      { schemeCode: 145112, name: 'Axis Large & Mid', category: 'Equity', allocation: 1 },
    ];
    const out = autoBalance(input);
    expect(out.map((f) => f.schemeCode)).toEqual([100350, 145112]);
    expect(out.map((f) => f.name)).toEqual(['ICICI Large Cap', 'Axis Large & Mid']);
    expect(out.map((f) => f.category)).toEqual(['Equity', 'Equity']);
    expect(out.map((f) => f.allocation)).toEqual([50, 50]);
  });

  it('is idempotent - rebalancing an already balanced set changes nothing', () => {
    const once = autoBalance(funds(6));
    expect(autoBalance(once)).toEqual(once);
  });
});
