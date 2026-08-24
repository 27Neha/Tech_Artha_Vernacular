import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AccessTokenGuard, CurrentUser } from '../../common/auth';
import type { AuthenticatedUser } from '../../common/auth';
import { RiskService } from './risk.service';

@Controller('risk')
@UseGuards(AccessTokenGuard)
export class RiskController {
  constructor(private readonly riskService: RiskService) {}

  @Get('questionnaire')
  questionnaire() {
    return this.riskService.questionnaire();
  }

  @Post('calculate')
  calculateRisk(@CurrentUser() user: AuthenticatedUser, @Body() body: { answers?: Record<string, number> | number[]; consent?: boolean }) {
    return this.riskService.calculateRisk(user.id, body.answers ?? [], Boolean(body.consent));
  }
}
