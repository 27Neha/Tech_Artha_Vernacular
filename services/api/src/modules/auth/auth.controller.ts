import { Body, Controller, HttpCode, Post, Get, Put, UseGuards, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AccessTokenGuard, CurrentUser } from '../../common/auth';
import type { AuthenticatedUser } from '../../common/auth';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('check')
  @HttpCode(200)
  async checkUser(@Body() body: { mobile?: string; email?: string }) {
    if (body.email) {
      return this.authService.checkUserExists(body.email, true);
    }
    if (body.mobile) {
      return this.authService.checkUserExists(body.mobile, false);
    }
    throw new BadRequestException('Mobile or email is required');
  }

  @Post('send-otp')
  @HttpCode(202)
  async sendOtp(@Body() body: { mobile?: string; channel?: 'WHATSAPP' | 'EMAIL' | 'SMS' }) {
    const channel = body.channel === 'SMS' ? 'WHATSAPP' : (body.channel ?? 'WHATSAPP');
    return this.authService.sendOtp(body.mobile ?? '', channel as any);
  }

  @Post('verify-otp')
  async verifyOtp(
    @Body() body: { mobile?: string; otp?: string; deviceId?: string },
  ) {
    return this.authService.verifyOtp(body.mobile ?? '', body.otp ?? '', body.deviceId);
  }

  @Post('signup/start')
  async signupStart(@Body() body: { mobile?: string; email?: string; channel?: 'WHATSAPP' | 'EMAIL' | 'SMS' }) {
    if (body.channel === 'EMAIL') {
      const email = body.email || (body.mobile?.includes('@') ? body.mobile : undefined);
      if (!email) throw new BadRequestException('Email is required for EMAIL channel');
      body.email = email;
      return this.authService.signupStartEmail(body.email);
    }
    if (!body.mobile) throw new BadRequestException('Mobile is required for mobile channel');
    const channel = body.channel === 'SMS' ? 'WHATSAPP' : (body.channel ?? 'WHATSAPP');
    return this.authService.signupStart(body.mobile, channel as any);
  }

  @Post('login/start')
  async loginStart(@Body() body: { mobile?: string; email?: string; channel?: 'WHATSAPP' | 'EMAIL' | 'SMS' }) {
    if (body.channel === 'EMAIL') {
      const email = body.email || (body.mobile?.includes('@') ? body.mobile : undefined);
      if (!email) throw new BadRequestException('Email is required for EMAIL channel');
      body.email = email;
      return this.authService.loginStartEmail(body.email);
    }
    if (!body.mobile) throw new BadRequestException('Mobile is required for mobile channel');
    const channel = body.channel === 'SMS' ? 'WHATSAPP' : (body.channel ?? 'WHATSAPP');
    return this.authService.loginStart(body.mobile, channel as any);
  }

  @Post('otp/verify')
  async dualFlowVerifyOtp(
    @Body() body: { mobile?: string; email?: string; otp: string; type: 'login' | 'signup'; password?: string },
  ) {
    const email = body.email || (body.mobile?.includes('@') ? body.mobile : undefined);
    if (email) {
      body.email = email;
      return this.authService.dualFlowVerifyOtpEmail(body.email, body.otp, body.type, body.password);
    }
    if (!body.mobile) throw new BadRequestException('Mobile is required');
    return this.authService.dualFlowVerifyOtp(body.mobile, body.otp, body.type, body.password);
  }

  @Post('signup')
  async signup(
    @Body()
    body: {
      mobile?: string;
      email?: string;
      password?: string;
      clientType?: string;
      referralCode?: string;
      deviceId?: string;
    },
  ) {
    return this.authService.signup(
      {
        mobile: body.mobile,
        email: body.email,
        password: body.password,
        clientType: body.clientType,
        referralCode: body.referralCode,
      },
      body.deviceId,
    );
  }

  @Post('login-password')
  async loginPassword(@Body() body: { mobile?: string; email?: string; password?: string; deviceId?: string }) {
    if (body.email) {
      return this.authService.loginPassword(body.email, true, body.password ?? '', body.deviceId);
    }
    return this.authService.loginPassword(body.mobile ?? '', false, body.password ?? '', body.deviceId);
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
    return this.authService.sendOtp(body.mobile, 'WHATSAPP');
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

  @Put('password')
  @UseGuards(AccessTokenGuard)
  async updatePassword(@CurrentUser() user: AuthenticatedUser, @Body() body: { password: string }) {
    return this.authService.setPassword(user.id, body.password);
  }

  @Put('profile')
  @UseGuards(AccessTokenGuard)
  async updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: { fullName?: string; dateOfBirth?: string; pan?: string; clientType?: string; referralCode?: string; gender?: string },
  ) {
    return this.authService.updateProfile(user.id, body);
  }
}
