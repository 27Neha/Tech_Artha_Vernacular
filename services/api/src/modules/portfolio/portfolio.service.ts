import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PortfolioService {
  constructor(private readonly prisma: PrismaService) {}

  async getPortfolio(userId: string) {
    const portfolio = await this.prisma.portfolio.findUnique({ where: { userId }, include: { holdings: true } });
    if (!portfolio) {
      return {
        data: { totalInvested: 0, currentValue: 0, totalReturns: 0, holdings: [] },
        source: 'NOT_CONNECTED',
        status: 'NOT_CONNECTED — CREDENTIAL REQUIRED',
        message: 'No verified portfolio data is available yet. TechArtha will not invent holdings or returns.',
      };
    }
    return { data: portfolio, source: portfolio.source, status: portfolio.status };
  }
}
