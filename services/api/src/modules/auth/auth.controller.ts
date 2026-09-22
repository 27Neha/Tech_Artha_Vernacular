import { Body, Controller, HttpCode, Post, Get, Put, UseGuards, BadRequestException } from '@nestjs/common';
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
  async signupStart(@Body() body: { mobile?: string; email?: string; channel?: 'SMS' | 'WHATSAPP' | 'EMAIL' }) {
    if (body.channel === 'EMAIL') {
      const email = body.email || (body.mobile?.includes(String.fromCharCode(64)) ? body.mobile : undefined); if (!email) throw new BadRequestException('Email is required for EMAIL channel'); body.email = email;
      return this.authService.signupStartEmail(body.email);
    }
    if (!body.mobile) throw new BadRequestException('Mobile is required for SMS/WHATSAPP channel');
    return this.authService.signupStart(body.mobile, body.channel);
  }

  @Post('login/start')
  async loginStart(@Body() body: { mobile?: string; email?: string; channel?: 'SMS' | 'WHATSAPP' | 'EMAIL' }) {
    if (body.channel === 'EMAIL') {
      const email = body.email || (body.mobile?.includes(String.fromCharCode(64)) ? body.mobile : undefined); if (!email) throw new BadRequestException('Email is required for EMAIL channel'); body.email = email;
      return this.authService.loginStartEmail(body.email);
    }
    if (!body.mobile) throw new BadRequestException('Mobile is required for SMS/WHATSAPP channel');
    return this.authService.loginStart(body.mobile, body.channel);
  }

  @Post('otp/verify')
  async dualFlowVerifyOtp(
    @Body() body: { mobile?: string; email?: string; otp: string; type: 'login' | 'signup'; password?: string },
  ) {
    const email = body.email || (body.mobile?.includes(String.fromCharCode(64)) ? body.mobile : undefined); if (email) { body.email = email;
      return this.authService.dualFlowVerifyOtpEmail(body.email, body.otp, body.type, body.password);
    }
    if (!body.mobile) throw new BadRequestException('Mobile is required');
    return this.authService.dualFlowVerifyOtp(body.mobile, body.otp, body.type, body.password);
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
    return result;
  }

  @Post('logout')
  @UseGuards(AccessTokenGuard)
  @HttpCode(204)
  async logout(@CurrentUser() user: AuthenticatedUser) {
    await this.authService.logout(user.sessionId);
  }

  @Get('me')
  @UseGuards(AccessTokenGuard)
  async getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getProfile(user.id);
  }

  @Put('me')
  @UseGuards(AccessTokenGuard)
  async updateMe(@CurrentUser() user: AuthenticatedUser, @Body() body: any) {
    return this.authService.updateProfile(user.id, body);
  }

  @UseGuards(AccessTokenGuard)
  @Get('profile')
  async getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getProfile(user.id);
  }

  @UseGuards(AccessTokenGuard)
  @Put('profile')
  async updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { fullName?: string; dateOfBirth?: string; pan?: string; clientType?: string; referralCode?: string }
  ) {
    return this.authService.updateProfile(user.id, body);
  }


}

