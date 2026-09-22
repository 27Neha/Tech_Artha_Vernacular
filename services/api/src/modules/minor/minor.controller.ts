import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { MinorService } from './minor.service';
import { AccessTokenGuard, CurrentUser } from '../../common/auth';
import type { AuthenticatedUser } from '../../common/auth';

@Controller('api/v1/minor')
@UseGuards(AccessTokenGuard)
export class MinorController {
  constructor(private readonly minorService: MinorService) {}

  @Get('onboarding/status')
  async getStatus(@CurrentUser() user: AuthenticatedUser) {
    return this.minorService.getOnboardingStatus(user.id);
  }

  @Post('risk-assessment')
  async saveRiskAssessment(@CurrentUser() user: AuthenticatedUser, @Body() body: any) {
    return this.minorService.saveRiskAssessment(user.id, body);
  }

  @Post('guardian')
  async saveGuardian(@CurrentUser() user: AuthenticatedUser, @Body() body: any) {
    return this.minorService.saveGuardianDetails(user.id, body);
  }

  @Post('guardian/send-otp')
  async sendOtp(@CurrentUser() user: AuthenticatedUser, @Body() body: { mobile: string }) {
    return this.minorService.sendGuardianOtp(user.id, body.mobile);
  }

  @Post('guardian/verify-otp')
  async verifyOtp(@CurrentUser() user: AuthenticatedUser, @Body() body: { mobile: string, code: string }) {
    return this.minorService.verifyGuardianOtp(user.id, body.mobile, body.code);
  }

  @Post('guardian/consent')
  async saveConsent(@CurrentUser() user: AuthenticatedUser, @Req() req: any) {
    const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    return this.minorService.saveGuardianConsent(user.id, { ipAddress, method: 'OTP' });
  }
}
