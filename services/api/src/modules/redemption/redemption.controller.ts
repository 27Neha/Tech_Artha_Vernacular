import { Body, Controller, Get, Ip, Post, UseGuards } from '@nestjs/common';
import { AccessTokenGuard, CurrentUser } from '../../common/auth';
import type { AuthenticatedUser } from '../../common/auth';
import { RedemptionService } from './redemption.service';
import { CreateRedemptionDto } from './redemption.dto';

@Controller('redemptions')
@UseGuards(AccessTokenGuard)
export class RedemptionController {
  constructor(private readonly redemptions: RedemptionService) {}

  @Get('holdings')
  holdings(@CurrentUser() user: AuthenticatedUser) {
    return this.redemptions.holdings(user.id);
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.redemptions.list(user.id);
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateRedemptionDto,
    @Ip() ip: string,
  ) {
    // The investor's real IP, not the hardcoded 127.0.0.1 the purchase paths still send.
    // It is part of the audit trail for the transaction, so a placeholder is not
    // acceptable here. Behind a load balancer this needs `trust proxy` enabled for
    // Express to read X-Forwarded-For rather than the balancer's own address.
    return this.redemptions.create(user.id, dto, ip);
  }
}
