import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { BucketsService } from '../buckets/buckets.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConsentService } from '../consent/consent.service';
import { GoalCalculatorService } from './goal-calculator.service';

@Injectable()
export class GoalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly calculator: GoalCalculatorService,
    private readonly buckets: BucketsService,
    private readonly consents: ConsentService,
  ) {}

  simulate(input: { targetAmount: number; timePeriod: number; currentSavings?: number; inflationRate?: number }) {
    return this.calculator.simulate(input);
  }

  async selectGoal(userId: string, input: any) {
    if (!input.consent) throw new BadRequestException('Explicit proposal consent is required.');
    const name = String(input.name || input.goalName || input.goal || '').trim();
    if (!name) throw new BadRequestException('Choose or name a financial goal.');

    const sipDate = Number(input.sipDate) || 5;
    if (sipDate < 1 || sipDate > 28) throw new BadRequestException('Choose a SIP date from 1 to 28.');

    const profile = await this.prisma.riskProfile.findUnique({ where: { userId } });
    if (!profile) throw new BadRequestException('Complete your risk assessment before choosing an investment bucket.');

    const bucketId = input.bucketId || 'balanced';
    let bucketName = input.bucketName;
    let bucket: any;
    try {
      bucket = this.buckets.getEligible(bucketId, profile.category);
      bucketName = bucket.name;
    } catch {
      bucketName = input.bucketName || 'Custom Bucket';
      bucket = { id: bucketId, name: bucketName };
    }

    const targetAmount = Number(input.targetAmount) || 0;
    const timePeriod = Math.max(1, Math.round(Number(input.timePeriod) || 5));
    const currentSavings = Number(input.currentSavings) || 0;
    const inflationRate = Number(input.inflationRate) || 6;

    const simulation = this.simulate({ targetAmount, timePeriod, currentSavings, inflationRate });
    const base = simulation.scenarios.find((scenario) => scenario.label === 'Base illustration') || simulation.scenarios[0];
    await this.consents.grant({ userId, type: 'INVESTMENT_PROPOSAL', source: 'APP' });

    const goal = await this.prisma.goal.create({
      data: {
        userId,
        name,
        goalType: name.toUpperCase().replace(/\s+/g, '_'),
        targetAmount,
        timePeriod,
        currentSavings,
        inflationRate,
        returnAssumption: base?.annualRate || 12,
        monthlySip: base?.monthlyContribution || 0,
        bucketName: bucketName || 'Custom Bucket',
        sipDate,
        status: 'ACTIVE',
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'GOAL_PROPOSAL_CREATED',
        details: JSON.stringify({ goalId: goal.id, bucketId: bucket.id, riskProfile: profile.category }),
      },
    });

    return {
      data: goal,
      bucket,
      simulation,
      executionStatus: 'NOT_STARTED',
      disclosure: 'No investment order was created. Review and separate execution consent are required before any transaction.',
    };
  }

  async saveContext(userId: string, body: any) {
    let finalHorizon = Number(body.horizonYears) || 5;
    if (body.targetDate) {
      const target = new Date(body.targetDate);
      if (!isNaN(target.getTime())) {
        const diffMs = target.getTime() - Date.now();
        const diffYears = diffMs / (1000 * 60 * 60 * 24 * 365.25);
        finalHorizon = Math.max(0.5, Math.round(diffYears * 10) / 10);
      }
    }

    const targetAmount = Number(body.targetAmount) || 0;
    const timePeriod = Math.max(1, Math.round(Number(finalHorizon) || 5));
    const amount = Number(body.amount) || 0;
    const monthlySip = body.frequency === 'Monthly' ? amount : 0;
    const currentSavings = body.frequency === 'One-time' ? amount : 0;
    const sipDate = Number(body.sipDate) || 5;
    const goalName = String(body.goalName || body.name || 'General Investing').trim();

    const goal = await this.prisma.goal.create({
      data: {
        userId,
        name: goalName,
        goalType: goalName.toUpperCase().replace(/\s+/g, '_'),
        targetAmount,
        timePeriod,
        monthlySip,
        bucketName: body.bucketName || 'CUSTOM',
        sipDate: sipDate >= 1 && sipDate <= 28 ? sipDate : 5,
        currentSavings,
        status: 'ACTIVE',
      },
    });

    return { ...goal, calculatedHorizon: finalHorizon };
  }

  /**
   * Edits a goal's name, target, horizon or inflation. The monthly SIP is re-derived from
   * the same simulation used when the goal was created, so the plan shown afterwards is
   * for the goal as it now stands rather than the one first entered.
   */
  async update(userId: string, goalId: string, input: { name?: string; targetAmount?: number; timePeriod?: number; inflationRate?: number; status?: string }) {
    const goal = await this.prisma.goal.findFirst({ where: { id: goalId, userId } });
    if (!goal) throw new NotFoundException('Goal not found.');
    const next = {
      name: input.name?.trim() || goal.name,
      targetAmount: input.targetAmount ?? goal.targetAmount,
      timePeriod: input.timePeriod != null ? Math.round(input.timePeriod) : goal.timePeriod,
      inflationRate: input.inflationRate ?? goal.inflationRate,
      status: input.status ? input.status.toUpperCase() : goal.status,
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

  async getInvestments(userId: string, goalId: string) {
    const goal = await this.prisma.goal.findFirst({ where: { id: goalId, userId } });
    if (!goal) throw new NotFoundException('Goal not found.');

    const amountInvested = Number(goal.currentSavings) || 0;
    const targetAmount = Number(goal.targetAmount) || 0;
    const remainingAmount = Math.max(0, targetAmount - amountInvested);
    const hasInvestments = amountInvested > 0;
    const linkedInvestmentCount = hasInvestments ? 1 : 0;
    const currentInvestmentValue = amountInvested;

    const hasActiveSip = goal.status === 'ACTIVE' && (goal.monthlySip > 0);
    const isPaused = goal.status === 'PAUSED';

    return {
      goalId: goal.id,
      goalName: goal.name,
      status: goal.status,
      targetAmount,
      amountInvested,
      currentInvestmentValue,
      remainingAmount,
      hasInvestments,
      linkedInvestmentCount,
      activeSip: {
        hasActiveSip,
        isPaused,
        monthlyAmount: goal.monthlySip || 0,
        sipDate: goal.sipDate || 5,
        statusText: isPaused
          ? 'SIP Paused'
          : hasActiveSip
          ? `Active (₹${Math.round(goal.monthlySip).toLocaleString('en-IN')}/mo)`
          : 'No Active SIP',
      },
      disclaimer:
        'Goal deletion or pausing does not alter your underlying mutual fund holdings, bank mandates, or trigger any redemption or tax liability. Portfolio investments remain subject to market risks.',
    };
  }

  async pause(userId: string, goalId: string) {
    const goal = await this.prisma.goal.findFirst({ where: { id: goalId, userId } });
    if (!goal) throw new NotFoundException('Goal not found.');
    const updated = await this.prisma.goal.update({
      where: { id: goal.id },
      data: { status: 'PAUSED' },
    });
    await this.prisma.auditLog.create({
      data: { userId, action: 'GOAL_PAUSED', details: JSON.stringify({ goalId: goal.id }) },
    });
    return updated;
  }

  async resume(userId: string, goalId: string) {
    const goal = await this.prisma.goal.findFirst({ where: { id: goalId, userId } });
    if (!goal) throw new NotFoundException('Goal not found.');
    const updated = await this.prisma.goal.update({
      where: { id: goal.id },
      data: { status: 'ACTIVE' },
    });
    await this.prisma.auditLog.create({
      data: { userId, action: 'GOAL_RESUMED', details: JSON.stringify({ goalId: goal.id }) },
    });
    return updated;
  }

  async archive(userId: string, goalId: string) {
    const goal = await this.prisma.goal.findFirst({ where: { id: goalId, userId } });
    if (!goal) throw new NotFoundException('Goal not found.');
    const updated = await this.prisma.goal.update({
      where: { id: goal.id },
      data: { status: 'ARCHIVED' },
    });
    await this.prisma.auditLog.create({
      data: { userId, action: 'GOAL_ARCHIVED', details: JSON.stringify({ goalId: goal.id }) },
    });
    return { success: true, message: 'Goal archived successfully.', goal: updated };
  }

  async restore(userId: string, goalId: string) {
    const goal = await this.prisma.goal.findFirst({ where: { id: goalId, userId } });
    if (!goal) throw new NotFoundException('Goal not found.');
    const updated = await this.prisma.goal.update({
      where: { id: goal.id },
      data: { status: 'ACTIVE' },
    });
    await this.prisma.auditLog.create({
      data: { userId, action: 'GOAL_RESTORED', details: JSON.stringify({ goalId: goal.id }) },
    });
    return { success: true, message: 'Goal restored successfully.', goal: updated };
  }

  async delete(userId: string, goalId: string) {
    const goal = await this.prisma.goal.findFirst({ where: { id: goalId, userId } });
    if (!goal) throw new NotFoundException('Goal not found.');

    const hasInvestments = (goal.currentSavings || 0) > 0;
    if (hasInvestments) {
      // Safe archival: do not destroy record, transition to ARCHIVED
      const archived = await this.prisma.goal.update({
        where: { id: goal.id },
        data: { status: 'ARCHIVED' },
      });
      await this.prisma.auditLog.create({
        data: {
          userId,
          action: 'GOAL_ARCHIVED_SAFE_DELETE',
          details: JSON.stringify({ goalId: goal.id, invested: goal.currentSavings }),
        },
      });
      return {
        success: true,
        archived: true,
        message: 'Goal removed from active goals. Investments remain preserved in your portfolio.',
        goal: archived,
      };
    }

    // No investments: delete cleanly from database
    await this.prisma.goal.delete({ where: { id: goal.id } });
    await this.prisma.auditLog.create({
      data: { userId, action: 'GOAL_DELETED', details: JSON.stringify({ goalId: goal.id }) },
    });
    return { success: true, archived: false, message: 'Goal deleted successfully.' };
  }

  async list(userId: string, status?: string) {
    const filterStatus = status ? status.toUpperCase() : null;
    const whereClause: any = { userId };
    if (filterStatus && filterStatus !== 'ALL') {
      whereClause.status = filterStatus;
    } else if (!filterStatus) {
      // Default: return ACTIVE and PAUSED for active list
      whereClause.status = { in: ['ACTIVE', 'PAUSED'] };
    }

    const goals = await this.prisma.goal.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });

    return goals.map((g) => {
      const currentSaved = g.currentSavings || 0;
      const target = g.targetAmount || 0;
      const progressPercentage = target > 0 ? (currentSaved / target) * 100 : 0;
      const remainingAmount = Math.max(0, target - currentSaved);
      return {
        ...g,
        progressPercentage,
        currentInvestmentValue: currentSaved,
        remainingAmount,
        recommendedSip: g.monthlySip,
      };
    });
  }
}
