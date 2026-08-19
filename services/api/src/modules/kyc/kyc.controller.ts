import { BadRequestException, Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { AccessTokenGuard, CurrentUser } from '../../common/auth';
import type { AuthenticatedUser } from '../../common/auth';
import { KycService } from './kyc.service';

@Controller('kyc')
@UseGuards(AccessTokenGuard)
export class KycController {
  constructor(private readonly kycService: KycService) {}

  @Post('start')
  @HttpCode(202)
  startKyc(@CurrentUser() user: AuthenticatedUser, @Body() body: { fullName?: string; pan?: string; consent?: boolean; deviceId?: string }) {
    if (!body.consent) throw new BadRequestException('KYC consent is required.');
    if (!body.fullName?.trim()) throw new BadRequestException('Provide your full name as per PAN.');
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(body.pan?.toUpperCase() ?? '')) throw new BadRequestException('Provide a valid PAN number (for example, ABCDE1234F).');
    return this.kycService.startKyc({ userId: user.id, fullName: body.fullName.trim(), pan: body.pan!.toUpperCase(), consent: true, deviceId: body.deviceId });
  }

  @Get('status')
  status(@CurrentUser() user: AuthenticatedUser) {
    return this.kycService.getKycStatus(user.id);
  }
}
