import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BucketsService } from '../buckets/buckets.service';

@Injectable()
export class FamilyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly buckets: BucketsService
  ) {}

  async getFamilyPortfolio(userId: string) {
    // Check if user is the head
    let portfolio = await this.prisma.familyPortfolio.findUnique({
      where: { creatorId: userId },
      include: {
        creator: { select: { id: true, FpInvestorProfile: { select: { name: true } }, mobile: true } },
        members: { include: { user: { select: { id: true, FpInvestorProfile: { select: { name: true } }, mobile: true } } } }
      }
    });

    // Or check if user is a member
    let isHead = true;
    if (!portfolio) {
      const membership = await this.prisma.familyMember.findFirst({
        where: { userId },
        include: {
          familyPortfolio: {
            include: {
              creator: { select: { id: true, FpInvestorProfile: { select: { name: true } }, mobile: true } },
              members: { include: { user: { select: { id: true, FpInvestorProfile: { select: { name: true } }, mobile: true } } } }
            }
          }
        }
      });
      if (membership) {
        portfolio = membership.familyPortfolio;
        isHead = false;
      }
    }

    if (!portfolio) return null;

    // Aggregate investments
    const allUserIds = [portfolio.creatorId, ...portfolio.members.map(m => m.userId)];
    
    let totalInvested = 0;
    let totalCurrentValue = 0;
    
    // Member details with their individual portfolio summaries
    const memberSummaries = await Promise.all(
      allUserIds.map(async (uId) => {
        const inv = await this.buckets.listInvestments(uId);
        
        let uInvested = 0;
        let uCurrent = 0;
        if (inv && inv.orders) {
           uInvested = inv.orders.reduce((acc, o) => acc + (o.amount || 0), 0);
           // In mock sandbox, we'll just say current value is invested + 12% for simplicity
           uCurrent = uInvested * 1.12; 
        }

        totalInvested += uInvested;
        totalCurrentValue += uCurrent;

        const isCreator = uId === portfolio.creatorId;
        const profileInfo = isCreator 
            ? portfolio.creator 
            : portfolio.members.find(m => m.userId === uId)?.user;
            
        return {
          userId: uId,
          role: isCreator ? 'HEAD' : 'MEMBER',
          name: profileInfo?.FpInvestorProfile?.name || 'User',
          mobile: profileInfo?.mobile,
          investedValue: uInvested,
          currentValue: uCurrent,
        };
      })
    );

    return {
      id: portfolio.id,
      name: portfolio.name,
      isHead,
      totalInvested,
      totalCurrentValue,
      members: memberSummaries
    };
  }

  async createFamilyPortfolio(userId: string, name: string) {
    const existing = await this.prisma.familyPortfolio.findUnique({ where: { creatorId: userId } });
    if (existing) throw new BadRequestException('You already have a Family Portfolio');

    const memberCheck = await this.prisma.familyMember.findFirst({ where: { userId } });
    if (memberCheck) throw new BadRequestException('You are already part of a family portfolio');

    return this.prisma.familyPortfolio.create({
      data: {
        creatorId: userId,
        name: name || 'Family Portfolio'
      }
    });
  }

  async addFamilyMember(userId: string, mobile: string) {
    const portfolio = await this.prisma.familyPortfolio.findUnique({ where: { creatorId: userId } });
    if (!portfolio) throw new ForbiddenException('Only the Family Head can add members');

    const invitee = await this.prisma.user.findUnique({ where: { mobile } });
    if (!invitee) throw new NotFoundException('User with this mobile number not found');
    if (invitee.id === userId) throw new BadRequestException('Cannot add yourself');

    const isHead = await this.prisma.familyPortfolio.findUnique({ where: { creatorId: invitee.id } });
    if (isHead) throw new BadRequestException('This user is already a Family Head');

    const isMember = await this.prisma.familyMember.findFirst({ where: { userId: invitee.id } });
    if (isMember) throw new BadRequestException('This user is already in a family portfolio');

    await this.prisma.familyMember.create({
      data: {
        familyPortfolioId: portfolio.id,
        userId: invitee.id
      }
    });

    return { success: true, message: 'Family member added' };
  }
}
