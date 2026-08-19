import { Controller, Get, UseGuards } from '@nestjs/common';
import { AccessTokenGuard, CurrentUser } from '../../common/auth';
import type { AuthenticatedUser } from '../../common/auth';
import { PrismaService } from '../../prisma/prisma.service';
import { BucketsService } from './buckets.service';

@Controller('buckets')
@UseGuards(AccessTokenGuard)
export class BucketsController {
  constructor(private readonly prisma: PrismaService, private readonly buckets: BucketsService) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    const profile = await this.prisma.riskProfile.findUnique({ where: { userId: user.id } });
    return { investorProfile: profile?.category ?? 'ASSESSMENT_REQUIRED', buckets: profile ? this.buckets.listForProfile(profile.category) : [] };
  }
}
