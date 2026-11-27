import { Body, Controller, HttpCode, Post, Put, Get, Delete, Param, UseGuards, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AccessTokenGuard, CurrentUser } from '../../common/auth';
import type { AuthenticatedUser } from '../../common/auth';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('send-otp')
  @HttpCode(202)
  async sendOtp(@Body() body: { mobile?: string; email?: string; channel?: 'SMS' | 'WHATSAPP' | 'EMAIL' }) {
    const identifier = body.channel === 'EMAIL' || body.email ? (body.email ?? body.mobile ?? '') : (body.mobile ?? '');
    return this.authService.sendOtp(identifier, body.channel ?? 'SMS');
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
  @Get('notifications/unread-count')
  async getUnreadNotificationCount(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getUnreadNotificationCount(user.id);
  }

  @UseGuards(AccessTokenGuard)
  @Get('notifications/:id')
  async getSingleNotification(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.authService.getSingleNotification(user.id, id);
  }

  @UseGuards(AccessTokenGuard)
  @Post('notifications/read')
  @HttpCode(200)
  async markNotificationsRead(@CurrentUser() user: AuthenticatedUser, @Body() body: { ids?: string[] }) {
    return this.authService.markNotificationsRead(user.id, body?.ids);
  }

  @UseGuards(AccessTokenGuard)
  @Put('notifications/:id/read')
  @HttpCode(200)
  async markSingleNotificationRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.authService.markSingleNotificationRead(user.id, id);
  }

  @UseGuards(AccessTokenGuard)
  @Delete('notifications/:id')
  @HttpCode(200)
  async deleteNotification(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.authService.deleteNotification(user.id, id);
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


  @Post('forgot-password')
  @HttpCode(200)
  async forgotPassword(@Body() body: { email?: string; mobile?: string }) {
    const identifier = body.email?.trim() || body.mobile?.trim();
    if (!identifier) {
      throw new BadRequestException('Mobile number or email address is required.');
    }
    return this.authService.requestPasswordResetOtp(identifier);
  }

  @Post('reset-password/verify-otp')
  @HttpCode(200)
  async verifyResetPasswordOtp(@Body() body: { email?: string; mobile?: string; otp?: string }) {
    const identifier = body.email?.trim() || body.mobile?.trim();
    if (!identifier || !body.otp) {
      throw new BadRequestException('Mobile number or email and OTP are required.');
    }
    return this.authService.verifyPasswordResetOtp(identifier, body.otp);
  }

  @Post('verify-password-reset-otp')
  @HttpCode(200)
  async verifyPasswordResetOtpAlias(@Body() body: { email?: string; mobile?: string; otp?: string }) {
    return this.verifyResetPasswordOtp(body);
  }

  @Post('reset-password')
  @HttpCode(200)
  async resetPassword(@Body() body: { resetToken?: string; resetAuthorization?: string; newPassword?: string }) {
    const token = body.resetToken || body.resetAuthorization;
    if (!token || !body.newPassword) {
      throw new BadRequestException('Reset token and new password are required.');
    }
    return this.authService.resetPassword(token, body.newPassword);
  }

}
