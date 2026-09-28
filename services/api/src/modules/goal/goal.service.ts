import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GoalService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string) {
    return this.prisma.goal.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }

  async saveContext(userId: string, body: any) {
    let finalHorizon = body.horizonYears || 5;
    if (body.targetDate) {
      const target = new Date(body.targetDate);
      const diffMs = target.getTime() - Date.now();
      const diffYears = diffMs / (1000 * 60 * 60 * 24 * 365.25);
      finalHorizon = Math.max(0.5, Math.round(diffYears * 10) / 10);
    }

    const goal = await this.prisma.goal.create({
      data: {
        userId,
        name: body.goalName || 'General Investing',
        goalType: (body.goalName || 'General').toUpperCase().replace(/\s+/g, '_'),
        targetAmount: body.targetAmount || 0,
        timePeriod: Math.round(finalHorizon),
        monthlySip: body.frequency === 'Monthly' ? (body.amount || 0) : 0,
        bucketName: 'CUSTOM', // No longer using static buckets
        sipDate: 5,
        currentSavings: body.frequency === 'One-time' ? (body.amount || 0) : 0,
      }
    });

    return { ...goal, calculatedHorizon: finalHorizon };
  }
}
