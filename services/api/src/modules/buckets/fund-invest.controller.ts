import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AccessTokenGuard, CurrentUser } from '../../common/auth';
import type { AuthenticatedUser } from '../../common/auth';
import { BucketsService } from './buckets.service';
import { InvestInFundDto, StartFundSipDto } from './fund-invest.dto';

/**
 * Investing in a single fund, alongside the public fund pages under /funds.
 *
 * Lives in the buckets module rather than FundsModule because it places orders through
 * BucketsService, and BucketsModule already imports FundsModule - the reverse import
 * would be circular.
 */
@Controller('funds')
@UseGuards(AccessTokenGuard)
export class FundInvestController {
  constructor(private readonly buckets: BucketsService) {}

  /** Whether the fund can be bought, its ISIN for the 2FA challenge, and any risk mismatch. */
  @Get(':schemeCode/invest-eligibility')
  eligibility(@CurrentUser() user: AuthenticatedUser, @Param('schemeCode') schemeCode: string) {
    return this.buckets.fundEligibility(user.id, schemeCode);
  }

  @Post(':schemeCode/invest')
  invest(@CurrentUser() user: AuthenticatedUser, @Param('schemeCode') schemeCode: string, @Body() dto: InvestInFundDto) {
    return this.buckets.investInFund(user.id, schemeCode, dto);
  }

  @Post(':schemeCode/sip')
  startSip(@CurrentUser() user: AuthenticatedUser, @Param('schemeCode') schemeCode: string, @Body() dto: StartFundSipDto) {
    return this.buckets.startFundSip(user.id, schemeCode, dto);
  }
}
