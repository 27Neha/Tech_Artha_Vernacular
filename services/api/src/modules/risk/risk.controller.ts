import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AccessTokenGuard, CurrentUser } from '../../common/auth';
import type { AuthenticatedUser } from '../../common/auth';
import { RiskService } from './risk.service';

@Controller('risk')
export class RiskController {
  constructor(private readonly riskService: RiskService) {}

  @Get('questionnaire')
  questionnaire() {
    return this.riskService.questionnaire();
  }

  @UseGuards(AccessTokenGuard)
  @Get('history')
  history(@CurrentUser() user: AuthenticatedUser) {
    return this.riskService.getHistory(user.id);
  }

  @UseGuards(AccessTokenGuard)
  @Get('latest')
  latest(@CurrentUser() user: AuthenticatedUser) {
    return this.riskService.getLatestAssessment(user.id);
  }

  @UseGuards(AccessTokenGuard)
  @Post('calculate')
  calculateRisk(@CurrentUser() user: AuthenticatedUser, @Body() body: { answers?: Record<string, number> | number[]; consent?: boolean }) {
    return this.riskService.calculateRisk(user.id, body.answers ?? [], Boolean(body.consent));
  }
}

