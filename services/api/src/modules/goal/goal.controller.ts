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

  @Post('context')
  saveContext(@CurrentUser() user: AuthenticatedUser, @Body() body: any) {
    return this.goalService.saveContext(user.id, body);
  }
}
