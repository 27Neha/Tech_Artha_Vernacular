import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AccessTokenGuard, CurrentUser } from '../../common/auth';
import type { AuthenticatedUser } from '../../common/auth';
import { LearningService } from './learning.service';

@Controller('learning')
@UseGuards(AccessTokenGuard)
export class LearningController {
  constructor(private readonly learning: LearningService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query('locale') locale?: string) {
    return this.learning.list(user.id, locale);
  }

  @Post(':lessonKey/complete')
  complete(@CurrentUser() user: AuthenticatedUser, @Param('lessonKey') lessonKey: string, @Body() body: { score?: number }) {
    return this.learning.complete(user.id, lessonKey, body.score);
  }
}
