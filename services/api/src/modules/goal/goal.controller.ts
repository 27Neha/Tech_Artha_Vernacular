import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AccessTokenGuard, CurrentUser } from '../../common/auth';
import type { AuthenticatedUser } from '../../common/auth';
import { GoalService } from './goal.service';

@Controller('goals')
@UseGuards(AccessTokenGuard)
export class GoalController {
  constructor(private readonly goalService: GoalService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.goalService.list(user.id);
  }

  @Post('simulate')
  simulate(@Body() body: { targetAmount: number; timePeriod: number; currentSavings?: number; inflationRate?: number }) {
    return this.goalService.simulate(body);
  }

  @Post('select')
  selectGoal(@CurrentUser() user: AuthenticatedUser, @Body() body: { name: string; targetAmount: number; timePeriod: number; currentSavings?: number; inflationRate?: number; bucketId?: string; bucketName?: string; sipDate?: number; consent?: boolean }) {
    const legacyBucket = body.bucketName === 'stable' ? 'stable' : body.bucketName === 'high' ? 'growth' : 'balanced';
    return this.goalService.selectGoal(user.id, { ...body, bucketId: body.bucketId ?? legacyBucket, sipDate: body.sipDate ?? 5, consent: Boolean(body.consent) });
  }
}
