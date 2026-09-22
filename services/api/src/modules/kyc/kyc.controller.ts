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
  startKyc(@CurrentUser() user: AuthenticatedUser, @Body() body: { fullName?: string; pan?: string; dob?: string }) {
    return this.kycService.startKyc(user.id, body.fullName ?? '', body.pan ?? '', body.dob ?? '');
  }

  @Get('status')
  status(@CurrentUser() user: AuthenticatedUser) {
    return this.kycService.getKycStatus(user.id);
  }

  @Post('digilocker/start')
  @HttpCode(200)
  generateDigilockerUrl(@CurrentUser() user: AuthenticatedUser, @Body() body: { redirectUrl: string }) {
    return this.kycService.generateDigilockerUrl(user.id, body.redirectUrl);
  }

  @Post('esign/start')
  @HttpCode(200)
  generateEsignUrl(@CurrentUser() user: AuthenticatedUser, @Body() body: { redirectUrl: string }) {
    return this.kycService.generateEsignUrl(user.id, body.redirectUrl);
  }
}
