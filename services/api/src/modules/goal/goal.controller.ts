import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AccessTokenGuard, CurrentUser } from '../../common/auth';
import type { AuthenticatedUser } from '../../common/auth';
import { GoalService } from './goal.service';

@Controller('goals')
@UseGuards(AccessTokenGuard)
export class GoalController {
  constructor(private readonly goalService: GoalService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query('status') status?: string) {
    return this.goalService.list(user.id, status);
  }

  @Get(':id/investments')
  getInvestments(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.goalService.getInvestments(user.id, id);
  }

  @Post(':id/pause')
  pause(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.goalService.pause(user.id, id);
  }

  @Post(':id/resume')
  resume(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.goalService.resume(user.id, id);
  }

  @Post(':id/archive')
  archive(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.goalService.archive(user.id, id);
  }

  @Post(':id/restore')
  restore(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.goalService.restore(user.id, id);
  }

  @Delete(':id')
  delete(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.goalService.delete(user.id, id);
  }

  @Post('context')
  saveContext(@CurrentUser() user: AuthenticatedUser, @Body() body: any) {
    return this.goalService.saveContext(user.id, body);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { name?: string; targetAmount?: number; timePeriod?: number; inflationRate?: number; status?: string },
  ) {
    return this.goalService.update(user.id, id, body);
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
