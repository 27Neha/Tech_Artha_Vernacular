import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { BucketsService } from '../buckets/buckets.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConsentService } from '../consent/consent.service';
import { GoalCalculatorService } from './goal-calculator.service';

@Injectable()
export class GoalService {
  constructor(private readonly prisma: PrismaService, private readonly calculator: GoalCalculatorService, private readonly buckets: BucketsService, private readonly consents: ConsentService) {}

  simulate(input: { targetAmount: number; timePeriod: number; currentSavings?: number; inflationRate?: number }) {
    return this.calculator.simulate(input);
  }

  async selectGoal(userId: string, input: { name: string; targetAmount: number; timePeriod: number; currentSavings?: number; inflationRate?: number; bucketId: string; sipDate: number; consent: boolean }) {
    if (!input.consent) throw new BadRequestException('Explicit proposal consent is required.');
    if (!input.name?.trim()) throw new BadRequestException('Choose or name a financial goal.');
    if (!Number.isInteger(input.sipDate) || input.sipDate < 1 || input.sipDate > 28) throw new BadRequestException('Choose a SIP date from 1 to 28.');
    const profile = await this.prisma.riskProfile.findUnique({ where: { userId } });
    if (!profile) throw new BadRequestException('Complete your risk assessment before choosing an investment bucket.');
    const bucket = this.buckets.getEligible(input.bucketId, profile.category);
    const simulation = this.simulate(input);
    const base = simulation.scenarios.find((scenario) => scenario.label === 'Base illustration')!;
    await this.consents.grant({ userId, type: 'INVESTMENT_PROPOSAL', source: 'APP' });
    const goal = await this.prisma.goal.create({
      data: {
        userId,
        name: input.name.trim(),
        goalType: input.name.trim().toUpperCase().replace(/\s+/g, '_'),
        targetAmount: input.targetAmount,
        timePeriod: input.timePeriod,
        currentSavings: input.currentSavings ?? 0,
        inflationRate: input.inflationRate ?? 6,
        returnAssumption: base.annualRate,
        monthlySip: base.monthlyContribution,
        bucketName: bucket.name,
        sipDate: input.sipDate,
      },
    });
    await this.prisma.auditLog.create({ data: { userId, action: 'GOAL_PROPOSAL_CREATED', details: JSON.stringify({ goalId: goal.id, bucketId: bucket.id, riskProfile: profile.category }) } });
    return { data: goal, bucket, simulation, executionStatus: 'NOT_STARTED', disclosure: 'No investment order was created. Review and separate execution consent are required before any transaction.' };
  }

  /**
   * Edits a goal's name, target, horizon or inflation. The monthly SIP is re-derived from
   * the same simulation used when the goal was created, so the plan shown afterwards is
   * for the goal as it now stands rather than the one first entered.
   */
  async update(userId: string, goalId: string, input: { name?: string; targetAmount?: number; timePeriod?: number; inflationRate?: number }) {
    const goal = await this.prisma.goal.findFirst({ where: { id: goalId, userId } });
    if (!goal) throw new NotFoundException('Goal not found.');
    const next = {
      name: input.name?.trim() || goal.name,
      targetAmount: input.targetAmount ?? goal.targetAmount,
      timePeriod: input.timePeriod != null ? Math.round(input.timePeriod) : goal.timePeriod,
      inflationRate: input.inflationRate ?? goal.inflationRate,
    };
    if (!(next.targetAmount > 0)) throw new BadRequestException('Enter a target amount above zero.');
    if (!(next.timePeriod > 0)) throw new BadRequestException('Enter a time horizon above zero.');
    if (next.inflationRate < 0) throw new BadRequestException('Inflation cannot be negative.');

    const simulation = this.simulate({ ...next, currentSavings: goal.currentSavings });
    const base = simulation.scenarios.find((scenario) => scenario.label === 'Base illustration')!;
    const updated = await this.prisma.goal.update({
      where: { id: goal.id },
      data: { ...next, goalType: next.name.toUpperCase().replace(/\s+/g, '_'), returnAssumption: base.annualRate, monthlySip: base.monthlyContribution },
    });
    await this.prisma.auditLog.create({ data: { userId, action: 'GOAL_UPDATED', details: JSON.stringify({ goalId: goal.id }) } });
    return updated;
  }

  list(userId: string) {
    return this.prisma.goal.findMany({ where: { userId, status: 'ACTIVE' }, orderBy: { createdAt: 'desc' } });
  }
}
