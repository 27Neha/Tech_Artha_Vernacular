import { Controller, Get, Post, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { AccessTokenGuard, CurrentUser } from '../../common/auth';
import type { AuthenticatedUser } from '../../common/auth';
import { PrismaService } from '../../prisma/prisma.service';
import { BucketsService } from './buckets.service';
import { CustomBucketDto } from './custom-bucket.dto';

@Controller('buckets')
@UseGuards(AccessTokenGuard)
export class BucketsController {
  constructor(private readonly prisma: PrismaService, private readonly buckets: BucketsService) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    const profile = await this.prisma.riskProfile.findUnique({ where: { userId: user.id } });
    return { investorProfile: profile?.category ?? 'ASSESSMENT_REQUIRED', buckets: profile ? await this.buckets.listForProfile(profile.category) : [] };
  }

  @Post('custom')
  async createCustomBucket(@Body() dto: CustomBucketDto) {
    const totalAllocation = dto.funds.reduce((sum, fund) => sum + fund.allocation, 0);
    
    if (totalAllocation !== 100) {
      throw new BadRequestException('Total allocation must equal exactly 100');
    }

    // In a real scenario, this would save the custom bucket to the database.
    return { message: 'Custom bucket created successfully' };
  }
}
