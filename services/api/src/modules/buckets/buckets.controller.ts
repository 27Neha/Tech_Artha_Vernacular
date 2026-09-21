import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { AccessTokenGuard, CurrentUser } from '../../common/auth';
import type { AuthenticatedUser } from '../../common/auth';
import { PrismaService } from '../../prisma/prisma.service';
import { BucketsService } from './buckets.service';
import { CustomBucketDto } from './custom-bucket.dto';
import { InvestInBucketDto } from './invest-in-bucket.dto';

@Controller('buckets')
@UseGuards(AccessTokenGuard)
export class BucketsController {
  constructor(private readonly prisma: PrismaService, private readonly buckets: BucketsService) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    const profile = await this.prisma.riskProfile.findUnique({ where: { userId: user.id } });
    return { investorProfile: profile?.category ?? 'ASSESSMENT_REQUIRED', buckets: profile ? await this.buckets.listForProfile(profile.category) : [] };
  }

  @Get('investments')
  async listInvestments(@CurrentUser() user: AuthenticatedUser) {
    return this.buckets.listInvestments(user.id);
  }

  @Post(':id/invest')
  async invest(@CurrentUser() user: AuthenticatedUser, @Param('id') bucketId: string, @Body() dto: InvestInBucketDto) {
    return this.buckets.invest(user.id, bucketId, dto);
  }

  @Get('custom')
  async listCustomBuckets(@CurrentUser() user: AuthenticatedUser) {
    return this.buckets.listCustomBuckets(user.id);
  }

  @Post('custom')
  async createCustomBucket(@CurrentUser() user: AuthenticatedUser, @Body() dto: CustomBucketDto) {
    return this.buckets.createCustomBucket(user.id, dto);
  }
}
