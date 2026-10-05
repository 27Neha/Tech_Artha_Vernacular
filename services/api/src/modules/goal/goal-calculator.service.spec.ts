import { BadRequestException } from '@nestjs/common';
import { GoalCalculatorService } from './goal-calculator.service';

/**
 * This service decides what the app tells someone to invest every month. It is pure
 * arithmetic with no dependencies, it is shown to users as a figure they may act on,
 * and it had no tests at all - which is the worst combination of properties in the
 * codebase.
 *
 * The assertions below pin the behaviour that matters: that a higher assumed return
 * lowers the required contribution, that inflation is applied before the contribution
 * is derived, that existing savings reduce it, and that the input guards actually hold.
 */
describe('GoalCalculatorService', () => {
  const service = new GoalCalculatorService();

  const base = { targetAmount: 1_500_000, timePeriod: 8 };

  describe('simulate', () => {
    it('returns the three illustrations the UI renders, in ascending rate order', () => {
      const result = service.simulate(base);
      expect(result.scenarios.map((s) => s.annualRate)).toEqual([7, 10, 12]);
      expect(result.scenarios.map((s) => s.label)).toEqual([
        'Conservative illustration',
        'Base illustration',
        'Higher illustration',
      ]);
    });

    it('inflates the target before deriving contributions', () => {
      const result = service.simulate({ ...base, inflationRate: 6 });
      // 15,00,000 compounded at 6% for 8 years.
      const expected = 1_500_000 * Math.pow(1.06, 8);
      expect(result.adjustedTargetAmount).toBeCloseTo(expected, 2);
      // Every scenario quotes the inflated target, not the nominal one - otherwise the
      // monthly figure would quietly undershoot the real goal.
      result.scenarios.forEach((s) => expect(s.targetAmount).toBeCloseTo(expected, 2));
    });

    it('defaults inflation to 6% when not supplied', () => {
      expect(service.simulate(base).inflationRate).toBe(6);
      expect(service.simulate(base).adjustedTargetAmount).toBeCloseTo(
        service.simulate({ ...base, inflationRate: 6 }).adjustedTargetAmount,
        6,
      );
    });

    it('requires a smaller monthly contribution as the assumed return rises', () => {
      const [conservative, mid, higher] = service.simulate(base).scenarios;
      expect(conservative.monthlyContribution).toBeGreaterThan(mid.monthlyContribution);
      expect(mid.monthlyContribution).toBeGreaterThan(higher.monthlyContribution);
    });

    it('reduces the contribution when the investor already has savings', () => {
      const without = service.simulate(base).scenarios[1].monthlyContribution;
      const with5L = service.simulate({ ...base, currentSavings: 500_000 }).scenarios[1].monthlyContribution;
      expect(with5L).toBeLessThan(without);
    });

    it('never asks for a negative contribution when savings already cover the goal', () => {
      const result = service.simulate({ targetAmount: 100_000, timePeriod: 30, currentSavings: 10_000_000 });
      result.scenarios.forEach((s) => expect(s.monthlyContribution).toBeGreaterThanOrEqual(0));
    });

    it('rounds contributions up to the nearest 100 rupees', () => {
      service.simulate(base).scenarios.forEach((s) => {
        expect(s.monthlyContribution % 100).toBe(0);
      });
    });

    it('needs a larger monthly contribution over a shorter horizon', () => {
      const short = service.simulate({ targetAmount: 1_500_000, timePeriod: 3 }).scenarios[1].monthlyContribution;
      const long = service.simulate({ targetAmount: 1_500_000, timePeriod: 20 }).scenarios[1].monthlyContribution;
      expect(short).toBeGreaterThan(long);
    });

    it('states that the figures are illustrations, not guaranteed returns', () => {
      expect(service.simulate(base).disclaimer).toMatch(/not guaranteed/i);
    });
  });

  describe('input guards', () => {
    it.each([
      ['a zero target', { targetAmount: 0, timePeriod: 8 }],
      ['a negative target', { targetAmount: -1, timePeriod: 8 }],
      ['a sub-year horizon', { targetAmount: 100_000, timePeriod: 0 }],
      ['a horizon beyond 50 years', { targetAmount: 100_000, timePeriod: 51 }],
      ['a non-numeric target', { targetAmount: NaN, timePeriod: 8 }],
    ])('rejects %s', (_label, input) => {
      expect(() => service.simulate(input as any)).toThrow(BadRequestException);
    });

    it.each([
      ['negative savings', { ...{ targetAmount: 100_000, timePeriod: 8 }, currentSavings: -1 }],
      ['negative inflation', { ...{ targetAmount: 100_000, timePeriod: 8 }, inflationRate: -1 }],
      ['inflation above 15%', { ...{ targetAmount: 100_000, timePeriod: 8 }, inflationRate: 16 }],
    ])('rejects %s', (_label, input) => {
      expect(() => service.simulate(input as any)).toThrow(BadRequestException);
    });

    it('accepts the boundary values rather than rejecting them', () => {
      expect(() => service.simulate({ targetAmount: 1, timePeriod: 1 })).not.toThrow();
      expect(() => service.simulate({ targetAmount: 1, timePeriod: 50 })).not.toThrow();
      expect(() => service.simulate({ targetAmount: 1, timePeriod: 8, inflationRate: 0 })).not.toThrow();
      expect(() => service.simulate({ targetAmount: 1, timePeriod: 8, inflationRate: 15 })).not.toThrow();
    });
  });
});
