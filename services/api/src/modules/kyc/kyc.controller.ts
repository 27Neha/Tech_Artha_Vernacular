import { Controller, Post, Get, Body, UseGuards, HttpCode } from '@nestjs/common';
import { AccessTokenGuard, CurrentUser } from '../../common/auth';
import type { AuthenticatedUser } from '../../common/auth';
import { KycService } from './kyc.service';

@Controller('api/v1/kyc')
@UseGuards(AccessTokenGuard)
export class KycController {
  constructor(private readonly kycService: KycService) {}

  @Post('start')
  @HttpCode(200)
  startKyc(@CurrentUser() user: AuthenticatedUser) {
    return this.kycService.startKyc(user.id);
  }

  @Get('status')
  status(@CurrentUser() user: AuthenticatedUser) {
    return this.kycService.getKycStatus(user.id);
  }
}
