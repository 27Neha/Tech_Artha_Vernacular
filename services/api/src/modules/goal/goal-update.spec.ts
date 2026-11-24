import { NotFoundException } from '@nestjs/common';
import { GoalService } from './goal.service';
import { GoalCalculatorService } from './goal-calculator.service';

/** Editing a goal re-derives its monthly SIP, so the plan shown matches the edited goal. */
const goal = { id: 'g1', userId: 'u1', name: 'Education', targetAmount: 500000, timePeriod: 5, inflationRate: 6, currentSavings: 0 };

const makeCtx = (found: object | null = goal) => {
  const update = jest.fn(async ({ data }: any) => ({ ...goal, ...data }));
  const ctx = Object.assign(Object.create(GoalService.prototype), {
    calculator: new GoalCalculatorService(),
    prisma: { goal: { findFirst: async () => found, update }, auditLog: { create: jest.fn() } },
  });
  return { ctx, update };
};

describe('GoalService.update', () => {
  it('recalculates the monthly SIP for the new target', async () => {
    const { ctx } = makeCtx();
    const before = await ctx.update('u1', 'g1', {});
    const after = await ctx.update('u1', 'g1', { targetAmount: 1000000 });
    expect(after.monthlySip).toBeGreaterThan(before.monthlySip);
  });

  it('keeps fields that were not sent, and rounds the horizon to whole years', async () => {
    const { ctx, update } = makeCtx();
    await ctx.update('u1', 'g1', { timePeriod: 7.4 });
    expect(update.mock.calls[0][0].data).toMatchObject({ name: 'Education', targetAmount: 500000, timePeriod: 7, inflationRate: 6 });
  });

  it("refuses a goal that is not the investor's", async () => {
    const { ctx } = makeCtx(null);
    await expect(ctx.update('u1', 'g1', { targetAmount: 1 })).rejects.toThrow(NotFoundException);
  });

  it('refuses a zero target', async () => {
    const { ctx } = makeCtx();
    await expect(ctx.update('u1', 'g1', { targetAmount: 0 })).rejects.toThrow(/target amount/);
  });
});
