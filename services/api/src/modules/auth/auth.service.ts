import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { BELONGS_TO } from '../cybrilla/investor-options';
import { JwtService } from '@nestjs/jwt';
import { createHmac, randomBytes, randomInt, randomUUID, timingSafeEqual } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { InteraktService } from '../../integrations/interakt/interakt.service';
import { MockOtpProvider, InteraktOtpProvider, OtpChannel, OtpProvider, ChannelRoutingOtpProvider } from './otp.provider';
import { EmailOtpProvider } from './email.provider';
import { ZohoCrmService } from '../zoho/zoho.service';

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const OTP_MAX_ATTEMPTS = 5;
const OTP_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const OTP_RATE_LIMIT_COUNT = 5;

const PASSWORD_RESET_PURPOSE = 'PASSWORD_RESET';
const PASSWORD_RESET_OTP_TTL_MINUTES = 5;
const PASSWORD_RESET_OTP_TTL_MS = PASSWORD_RESET_OTP_TTL_MINUTES * 60 * 1000;
const PASSWORD_RESET_OTP_MAX_ATTEMPTS = 5;
const PASSWORD_RESET_RESEND_COOLDOWN_MS = 45 * 1000;
const PASSWORD_RESET_AUTH_TTL_MINUTES = 10;
const PASSWORD_RESET_AUTH_TTL_MS = PASSWORD_RESET_AUTH_TTL_MINUTES * 60 * 1000;
const PASSWORD_RESET_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const PASSWORD_RESET_MAX_PER_EMAIL = 5;
const PASSWORD_RESET_MAX_PER_IP = 15;
const PASSWORD_RESET_VERIFY_MAX_PER_IP = 25;

export const GENERIC_PASSWORD_RESET_MESSAGE =
  "If an account exists for this email address, we've sent a verification code.";
export const INVALID_RESET_OTP_MESSAGE = 'Incorrect code. Please try again.';
export const EXPIRED_RESET_OTP_MESSAGE = 'Your code has expired. Request a new one.';
export const TOO_MANY_OTP_ATTEMPTS_MESSAGE =
  'Too many incorrect attempts. Please request a new code.';
export const INVALID_RESET_AUTH_MESSAGE =
  'Your reset session has expired. Please start again.';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly resetEmailAttempts = new Map<string, number[]>();
  private readonly resetIpAttempts = new Map<string, number[]>();
  private readonly resetVerifyIpAttempts = new Map<string, number[]>();
  private readonly resetEmailCooldowns = new Map<string, number>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly interaktService: InteraktService,
    private readonly emailOtpProvider: EmailOtpProvider,
    private readonly zohoCrmService: ZohoCrmService,
  ) {}

  /**
   * Routes strictly between WHATSAPP (Interakt) and EMAIL (ZeptoMail).
   * SMS is completely unsupported.
   */
  private get otpProvider(): OtpProvider {
    return new ChannelRoutingOtpProvider(
      new InteraktOtpProvider(this.interaktService),
      new MockOtpProvider(),
      this.emailOtpProvider,
    );
  }

  private normalizeMobile(mobile: string) {
    const digits = mobile.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
    if (!/^\d{10}$/.test(digits)) {
      throw new BadRequestException('Enter a valid 10-digit Indian mobile number.');
    }
    return `+91${digits}`;
  }

  private normalizeEmail(email: string) {
    const normalized = (email ?? '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalized)) {
      throw new BadRequestException('Enter a valid email address.');
    }
    return normalized;
  }

  private hash(value: string) {
    return createHmac('sha256', process.env.OTP_HASH_SECRET ?? process.env.JWT_SECRET ?? 'development-only-change-me')
      .update(value)
      .digest('hex');
  }

  private syncUserToCrm(userId: string) {
    // Non-blocking asynchronous sync so CRM latency/errors never block user login or signup
    setImmediate(async () => {
      try {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          include: { profile: true, onboardingProgress: true },
        });
        if (!user) return;

        await this.zohoCrmService.createOrUpdateContact({
          mobile: user.mobile || '',
          name: user.profile?.fullName || undefined,
          email: user.email || undefined,
          onboardingStatus: user.onboardingProgress?.lastCompletedStep || 'SIGNUP',
        });
      } catch (err: any) {
        this.logger.warn(`Non-blocking Zoho CRM sync failed for user ${userId}: ${err.message}`);
      }
    });
  }

  async checkUserExists(identifier: string, isEmail: boolean): Promise<{ exists: boolean }> {
    let user;
    if (isEmail) {
      const normalizedEmail = this.normalizeEmail(identifier);
      user = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    } else {
      let normalizedMobile = identifier;
      try {
        normalizedMobile = this.normalizeMobile(identifier);
      } catch (e) {
        return { exists: false };
      }
      user = await this.prisma.user.findUnique({ where: { mobile: normalizedMobile } });
    }
    return { exists: !!user };
  }

  async sendOtp(mobile: string, channel: OtpChannel = 'WHATSAPP') {
    const targetChannel: OtpChannel = channel;

    const normalizedMobile = this.normalizeMobile(mobile);

    const requestedSince = new Date(Date.now() - OTP_RATE_LIMIT_WINDOW_MS);
    const requests = await this.prisma.otpVerification.count({
      where: { mobile: normalizedMobile, createdAt: { gte: requestedSince } },
    });
    if (requests >= OTP_RATE_LIMIT_COUNT) {
      throw new HttpException('Too many OTP requests. Please wait before trying again.', HttpStatus.TOO_MANY_REQUESTS);
    }

    // Generate a secure 4-digit code matching the investor app's 4-digit input interface
    const code = randomInt(1000, 10000).toString();

    await this.prisma.otpVerification.updateMany({
      where: { mobile: normalizedMobile, status: 'PENDING' },
      data: { status: 'SUPERSEDED' },
    });

    await this.prisma.otpVerification.create({
      data: {
        mobile: normalizedMobile,
        otpHash: this.hash(`${normalizedMobile}:${code}`),
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
        channel: targetChannel,
        status: 'PENDING',
      },
    });

    // Send OTP asynchronously so user receives instant response (< 50ms)
    this.otpProvider.send({ mobile: normalizedMobile, code, channel: targetChannel }).catch((err) => {
      this.logger.error(`Non-blocking OTP delivery error for ${normalizedMobile}: ${err?.message}`);
    });

    return {
      status: 'SENT',
      channel: targetChannel,
      delivery: this.otpProvider.mode,
      expiresInSeconds: OTP_TTL_MS / 1000,
      devOtp: process.env.NODE_ENV !== 'production' && process.env.AUTH_DEV_BYPASS === 'true' ? code : undefined,
    };
  }

  async sendOtpEmail(email: string) {
    const normalizedEmail = this.normalizeEmail(email);
    
    const requestedSince = new Date(Date.now() - OTP_RATE_LIMIT_WINDOW_MS);
    const requests = await this.prisma.otpVerification.count({ where: { email: normalizedEmail, createdAt: { gte: requestedSince } } });
    if (requests >= OTP_RATE_LIMIT_COUNT) throw new HttpException('Too many OTP requests. Please wait before trying again.', HttpStatus.TOO_MANY_REQUESTS);

    let code = randomInt(100000, 1000000).toString();

    // Store in OtpVerification
    await this.prisma.otpVerification.create({
      data: { email: normalizedEmail, otpHash: this.hash(`${normalizedEmail}:${code}`), expiresAt: new Date(Date.now() + OTP_TTL_MS), channel: 'EMAIL', status: 'PENDING' },
    });
    
    // Send via ZeptoMail asynchronously
    this.emailOtpProvider.send({ mobile: normalizedEmail, code, channel: 'EMAIL' }).catch((err) => {
      this.logger.error(`Non-blocking Email OTP delivery error for ${normalizedEmail}: ${err?.message}`);
    });

    return {
      status: 'SENT',
      channel: 'EMAIL',
      delivery: 'ZEPTOMAIL',
      expiresInSeconds: OTP_TTL_MS / 1000,
      devOtp: process.env.NODE_ENV !== 'production' && process.env.AUTH_DEV_BYPASS === 'true' ? code : undefined,
    };
  }

  async verifyOtp(mobile: string, otp: string, deviceId?: string, password?: string) {
    const normalizedMobile = this.normalizeMobile(mobile);
    await this.validateOtp(normalizedMobile, otp);
    const hashedPassword = password ? this.hash(password) : undefined;
    const user = await this.prisma.user.upsert({
      where: { mobile: normalizedMobile },
      update: { passwordHash: hashedPassword },
      create: { mobile: normalizedMobile, passwordHash: hashedPassword },
    });
    if (deviceId) {
      await this.prisma.device.upsert({
        where: { deviceId },
        update: { userId: user.id, lastActiveAt: new Date() },
        create: { userId: user.id, deviceId },
      });
    }

    this.syncUserToCrm(user.id);
    return this.createSession(user, deviceId);
  }

  async sendEmailOtp(userId: string, email: string) {
    const normalizedEmail = this.normalizeEmail(email);

    const taken = await this.prisma.user.findFirst({
      where: { email: normalizedEmail, NOT: { id: userId } },
      select: { id: true },
    });
    if (taken) throw new BadRequestException('This email is already in use on another account.');

    return this.sendOtpEmail(normalizedEmail);
  }

  async verifyEmailOtp(userId: string, email: string, otp: string) {
    const normalizedEmail = this.normalizeEmail(email);
    await this.validateOtpEmail(normalizedEmail, otp);

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { email: normalizedEmail },
      select: { id: true, email: true },
    });

    await this.prisma.auditLog.create({
      data: { userId, action: 'EMAIL_VERIFIED', details: JSON.stringify({ channel: 'EMAIL' }) },
    });

    this.syncUserToCrm(userId);
    return { verified: true, email: user.email };
  }

  async validateOtp(normalizedMobile: string, otp: string) {
    if (!/^\d{4,6}$/.test(otp)) throw new BadRequestException('Enter the 4-digit code.');
    const record = await this.prisma.otpVerification.findFirst({
      where: { mobile: normalizedMobile, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    });
    if (!record) {
      throw new BadRequestException('No pending OTP was found. Request a new code.');
    }
    if (record.expiresAt <= new Date()) {
      await this.prisma.otpVerification.update({ where: { id: record.id }, data: { status: 'EXPIRED' } });
      throw new BadRequestException('This code has expired. Request a new one.');
    }
    if (record.attempts >= OTP_MAX_ATTEMPTS) {
      await this.prisma.otpVerification.update({ where: { id: record.id }, data: { status: 'FAILED' } });
      throw new HttpException('Too many invalid attempts. Request a new code.', HttpStatus.TOO_MANY_REQUESTS);
    }

    const expected = Buffer.from(record.otpHash, 'hex');
    const actual = Buffer.from(this.hash(`${normalizedMobile}:${otp}`), 'hex');
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      await this.prisma.otpVerification.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } });
      throw new UnauthorizedException('The code is not valid.');
    }

    await this.prisma.otpVerification.update({ where: { id: record.id }, data: { status: 'VERIFIED', verifiedAt: new Date() } });
  }

  async validateOtpEmail(normalizedEmail: string, otp: string) {
    if (!/^\d{4,6}$/.test(otp)) throw new BadRequestException('Enter the 4-digit code.');
    const record = await this.prisma.otpVerification.findFirst({
      where: { email: normalizedEmail, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      throw new UnauthorizedException('Invalid or expired code.');
    }
    if (record.channel !== 'EMAIL') throw new UnauthorizedException('This code is not valid for email verification.');

    if (record.expiresAt < new Date()) {
      await this.prisma.otpVerification.update({ where: { id: record.id }, data: { status: 'EXPIRED' } });
      throw new BadRequestException('This code has expired. Request a new one.');
    }
    if (record.attempts >= OTP_MAX_ATTEMPTS) {
      await this.prisma.otpVerification.update({ where: { id: record.id }, data: { status: 'FAILED' } });
      throw new HttpException('Too many invalid attempts. Request a new code.', HttpStatus.TOO_MANY_REQUESTS);
    }

    const expected = Buffer.from(record.otpHash, 'hex');
    const actual = Buffer.from(this.hash(`${normalizedEmail}:${otp}`), 'hex');
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      await this.prisma.otpVerification.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } });
      throw new UnauthorizedException('The code is not valid.');
    }

    await this.prisma.otpVerification.update({ where: { id: record.id }, data: { status: 'VERIFIED', verifiedAt: new Date() } });
  }

  async signupStart(mobile: string, channel: 'WHATSAPP' | 'EMAIL' | 'SMS' = 'WHATSAPP') {
    const targetChannel = channel === 'SMS' ? 'WHATSAPP' : channel;
    const normalizedMobile = this.normalizeMobile(mobile);
    const existing = await this.prisma.user.findUnique({ where: { mobile: normalizedMobile } });
    if (existing) throw new HttpException('User already exists.', HttpStatus.CONFLICT);

    return this.sendOtp(mobile, targetChannel);
  }

  async loginStart(mobile: string, channel: 'WHATSAPP' | 'EMAIL' | 'SMS' = 'WHATSAPP') {
    const targetChannel = channel === 'SMS' ? 'WHATSAPP' : channel;
    const normalizedMobile = this.normalizeMobile(mobile);
    const existing = await this.prisma.user.findUnique({ where: { mobile: normalizedMobile } });
    if (!existing) throw new HttpException('User not found.', HttpStatus.NOT_FOUND);

    return this.sendOtp(mobile, targetChannel);
  }

  async signupStartEmail(email: string) {
    const normalizedEmail = this.normalizeEmail(email);
    const existing = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) throw new HttpException('User already exists.', HttpStatus.CONFLICT);

    return this.sendOtpEmail(email);
  }

  async loginStartEmail(email: string) {
    const normalizedEmail = this.normalizeEmail(email);
    const existing = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!existing) throw new HttpException('User not found.', HttpStatus.NOT_FOUND);

    return this.sendOtpEmail(email);
  }

  async dualFlowVerifyOtp(mobile: string, otp: string, type: 'login' | 'signup', password?: string) {
    const normalizedMobile = this.normalizeMobile(mobile);
    await this.validateOtp(normalizedMobile, otp);

    if (type === 'signup') {
      let user = await this.prisma.user.findUnique({ where: { mobile: normalizedMobile } });
      if (!user) {
        user = await this.prisma.user.create({
          data: {
            mobile: normalizedMobile,
            passwordHash: password ? this.hash(password) : null,
          },
        });
        await this.prisma.onboardingProgress.create({
          data: { userId: user.id, step: 'SIGNUP', lastCompletedStep: 'SIGNUP' },
        });
      }
      this.syncUserToCrm(user.id);
      const sessionData = await this.createSession(user);
      return { ...sessionData, success: true, message: 'OTP verified. Proceed to password creation.' };
    } else {
      const user = await this.prisma.user.findUnique({
        where: { mobile: normalizedMobile },
        include: { onboardingProgress: true },
      });
      if (!user) throw new HttpException('User not found.', HttpStatus.NOT_FOUND);
      const sessionData = await this.createSession(user);
      return { ...sessionData, lastCompletedStep: user.onboardingProgress?.lastCompletedStep || null };
    }
  }

  /**
   * Sets the password at the end of signup. The OTP step has already created the account
   * and signed the investor in, so this acts on that session rather than on a mobile
   * number in the body - otherwise anyone could set a password on someone else's
   * passwordless account. Changing an existing password is a different flow.
   */
  async setInitialPassword(userId: string, password: string, clientType?: string) {
    if (!password || password.length < 8) throw new BadRequestException('Password must be at least 8 characters.');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('Account not found.');
    if (user.passwordHash) throw new BadRequestException('A password is already set on this account.');

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: this.hash(password), ...(clientType ? { clientType } : {}) },
    });
    return { status: 'PASSWORD_SET' };
  }

  async dualFlowVerifyOtpEmail(email: string, otp: string, type: 'login' | 'signup', password?: string) {
    const normalizedEmail = this.normalizeEmail(email);
    await this.validateOtpEmail(normalizedEmail, otp);

    if (type === 'signup') {
      let user = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
      if (!user) {
        user = await this.prisma.user.create({
          data: {
            email: normalizedEmail,
            passwordHash: password ? this.hash(password) : null,
          },
        });
        await this.prisma.onboardingProgress.create({
          data: { userId: user.id, step: 'SIGNUP', lastCompletedStep: 'SIGNUP' },
        });
      }
      this.syncUserToCrm(user.id);
      const sessionData = await this.createSession({ id: user.id, mobile: user.mobile || '', email: user.email });
      return { ...sessionData, success: true, message: 'OTP verified. Proceed to password creation.' };
    } else {
      const user = await this.prisma.user.findUnique({
        where: { email: normalizedEmail },
        include: { onboardingProgress: true },
      });
      if (!user) throw new HttpException('User not found.', HttpStatus.NOT_FOUND);
      const sessionData = await this.createSession({ id: user.id, mobile: user.mobile || '', email: user.email });
      return { ...sessionData, lastCompletedStep: user.onboardingProgress?.lastCompletedStep || null };
    }
  }

  async signup(
    input: { mobile?: string; email?: string; password?: string; clientType?: string; referralCode?: string },
    deviceId?: string,
  ) {
    let normalizedMobile;
    let normalizedEmail;

    if (input.email) {
      normalizedEmail = this.normalizeEmail(input.email);
      const existing = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
      if (existing) throw new BadRequestException('An account with this email address already exists.');

      const record = await this.prisma.otpVerification.findFirst({
        where: { email: normalizedEmail, status: 'VERIFIED' },
        orderBy: { createdAt: 'desc' },
      });
      if (!record) throw new BadRequestException('Please verify your email address first.');

      const user = await this.prisma.user.create({
        data: {
          email: normalizedEmail,
          passwordHash: input.password ? this.hash(input.password) : null,
          clientType: input.clientType,
          referralCode: input.referralCode,
        },
      });
      await this.prisma.onboardingProgress.create({
        data: { userId: user.id, step: 'SIGNUP', lastCompletedStep: 'SIGNUP' },
      });
      if (deviceId) {
        await this.prisma.device.upsert({
          where: { deviceId },
          update: { userId: user.id, lastActiveAt: new Date() },
          create: { userId: user.id, deviceId },
        });
      }

      this.syncUserToCrm(user.id);
      return this.createSession({ id: user.id, mobile: user.mobile || '', email: user.email }, deviceId);
    } else if (input.mobile) {
      normalizedMobile = this.normalizeMobile(input.mobile);
      const existing = await this.prisma.user.findUnique({ where: { mobile: normalizedMobile } });
      if (existing) throw new BadRequestException('An account with this mobile number already exists.');

      const record = await this.prisma.otpVerification.findFirst({
        where: { mobile: normalizedMobile, status: 'VERIFIED' },
        orderBy: { createdAt: 'desc' },
      });
      if (!record) throw new BadRequestException('Please verify your mobile number first.');

      const user = await this.prisma.user.create({
        data: {
          mobile: normalizedMobile,
          passwordHash: input.password ? this.hash(input.password) : null,
          clientType: input.clientType,
          referralCode: input.referralCode,
        },
      });
      await this.prisma.onboardingProgress.create({
        data: { userId: user.id, step: 'SIGNUP', lastCompletedStep: 'SIGNUP' },
      });
      if (deviceId) {
        await this.prisma.device.upsert({
          where: { deviceId },
          update: { userId: user.id, lastActiveAt: new Date() },
          create: { userId: user.id, deviceId },
        });
      }

      this.syncUserToCrm(user.id);
      return this.createSession(user, deviceId);
    }
    throw new BadRequestException('Mobile or Email is required');
  }

  async loginPassword(identifier: string, isEmail: boolean, password?: string, deviceId?: string) {
    if (!password) throw new BadRequestException('Password is required.');

    let user;
    if (isEmail) {
      const normalizedEmail = this.normalizeEmail(identifier);
      user = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    } else {
      const normalizedMobile = this.normalizeMobile(identifier);
      user = await this.prisma.user.findUnique({ where: { mobile: normalizedMobile } });
    }
    if (!user) throw new UnauthorizedException('Invalid credentials.');
    if (!user.passwordHash) throw new UnauthorizedException('Account has no password set. Login via OTP.');

    const expected = Buffer.from(user.passwordHash, 'hex');
    const actual = Buffer.from(this.hash(password), 'hex');
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    if (deviceId) {
      await this.prisma.device.upsert({
        where: { deviceId },
        update: { userId: user.id, lastActiveAt: new Date() },
        create: { userId: user.id, deviceId },
      });
    }
    return this.createSession(user, deviceId);
  }

  async refresh(refreshToken: string) {
    if (!refreshToken) throw new UnauthorizedException('A refresh token is required.');
    const session = await this.prisma.session.findFirst({
      where: { refreshToken: this.hash(refreshToken), isActive: true, expiresAt: { gt: new Date() } },
      include: { user: true },
    });
    if (!session) throw new UnauthorizedException('Refresh token is invalid or expired.');
    return this.createSession(session.user, session.deviceId ?? undefined, session.id);
  }

  async logout(sessionId: string) {
    await this.prisma.session.updateMany({ where: { id: sessionId }, data: { isActive: false } });
  }

  async createSession(
    user: { id: string; mobile?: string | null; email?: string | null },
    deviceId?: string,
    replacingSessionId?: string,
  ) {
    if (replacingSessionId) {
      await this.prisma.session.update({ where: { id: replacingSessionId }, data: { isActive: false } });
    }
    const sessionId = randomUUID();
    const refreshToken = randomUUID() + randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const accessToken = await this.jwtService.signAsync({ sub: user.id, mobile: user.mobile ?? '', sid: sessionId });
    await this.prisma.session.create({
      data: {
        id: sessionId,
        userId: user.id,
        token: this.hash(accessToken),
        refreshToken: this.hash(refreshToken),
        expiresAt,
        deviceId,
      },
    });
    await this.prisma.auditLog.create({
      data: { userId: user.id, action: 'SESSION_CREATED', details: JSON.stringify({ deviceBound: Boolean(deviceId) }) },
    });
    return { accessToken, access_token: accessToken, refreshToken, expiresAt, user: { id: user.id, mobile: user.mobile ?? '', email: user.email ?? '' } };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true, riskProfile: true, onboardingProgress: true },
    });
    if (!user) throw new Error('User not found');
    return {
      id: user.id,
      mobile: user.mobile,
      email: user.email,
      emailBelongsTo: user.emailBelongsTo,
      mobileBelongsTo: user.mobileBelongsTo,
      clientType: user.clientType,
      profile: user.profile,
      riskProfile: user.riskProfile,
      onboardingProgress: user.onboardingProgress,
    };
  }

  /**
   * The investor's self-declaration of whose email and mobile number these are
   * (Cybrilla compliance points 1 and 3). Each is the investor's own choice from
   * Cybrilla's belongs_to list; nothing is assumed, so an undeclared field stays null
   * and investing is refused until it is answered.
   */
  async saveContactDeclarations(userId: string, data: { emailBelongsTo?: string; mobileBelongsTo?: string }) {
    for (const [field, value] of Object.entries(data)) {
      if (value !== undefined && !(BELONGS_TO as readonly string[]).includes(value)) {
        throw new BadRequestException(`${field} must be one of: ${BELONGS_TO.join(', ')}.`);
      }
    }
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.emailBelongsTo !== undefined && { emailBelongsTo: data.emailBelongsTo }),
        ...(data.mobileBelongsTo !== undefined && { mobileBelongsTo: data.mobileBelongsTo }),
      },
    });
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'CONTACT_DECLARATION',
        details: JSON.stringify({ emailBelongsTo: user.emailBelongsTo, mobileBelongsTo: user.mobileBelongsTo }),
      },
    });
    return { emailBelongsTo: user.emailBelongsTo, mobileBelongsTo: user.mobileBelongsTo };
  }

  async setPassword(userId: string, password: string) {
    const hashedPassword = this.hash(password);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hashedPassword },
    });
    return { success: true };
  }

  /**
   * Shared strong password policy enforced consistently across signup and password reset:
   * minimum 8 characters, at least one uppercase, lowercase, digit, and special character.
   */
  validatePasswordPolicy(password: string) {
    if (!password || typeof password !== 'string') {
      throw new BadRequestException('New password is required.');
    }
    if (password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters.');
    }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
      throw new BadRequestException(
        'Password must include at least one uppercase letter, lowercase letter, number, and special character.',
      );
    }
  }

  private normalizeResetEmail(email: string) {
    const normalized = (email ?? '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalized)) {
      throw new BadRequestException('Please enter a valid email address.');
    }
    return normalized;
  }

  private pruneAndPushRateWindow(store: Map<string, number[]>, key: string, maxRequests: number) {
    const now = Date.now();
    const cutoff = now - PASSWORD_RESET_RATE_LIMIT_WINDOW_MS;
    const recent = (store.get(key) ?? []).filter((ts) => ts > cutoff);
    if (recent.length >= maxRequests) {
      store.set(key, recent);
      throw new HttpException(
        'Too many requests. Please wait a few minutes and try again.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    recent.push(now);
    store.set(key, recent);
  }

  async requestPasswordReset(email: string, meta?: { ip?: string }) {
    const normalizedEmail = this.normalizeResetEmail(email);

    const nowMs = Date.now();
    const lastSentAt = this.resetEmailCooldowns.get(normalizedEmail);
    if (lastSentAt && nowMs - lastSentAt < PASSWORD_RESET_RESEND_COOLDOWN_MS) {
      const waitSeconds = Math.ceil((PASSWORD_RESET_RESEND_COOLDOWN_MS - (nowMs - lastSentAt)) / 1000);
      throw new HttpException(
        `Please wait ${waitSeconds} seconds before requesting a new code.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    this.pruneAndPushRateWindow(
      this.resetEmailAttempts,
      normalizedEmail,
      PASSWORD_RESET_MAX_PER_EMAIL,
    );
    if (meta?.ip) {
      this.pruneAndPushRateWindow(this.resetIpAttempts, meta.ip, PASSWORD_RESET_MAX_PER_IP);
    }

    this.resetEmailCooldowns.set(normalizedEmail, nowMs);

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, isActive: true },
    });

    // Privacy safeguard: do not reveal whether an account exists for this email.
    if (!user || !user.isActive) {
      return {
        status: 'OK',
        message: GENERIC_PASSWORD_RESET_MESSAGE,
        expiresInSeconds: PASSWORD_RESET_OTP_TTL_MINUTES * 60,
        cooldownSeconds: PASSWORD_RESET_RESEND_COOLDOWN_MS / 1000,
      };
    }

    const code = String(randomInt(0, 1000000)).padStart(6, '0');
    const otpHash = this.hash(`pwdreset-otp:${user.id}:${normalizedEmail}:${code}`);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + PASSWORD_RESET_OTP_TTL_MS);

    const createdRecord = await this.prisma.$transaction(async (tx) => {
      await tx.passwordResetOtp.updateMany({
        where: {
          userId: user.id,
          purpose: PASSWORD_RESET_PURPOSE,
          status: 'PENDING',
          usedAt: null,
        },
        data: { status: 'SUPERSEDED', usedAt: now },
      });

      await tx.passwordResetToken.updateMany({
        where: {
          userId: user.id,
          purpose: PASSWORD_RESET_PURPOSE,
          usedAt: null,
        },
        data: { usedAt: now },
      });

      return tx.passwordResetOtp.create({
        data: {
          userId: user.id,
          email: normalizedEmail,
          purpose: PASSWORD_RESET_PURPOSE,
          otpHash,
          expiresAt,
          attempts: 0,
          maxAttempts: PASSWORD_RESET_OTP_MAX_ATTEMPTS,
          status: 'PENDING',
        },
      });
    });

    try {
      await this.emailOtpProvider.sendPasswordResetOtpEmail({
        email: normalizedEmail,
        code,
        expiresInMinutes: PASSWORD_RESET_OTP_TTL_MINUTES,
      });
    } catch (error) {
      // Do not keep cooldown or unmailed OTP active if email delivery fails.
      if (lastSentAt !== undefined) {
        this.resetEmailCooldowns.set(normalizedEmail, lastSentAt);
      } else {
        this.resetEmailCooldowns.delete(normalizedEmail);
      }

      await this.prisma.passwordResetOtp.updateMany({
        where: { id: createdRecord.id, status: 'PENDING', usedAt: null },
        data: { status: 'DELIVERY_FAILED', usedAt: new Date() },
      });

      await this.prisma.auditLog
        .create({
          data: {
            userId: user.id,
            action: 'PASSWORD_RESET_OTP_DELIVERY_FAILED',
            ipAddress: meta?.ip,
            result: 'FAILURE',
            details: JSON.stringify({
              reason: error instanceof Error ? error.message : 'Email delivery failed',
            }),
          },
        })
        .catch(() => undefined);

      throw error;
    }

    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'PASSWORD_RESET_OTP_REQUESTED',
        ipAddress: meta?.ip,
        result: 'SUCCESS',
      },
    });

    return {
      status: 'OK',
      message: GENERIC_PASSWORD_RESET_MESSAGE,
      expiresInSeconds: PASSWORD_RESET_OTP_TTL_MINUTES * 60,
      cooldownSeconds: PASSWORD_RESET_RESEND_COOLDOWN_MS / 1000,
    };
  }

  async verifyPasswordResetOtp(email: string, otp: string, meta?: { ip?: string }) {
    const normalizedEmail = this.normalizeResetEmail(email);
    const cleanOtp = (otp ?? '').trim();
    if (!/^\d{6}$/.test(cleanOtp)) {
      throw new BadRequestException('Please enter the 6-digit verification code.');
    }

    if (meta?.ip) {
      this.pruneAndPushRateWindow(
        this.resetVerifyIpAttempts,
        meta.ip,
        PASSWORD_RESET_VERIFY_MAX_PER_IP,
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, isActive: true },
    });

    if (!user || !user.isActive) {
      throw new BadRequestException(INVALID_RESET_OTP_MESSAGE);
    }

    const record = await this.prisma.passwordResetOtp.findFirst({
      where: {
        userId: user.id,
        email: normalizedEmail,
        purpose: PASSWORD_RESET_PURPOSE,
        status: 'PENDING',
        usedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      throw new BadRequestException(INVALID_RESET_OTP_MESSAGE);
    }

    const now = new Date();
    if (record.expiresAt <= now) {
      await this.prisma.passwordResetOtp.updateMany({
        where: { id: record.id, status: 'PENDING', usedAt: null },
        data: { status: 'EXPIRED', usedAt: now },
      });
      throw new BadRequestException(EXPIRED_RESET_OTP_MESSAGE);
    }

    if (record.attempts >= record.maxAttempts) {
      await this.prisma.passwordResetOtp.updateMany({
        where: { id: record.id, status: 'PENDING', usedAt: null },
        data: { status: 'FAILED', usedAt: now },
      });
      throw new HttpException(TOO_MANY_OTP_ATTEMPTS_MESSAGE, HttpStatus.TOO_MANY_REQUESTS);
    }

    const expected = Buffer.from(record.otpHash, 'hex');
    const actual = Buffer.from(
      this.hash(`pwdreset-otp:${user.id}:${normalizedEmail}:${cleanOtp}`),
      'hex',
    );

    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      const updated = await this.prisma.passwordResetOtp.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      });
      if (updated.attempts >= updated.maxAttempts) {
        await this.prisma.passwordResetOtp.updateMany({
          where: { id: record.id, status: 'PENDING', usedAt: null },
          data: { status: 'FAILED', usedAt: new Date() },
        });
        throw new HttpException(TOO_MANY_OTP_ATTEMPTS_MESSAGE, HttpStatus.TOO_MANY_REQUESTS);
      }
      throw new BadRequestException(INVALID_RESET_OTP_MESSAGE);
    }

    const rawAuthorization = randomBytes(32).toString('hex');
    const authHash = this.hash(`pwdreset-auth:${rawAuthorization}`);
    const authExpiresAt = new Date(now.getTime() + PASSWORD_RESET_AUTH_TTL_MS);

    await this.prisma.$transaction(async (tx) => {
      const consumed = await tx.passwordResetOtp.updateMany({
        where: {
          id: record.id,
          status: 'PENDING',
          usedAt: null,
          expiresAt: { gt: now },
          attempts: { lt: record.maxAttempts },
        },
        data: { status: 'VERIFIED', usedAt: now },
      });
      if (consumed.count !== 1) {
        throw new BadRequestException(EXPIRED_RESET_OTP_MESSAGE);
      }

      await tx.passwordResetToken.updateMany({
        where: {
          userId: user.id,
          purpose: PASSWORD_RESET_PURPOSE,
          usedAt: null,
        },
        data: { usedAt: now },
      });

      await tx.passwordResetToken.create({
        data: {
          userId: user.id,
          purpose: PASSWORD_RESET_PURPOSE,
          tokenHash: authHash,
          expiresAt: authExpiresAt,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'PASSWORD_RESET_OTP_VERIFIED',
          ipAddress: meta?.ip,
          result: 'SUCCESS',
        },
      });
    });

    return {
      status: 'VERIFIED',
      resetAuthorization: rawAuthorization,
      expiresInSeconds: PASSWORD_RESET_AUTH_TTL_MINUTES * 60,
    };
  }

  async resetPassword(resetAuthorization: string, newPassword: string) {
    const rawAuth = (resetAuthorization ?? '').trim();
    if (!rawAuth || rawAuth.length < 32) {
      throw new BadRequestException(INVALID_RESET_AUTH_MESSAGE);
    }

    this.validatePasswordPolicy(newPassword);

    const tokenHash = this.hash(`pwdreset-auth:${rawAuth}`);
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: { select: { id: true, isActive: true } } },
    });

    const now = new Date();
    if (
      !record ||
      record.purpose !== PASSWORD_RESET_PURPOSE ||
      record.usedAt !== null ||
      record.expiresAt <= now ||
      !record.user?.isActive
    ) {
      throw new BadRequestException(INVALID_RESET_AUTH_MESSAGE);
    }

    const newPasswordHash = this.hash(newPassword);

    await this.prisma.$transaction(async (tx) => {
      const consumed = await tx.passwordResetToken.updateMany({
        where: {
          id: record.id,
          purpose: PASSWORD_RESET_PURPOSE,
          usedAt: null,
          expiresAt: { gt: now },
        },
        data: { usedAt: now },
      });
      if (consumed.count !== 1) {
        throw new BadRequestException(INVALID_RESET_AUTH_MESSAGE);
      }

      await tx.passwordResetToken.updateMany({
        where: {
          userId: record.userId,
          purpose: PASSWORD_RESET_PURPOSE,
          usedAt: null,
        },
        data: { usedAt: now },
      });

      await tx.passwordResetOtp.updateMany({
        where: {
          userId: record.userId,
          purpose: PASSWORD_RESET_PURPOSE,
          status: 'PENDING',
          usedAt: null,
        },
        data: { status: 'SUPERSEDED', usedAt: now },
      });

      await tx.user.update({
        where: { id: record.userId },
        data: { passwordHash: newPasswordHash },
      });

      // Revoke all existing sessions and refresh tokens upon password reset
      await tx.session.updateMany({
        where: { userId: record.userId, isActive: true },
        data: { isActive: false },
      });

      await tx.auditLog.create({
        data: {
          userId: record.userId,
          action: 'PASSWORD_RESET_COMPLETED',
          result: 'SUCCESS',
          details: JSON.stringify({ sessionsRevoked: true }),
        },
      });
    });

    return {
      status: 'OK',
      message: 'Your password has been changed successfully.',
    };
  }

  async updateProfile(
    userId: string,
    data: { fullName?: string; dateOfBirth?: string; pan?: string; clientType?: string; referralCode?: string; gender?: string },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (data.clientType || data.referralCode) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          ...(data.clientType && { clientType: data.clientType }),
          ...(data.referralCode && { referralCode: data.referralCode }),
        },
      });
    }

    let parsedDate: Date | undefined = undefined;
    let age: number | undefined = undefined;
    let investorType: string | undefined = undefined;
    let majorityDate: Date | undefined = undefined;

    if (data.dateOfBirth && typeof data.dateOfBirth === 'string' && data.dateOfBirth.trim()) {
      const trimmedDob = data.dateOfBirth.trim();
      if (trimmedDob.includes('/')) {
        const parts = trimmedDob.split('/');
        if (parts.length === 3) {
          parsedDate = new Date(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`);
        }
      } else {
        parsedDate = new Date(trimmedDob);
      }

      if (parsedDate && !isNaN(parsedDate.getTime())) {
        const today = new Date();
        age = today.getFullYear() - parsedDate.getFullYear();
        const mDiff = today.getMonth() - parsedDate.getMonth();
        if (mDiff < 0 || (mDiff === 0 && today.getDate() < parsedDate.getDate())) {
          age--;
        }

        investorType = age >= 18 ? 'ADULT' : 'MINOR';
        majorityDate = new Date(parsedDate);
        majorityDate.setFullYear(majorityDate.getFullYear() + 18);
      } else {
        parsedDate = undefined;
      }
    }

    const profileData: any = {
      ...(data.fullName?.trim() && { fullName: data.fullName.trim() }),
      ...(data.pan?.trim() && { pan: data.pan.trim().toUpperCase() }),
      ...(data.gender && { gender: data.gender }),
      ...(parsedDate && { dateOfBirth: parsedDate }),
      ...(typeof age === 'number' && !isNaN(age) && { age }),
      ...(investorType && { investorType }),
      ...(majorityDate && !isNaN(majorityDate.getTime()) && { majorityDate }),
    };

    await this.prisma.userProfile.upsert({
      where: { userId },
      update: profileData,
      create: {
        userId,
        ...profileData,
      },
    });

    if (data.fullName?.trim()) {
      await this.prisma.onboardingProgress.upsert({
        where: { userId },
        update: {
          step: data.pan ? 'KYC' : 'PERSONAL_INFO',
          lastCompletedStep: 'PERSONAL_INFO',
          percentage: data.pan ? 50 : 25,
        },
        create: {
          userId,
          step: data.pan ? 'KYC' : 'PERSONAL_INFO',
          lastCompletedStep: 'PERSONAL_INFO',
          percentage: data.pan ? 50 : 25,
          completed: false,
        },
      });
    }

    this.syncUserToCrm(userId);
    return { success: true, investorType };
  }
}
