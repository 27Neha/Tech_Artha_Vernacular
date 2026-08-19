import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AccessTokenGuard, CurrentUser } from '../../common/auth';
import type { AuthenticatedUser } from '../../common/auth';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('send-otp')
  @HttpCode(202)
  async sendOtp(@Body() body: { mobile?: string; channel?: 'SMS' | 'WHATSAPP' | 'EMAIL' }) {
    return this.authService.sendOtp(body.mobile ?? '', body.channel ?? 'SMS');
  }

  @Post('verify-otp')
  async verifyOtp(
    @Body() body: { mobile?: string; otp?: string; deviceId?: string },
  ) {
    return this.authService.verifyOtp(body.mobile ?? '', body.otp ?? '', body.deviceId);
  }

  @Post('signup')
  async signup(@Body() body: { mobile?: string; password?: string; clientType?: string; referralCode?: string; deviceId?: string }) {
    return this.authService.signup({
      mobile: body.mobile ?? '',
      password: body.password,
      clientType: body.clientType,
      referralCode: body.referralCode
    }, body.deviceId);
  }

  @Post('login-password')
  async loginPassword(@Body() body: { mobile?: string; password?: string; deviceId?: string }) {
    return this.authService.loginPassword(body.mobile ?? '', body.password ?? '', body.deviceId);
  }

  @Post('refresh')
  @HttpCode(200)
  refresh(@Body('refreshToken') refreshToken: string) {
    return this.authService.refresh(refreshToken ?? '');
  }

  @Post('logout')
  @UseGuards(AccessTokenGuard)
  @HttpCode(204)
  async logout(@CurrentUser() user: AuthenticatedUser) {
    await this.authService.logout(user.sessionId);
  }
}

