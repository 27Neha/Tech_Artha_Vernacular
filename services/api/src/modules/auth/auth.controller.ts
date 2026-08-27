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

  @Post('signup/start')
  async signupStart(@Body() body: { mobile: string }) {
    return this.authService.signupStart(body.mobile);
  }

  @Post('login/start')
  async loginStart(@Body() body: { mobile: string }) {
    return this.authService.loginStart(body.mobile);
  }

  @Post('otp/verify')
  async dualFlowVerifyOtp(
    @Body() body: { mobile: string; otp: string; type: 'login' | 'signup' },
  ) {
    return this.authService.dualFlowVerifyOtp(body.mobile, body.otp, body.type);
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

  @Post('dev/generate-otp')
  @HttpCode(202)
  async devGenerateOtp(@Body() body: { mobile: string }) {
    if (process.env.NODE_ENV === 'production') {
      const { NotFoundException } = require('@nestjs/common');
      throw new NotFoundException();
    }
    const result = await this.authService.sendOtp(body.mobile, 'SMS');
    // Ensure we do not leak the devOtp to the frontend for this endpoint
    delete result.devOtp;
    return result;
  }

  @Post('logout')
  @UseGuards(AccessTokenGuard)
  @HttpCode(204)
  async logout(@CurrentUser() user: AuthenticatedUser) {
    await this.authService.logout(user.sessionId);
  }
}

