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
    private readonly consents: ConsentService
  ) {}

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
        bucketName: bucket.id,
        sipDate: input.sipDate,
      },
    });
    await this.prisma.auditLog.create({ data: { userId, action: 'GOAL_PROPOSAL_CREATED', details: JSON.stringify({ goalId: goal.id, bucketId: bucket.id, riskProfile: profile.category }) } });
    return { data: goal, bucket, simulation, executionStatus: 'NOT_STARTED', disclosure: 'No investment order was created. Review and separate execution consent are required before any transaction.' };
  }

  async updateGoal(userId: string, goalId: string, updates: { targetAmount?: number; timePeriod?: number; inflationRate?: number; name?: string; currentSavings?: number }) {
    const existing = await this.prisma.goal.findFirst({ where: { id: goalId, userId, status: 'ACTIVE' } });
    if (!existing) throw new NotFoundException('Goal not found');

    const targetAmount = updates.targetAmount ?? existing.targetAmount;
    const timePeriod = updates.timePeriod ?? existing.timePeriod;
    const inflationRate = updates.inflationRate ?? existing.inflationRate;
    const currentSavings = updates.currentSavings ?? existing.currentSavings;
    const name = updates.name?.trim() || existing.name;

    // Recalculate SIP required
    const simulation = this.simulate({ targetAmount, timePeriod, inflationRate, currentSavings });
    const base = simulation.scenarios.find((scenario) => scenario.label === 'Base illustration')!;

    const updatedGoal = await this.prisma.goal.update({
      where: { id: existing.id },
      data: {
        name,
        targetAmount,
        timePeriod,
        inflationRate,
        currentSavings,
        monthlySip: base.monthlyContribution,
      }
    });

    return updatedGoal;
  }

  async list(userId: string) {
    const goals = await this.prisma.goal.findMany({ where: { userId, status: 'ACTIVE' }, orderBy: { createdAt: 'desc' } });
    
    // Get real investment data
    const investments = await this.buckets.listInvestments(userId);
    
    return goals.map(goal => {
      // Find orders that match this goal's bucket
      const bucketOrders = investments.orders.filter(o => o.bucketId === goal.bucketName || o.bucketId === goal.bucketName.toLowerCase());
      
      // Calculate real investment value (current savings + sum of successful/completed orders)
      const investedFromOrders = bucketOrders
        .filter(o => o.status === 'SUCCESS' || o.status === 'completed' || o.status === 'PENDING') // include pending for sandbox realism
        .reduce((sum, o) => sum + (o.amount || 0), 0);
        
      const currentInvestmentValue = (goal.currentSavings || 0) + investedFromOrders;
      const inflationAdjustedAmount = goal.targetAmount * Math.pow(1 + goal.inflationRate / 100, goal.timePeriod);
      
      let progressPercentage = inflationAdjustedAmount > 0 ? (currentInvestmentValue / inflationAdjustedAmount) * 100 : 0;
      if (progressPercentage > 100) progressPercentage = 100;
      
      const remainingAmount = Math.max(inflationAdjustedAmount - currentInvestmentValue, 0);

      // Return augmented goal
      return {
        ...goal,
        currentInvestmentValue,
        inflationAdjustedAmount,
        progressPercentage,
        remainingAmount,
        ordersCount: bucketOrders.length
      };
    });
  }
}
