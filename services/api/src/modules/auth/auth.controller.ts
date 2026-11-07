import { Body, Controller, HttpCode, Post, Put, Get, UseGuards } from '@nestjs/common';
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

  @Post('check')
  @HttpCode(200)
  async check(@Body() body: { mobile?: string; email?: string }) {
    return this.authService.checkUserExists(body);
  }

  @Post('signup/start')
  async signupStart(@Body() body: { mobile?: string; email?: string; channel?: 'SMS' | 'WHATSAPP' | 'EMAIL' }) {
    const identifier = body.channel === 'EMAIL' || body.email ? (body.email ?? '') : (body.mobile ?? '');
    return this.authService.signupStart(identifier, body.channel);
  }

  @Post('login/start')
  async loginStart(@Body() body: { mobile?: string; email?: string; channel?: 'SMS' | 'WHATSAPP' | 'EMAIL' }) {
    const identifier = body.channel === 'EMAIL' || body.email ? (body.email ?? '') : (body.mobile ?? '');
    return this.authService.loginStart(identifier, body.channel);
  }

  @Post('otp/verify')
  async dualFlowVerifyOtp(
    @Body() body: { mobile?: string; email?: string; otp: string; type: 'login' | 'signup'; password?: string },
  ) {
    const identifier = body.email || body.mobile || '';
    return this.authService.dualFlowVerifyOtp(identifier, body.otp, body.type, body.password);
  }

  @Post('signup')
  async signup(@Body() body: { mobile?: string; email?: string; password?: string; clientType?: string; referralCode?: string; deviceId?: string }) {
    return this.authService.signup({
      mobile: body.mobile,
      email: body.email,
      password: body.password,
      clientType: body.clientType,
      referralCode: body.referralCode
    }, body.deviceId);
  }

  @Post('login-password')
  async loginPassword(@Body() body: { mobile?: string; email?: string; password?: string; deviceId?: string }) {
    const identifier = body.email || body.mobile || '';
    return this.authService.loginPassword(identifier, body.password ?? '', body.deviceId);
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

  /**
   * Email verification for an already signed-in investor - guarded, because this
   * attaches an address to their account rather than authenticating them.
   */
  @UseGuards(AccessTokenGuard)
  @Post('email/send-otp')
  @HttpCode(202)
  async sendEmailOtp(@CurrentUser() user: AuthenticatedUser, @Body() body: { email?: string }) {
    return this.authService.sendEmailOtp(user.id, body.email ?? '');
  }

  @UseGuards(AccessTokenGuard)
  @Post('email/verify-otp')
  @HttpCode(200)
  async verifyEmailOtp(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { email?: string; otp?: string },
  ) {
    return this.authService.verifyEmailOtp(user.id, body.email ?? '', body.otp ?? '');
  }

  /** Final step of signup: the OTP step has created the account; this sets its password. */
  @Post('password')
  @UseGuards(AccessTokenGuard)
  @HttpCode(200)
  async setPassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { password?: string; clientType?: string },
  ) {
    return this.authService.setInitialPassword(user.id, body.password ?? '', body.clientType);
  }

  @Post('logout')
  @UseGuards(AccessTokenGuard)
  @HttpCode(204)
  async logout(@CurrentUser() user: AuthenticatedUser) {
    await this.authService.logout(user.sessionId);
  }

  @UseGuards(AccessTokenGuard)
  @Get('profile')
  async getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getProfile(user.id);
  }

  /** Self-declaration of whose email and mobile number these are. */
  @UseGuards(AccessTokenGuard)
  @Put('declarations')
  async saveDeclarations(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { emailBelongsTo?: string; mobileBelongsTo?: string },
  ) {
    return this.authService.saveContactDeclarations(user.id, {
      emailBelongsTo: body.emailBelongsTo,
      mobileBelongsTo: body.mobileBelongsTo,
    });
  }

  @UseGuards(AccessTokenGuard)
  @Put('profile')
  async updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { fullName?: string; dateOfBirth?: string; pan?: string; clientType?: string; referralCode?: string }
  ) {
    return this.authService.updateProfile(user.id, body);
  }

  @UseGuards(AccessTokenGuard)
  @Post('change-password')
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { currentPassword?: string; newPassword: string }
  ) {
    return this.authService.changePassword(user.id, body.currentPassword, body.newPassword);
  }

}
