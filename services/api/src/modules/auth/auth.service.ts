import { BadRequestException, HttpException, HttpStatus, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { BELONGS_TO } from '../cybrilla/investor-options';
import { JwtService } from '@nestjs/jwt';
import { createHmac, randomInt, randomUUID, timingSafeEqual } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { InteraktService } from '../../integrations/interakt/interakt.service';
import { MockOtpProvider, InteraktOtpProvider, OtpChannel, OtpProvider, ChannelRoutingOtpProvider } from './otp.provider';
import { EmailOtpProvider } from './email.provider';

const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const OTP_RATE_LIMIT_COUNT = 5;

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

  constructor(
    private readonly prisma: PrismaService, 
    private readonly jwtService: JwtService,
    private readonly interaktService: InteraktService,
  ) {}

  /**
   * Routes by CHANNEL, not by a single configured provider.
   *
   * Previously this returned InteraktOtpProvider for every request when
   * OTP_PROVIDER=interakt - and that provider silently returns without sending for any
   * channel other than WHATSAPP. So an SMS request answered 202 while delivering
   * nothing, which is why the web app's "Send via SMS" button and the minor guardian
   * OTP both appeared to work and never arrived.
   *
   * ChannelRoutingOtpProvider already handled this correctly; it was written, imported
   * and never instantiated. It sends WHATSAPP via Interakt, EMAIL via ZeptoMail, and
   * SMS via msg91 or the dev mock depending on OTP_SMS_MODE - and throws, rather than
   * silently succeeding, when a channel has no provider configured.
   */
  private get otpProvider(): OtpProvider {
    const providerStr = (process.env.OTP_PROVIDER ?? 'mock').toLowerCase();
    if (providerStr === 'mock') return new MockOtpProvider();

    return new ChannelRoutingOtpProvider(
      new InteraktOtpProvider(this.interaktService),
      new MockOtpProvider(),
      new EmailOtpProvider(),
    );
  }

  private normalizeMobile(mobile: string) {
    const digits = mobile.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
    if (!/^\d{10}$/.test(digits)) throw new BadRequestException('Enter a valid 10-digit Indian mobile number.');
    return `+91${digits}`;
  }

  private hash(value: string) {
    return createHmac('sha256', process.env.OTP_HASH_SECRET ?? process.env.JWT_SECRET ?? 'development-only-change-me')
      .update(value)
      .digest('hex');
  }

  async sendOtp(mobile: string, channel: OtpChannel) {
    if (!['SMS', 'WHATSAPP', 'EMAIL'].includes(channel)) throw new BadRequestException('Unsupported OTP channel.');
    if (channel === 'EMAIL' || (mobile && mobile.includes('@'))) {
      return this.sendEmailOtp('send-otp', mobile);
    }
    const normalizedMobile = this.normalizeMobile(mobile);

    const requestedSince = new Date(Date.now() - OTP_RATE_LIMIT_WINDOW_MS);
    const requests = await this.prisma.otpVerification.count({ where: { mobile: normalizedMobile, createdAt: { gte: requestedSince } } });
    if (requests >= OTP_RATE_LIMIT_COUNT) throw new HttpException('Too many OTP requests. Please wait before trying again.', HttpStatus.TOO_MANY_REQUESTS);

    const isDevSmsMock =
      process.env.NODE_ENV !== 'production' &&
      (process.env.OTP_SMS_MODE ?? 'mock').toLowerCase() === 'mock';

    let code = randomInt(1000, 10000).toString();
    if (channel === 'SMS' && isDevSmsMock) {
      code = '1234';
    }
    await this.prisma.otpVerification.updateMany({
      where: { mobile: normalizedMobile, status: 'PENDING' },
      data: { status: 'SUPERSEDED' },
    });
    await this.prisma.otpVerification.create({
      data: { mobile: normalizedMobile, otpHash: this.hash(`${normalizedMobile}:${code}`), expiresAt: new Date(Date.now() + OTP_TTL_MS), channel, status: 'PENDING' },
    });
    await this.otpProvider.send({ mobile: normalizedMobile, code, channel });

    return {
      status: 'SENT',
      channel,
      delivery: this.otpProvider.mode,
      expiresInSeconds: OTP_TTL_MS / 1000,
      // devOtp removed: code logged server-side only
    };
  }

  async verifyOtp(mobile: string, otp: string, deviceId?: string, password?: string) {
    const normalizedMobile = this.normalizeMobile(mobile);
    await this.validateOtp(normalizedMobile, otp);
    const hashedPassword = password ? this.hash(password) : undefined;
    const user = await this.prisma.user.upsert({ 
      where: { mobile: normalizedMobile }, 
      update: { passwordHash: hashedPassword }, 
      create: { mobile: normalizedMobile, passwordHash: hashedPassword } 
    });
    if (deviceId) {
      await this.prisma.device.upsert({ where: { deviceId }, update: { userId: user.id, lastActiveAt: new Date() }, create: { userId: user.id, deviceId } });
    }
    return this.createSession(user, deviceId);
  }

  /**
   * Email verification, for the distributor compliance requirement that an investor's
   * email be verified rather than merely typed in.
   *
   * Deliberately NOT routed through sendOtp(): that applies normalizeMobile() before it
   * looks at the channel, so an email address is rejected as "not a valid 10-digit
   * Indian mobile number" long before EmailOtpProvider is reached. A separate entry
   * point avoids changing the mobile login path, which works.
   *
   * The OTP itself reuses the existing storage and validateOtp(), so expiry, attempt
   * limits and the timing-safe comparison all behave identically - the identifier
   * column just holds an email instead of a number.
   */
  private normalizeEmail(email: string) {
    const normalized = (email ?? '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalized)) {
      throw new BadRequestException('Enter a valid email address.');
    }
    return normalized;
  }

  async sendEmailOtp(userId: string, email: string) {
    const normalizedEmail = this.normalizeEmail(email);

    // Someone else having verified this address would let one account claim another's
    // email, so it is rejected before a code is ever sent.
    const taken = await this.prisma.user.findFirst({
      where: { email: normalizedEmail, NOT: { id: userId } },
      select: { id: true },
    });
    if (taken) throw new BadRequestException('This email is already in use on another account.');

    const requestedSince = new Date(Date.now() - OTP_RATE_LIMIT_WINDOW_MS);
    const requests = await this.prisma.otpVerification.count({
      where: { mobile: normalizedEmail, createdAt: { gte: requestedSince } },
    });
    if (requests >= OTP_RATE_LIMIT_COUNT) {
      throw new HttpException('Too many requests. Please wait before trying again.', HttpStatus.TOO_MANY_REQUESTS);
    }

    const code = randomInt(1000, 10000).toString();

    await this.prisma.otpVerification.updateMany({
      where: { mobile: normalizedEmail, status: 'PENDING' },
      data: { status: 'SUPERSEDED' },
    });
    await this.prisma.otpVerification.create({
      data: {
        mobile: normalizedEmail,
        email: normalizedEmail,
        otpHash: this.hash(`${normalizedEmail}:${code}`),
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
        channel: 'EMAIL',
        status: 'PENDING',
      },
    });

    // EmailOtpProvider takes the recipient in its `mobile` field - the name is wrong,
    // the behaviour is right. Always send via ZeptoMail and do not fall back to mock/devOtp.
    await new EmailOtpProvider().send({ mobile: normalizedEmail, code, channel: 'EMAIL' });

    return {
      status: 'SENT',
      channel: 'EMAIL',
      expiresInSeconds: OTP_TTL_MS / 1000,
    };
  }

  async verifyEmailOtp(userId: string, email: string, otp: string) {
    const normalizedEmail = this.normalizeEmail(email);
    await this.validateOtp(normalizedEmail, otp);

    // User.email is only ever written after a verified code, so a non-null email IS the
    // verification flag - there is no separate boolean to fall out of sync with it.
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { email: normalizedEmail },
      select: { id: true, email: true },
    });

    await this.prisma.auditLog.create({
      data: { userId, action: 'EMAIL_VERIFIED', details: JSON.stringify({ channel: 'EMAIL' }) },
    });

    return { verified: true, email: user.email };
  }

  async validateOtp(normalizedMobile: string, otp: string) {
    if (!/^\d{4,6}$/.test(otp)) throw new BadRequestException('Enter the 4-digit code.');
    const record = await this.prisma.otpVerification.findFirst({
      where: { mobile: normalizedMobile, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    });
    if (!record) throw new BadRequestException('No pending OTP was found. Request a new code.');
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

  async checkUserExists(identifier: { mobile?: string; email?: string }): Promise<{ exists: boolean }> {
    if (identifier.email) {
      const normalizedEmail = this.normalizeEmail(identifier.email);
      const user = await this.prisma.user.findFirst({ where: { email: normalizedEmail } });
      return { exists: Boolean(user) };
    }
    if (identifier.mobile) {
      const normalizedMobile = this.normalizeMobile(identifier.mobile);
      const user = await this.prisma.user.findUnique({ where: { mobile: normalizedMobile } });
      return { exists: Boolean(user) };
    }
    return { exists: false };
  }

  async signupStart(identifier: string, channel: 'SMS' | 'WHATSAPP' | 'EMAIL' = 'SMS') {
    if (channel === 'EMAIL' || identifier.includes('@')) {
      const normalizedEmail = this.normalizeEmail(identifier);
      const existing = await this.prisma.user.findFirst({ where: { email: normalizedEmail } });
      if (existing) throw new HttpException('User already exists.', HttpStatus.CONFLICT);
      return this.sendEmailOtp('signup', normalizedEmail);
    }

    const normalizedMobile = this.normalizeMobile(identifier);
    const existing = await this.prisma.user.findUnique({ where: { mobile: normalizedMobile } });
    if (existing) throw new HttpException('User already exists.', HttpStatus.CONFLICT);
    
    return this.sendOtp(identifier, channel);
  }

  async loginStart(identifier: string, channel: 'SMS' | 'WHATSAPP' | 'EMAIL' = 'SMS') {
    if (channel === 'EMAIL' || identifier.includes('@')) {
      const normalizedEmail = this.normalizeEmail(identifier);
      const existing = await this.prisma.user.findFirst({ where: { email: normalizedEmail } });
      if (!existing) throw new HttpException('User not found.', HttpStatus.NOT_FOUND);
      return this.sendEmailOtp(existing.id, normalizedEmail);
    }

    const normalizedMobile = this.normalizeMobile(identifier);
    const existing = await this.prisma.user.findUnique({ where: { mobile: normalizedMobile } });
    if (!existing) throw new HttpException('User not found.', HttpStatus.NOT_FOUND);
    
    return this.sendOtp(identifier, channel);
  }

  async dualFlowVerifyOtp(identifier: string, otp: string, type: 'login' | 'signup', password?: string) {
    const isEmail = identifier.includes('@');
    const normalized = isEmail ? this.normalizeEmail(identifier) : this.normalizeMobile(identifier);
    await this.validateOtp(normalized, otp);
    
    if (type === 'signup') {
      const hashedPassword = password ? this.hash(password) : undefined;
      const user = isEmail
        ? await this.prisma.user.upsert({
            where: { email: normalized },
            update: { passwordHash: hashedPassword },
            create: { email: normalized, passwordHash: hashedPassword },
          })
        : await this.prisma.user.upsert({ 
            where: { mobile: normalized }, 
            update: { passwordHash: hashedPassword }, 
            create: { mobile: normalized, passwordHash: hashedPassword } 
          });
      const progress = await this.prisma.onboardingProgress.upsert({
        where: { userId: user.id },
        update: { lastCompletedStep: 'SIGNUP', step: 'SIGNUP' },
        create: { userId: user.id, step: 'SIGNUP', lastCompletedStep: 'SIGNUP' }
      });
      const sessionData = await this.createSession(user);
      return { ...sessionData, lastCompletedStep: progress.lastCompletedStep };
    } else {
      const user = isEmail
        ? await this.prisma.user.findFirst({ where: { email: normalized }, include: { onboardingProgress: true } })
        : await this.prisma.user.findUnique({ where: { mobile: normalized }, include: { onboardingProgress: true } });
      if (!user) throw new HttpException('User not found.', HttpStatus.NOT_FOUND);
      const sessionData = await this.createSession(user);
      return { ...sessionData, lastCompletedStep: user.onboardingProgress?.lastCompletedStep || null };
    }
  }

  async signup(input: { mobile?: string; email?: string; password?: string; clientType?: string; referralCode?: string }, deviceId?: string) {
    if (input.password) {
      this.validatePasswordComplexity(input.password);
    }
    const rawIdentifier = input.email || input.mobile || '';
    const isEmail = rawIdentifier.includes('@');

    if (isEmail) {
      const normalizedEmail = this.normalizeEmail(rawIdentifier);
      const existing = await this.prisma.user.findFirst({ where: { email: normalizedEmail } });
      if (existing && existing.passwordHash) {
        throw new BadRequestException('An account with this email already exists.');
      }
      const user = existing
        ? await this.prisma.user.update({
            where: { id: existing.id },
            data: {
              passwordHash: input.password ? this.hash(input.password) : existing.passwordHash,
              ...(input.clientType ? { clientType: input.clientType } : {}),
              ...(input.referralCode ? { referralCode: input.referralCode } : {}),
            },
          })
        : await this.prisma.user.create({
            data: {
              email: normalizedEmail,
              passwordHash: input.password ? this.hash(input.password) : null,
              clientType: input.clientType,
              referralCode: input.referralCode,
            },
          });
      if (deviceId) {
        await this.prisma.device.upsert({ where: { deviceId }, update: { userId: user.id, lastActiveAt: new Date() }, create: { userId: user.id, deviceId } });
      }
      return this.createSession(user, deviceId);
    }

    const normalizedMobile = this.normalizeMobile(rawIdentifier);
    const existing = await this.prisma.user.findUnique({ where: { mobile: normalizedMobile } });
    if (existing && existing.passwordHash) {
      throw new BadRequestException('An account with this mobile number already exists.');
    }
    
    const user = existing
      ? await this.prisma.user.update({
          where: { id: existing.id },
          data: {
            passwordHash: input.password ? this.hash(input.password) : existing.passwordHash,
            ...(input.clientType ? { clientType: input.clientType } : {}),
            ...(input.referralCode ? { referralCode: input.referralCode } : {}),
          },
        })
      : await this.prisma.user.create({
          data: {
            mobile: normalizedMobile,
            passwordHash: input.password ? this.hash(input.password) : null,
            clientType: input.clientType,
            referralCode: input.referralCode,
          }
        });
    
    if (deviceId) {
      await this.prisma.device.upsert({ where: { deviceId }, update: { userId: user.id, lastActiveAt: new Date() }, create: { userId: user.id, deviceId } });
    }
    return this.createSession(user, deviceId);
  }

  /**
   * Sets the password at the end of signup. The OTP step has already created the account
   * and signed the investor in, so this acts on that session rather than on a mobile
   * number in the body - otherwise anyone could set a password on someone else's
   * passwordless account. Changing an existing password is a different flow.
   */
  async setInitialPassword(userId: string, password: string, clientType?: string) {
    this.validatePasswordComplexity(password);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('Account not found.');
    if (user.passwordHash) throw new BadRequestException('A password is already set on this account.');

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: this.hash(password), ...(clientType ? { clientType } : {}) },
    });
    return { status: 'PASSWORD_SET' };
  }

  async loginPassword(identifier: string, passwordOrIsEmail?: string | boolean, deviceIdOrPassword?: string, deviceId?: string) {
    const password = typeof passwordOrIsEmail === 'boolean' ? deviceIdOrPassword : passwordOrIsEmail;
    const finalDeviceId = typeof passwordOrIsEmail === 'boolean' ? deviceId : deviceIdOrPassword;
    const isEmail = identifier.includes('@');
    const normalized = isEmail ? this.normalizeEmail(identifier) : this.normalizeMobile(identifier);
    if (!password) throw new BadRequestException('Password is required.');
    
    const user = isEmail
      ? await this.prisma.user.findFirst({ where: { email: normalized } })
      : await this.prisma.user.findUnique({ where: { mobile: normalized } });
    if (!user) throw new UnauthorizedException('Invalid credentials.');
    if (!user.passwordHash) throw new UnauthorizedException('Account has no password set. Login via OTP.');
    
    const expected = Buffer.from(user.passwordHash, 'hex');
    const actual = Buffer.from(this.hash(password), 'hex');
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      throw new UnauthorizedException('Invalid credentials.');
    }
    
    if (deviceId) {
      await this.prisma.device.upsert({ where: { deviceId }, update: { userId: user.id, lastActiveAt: new Date() }, create: { userId: user.id, deviceId } });
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

  async createSession(user: { id: string; mobile?: string | null }, deviceId?: string, replacingSessionId?: string) {
    if (replacingSessionId) await this.prisma.session.update({ where: { id: replacingSessionId }, data: { isActive: false } });
    const sessionId = randomUUID();
    const refreshToken = randomUUID() + randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const accessToken = await this.jwtService.signAsync({ sub: user.id, mobile: user.mobile ?? '', sid: sessionId });
    await this.prisma.session.create({
      data: { id: sessionId, userId: user.id, token: this.hash(accessToken), refreshToken: this.hash(refreshToken), expiresAt, deviceId },
    });
    await this.prisma.auditLog.create({ data: { userId: user.id, action: 'SESSION_CREATED', details: JSON.stringify({ deviceBound: Boolean(deviceId) }) } });
    return { accessToken, access_token: accessToken, refreshToken, expiresAt, user: { id: user.id, mobile: user.mobile ?? '' } };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true, riskProfile: true, onboardingProgress: true }
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

  async getNotifications(userId: string) {
    if (!userId) {
      return { notifications: [], unreadCount: 0 };
    }

    // Exclude technical records, internal agent alerts, test logs, and support ticket records
    const excludedTypes = [
      'AGENT_NEW_TICKET_ALERT',
      'TECHNICAL_LOG',
      'INTERNAL_TICKET',
      'SUPPORT_INTERNAL',
      'SUPPORT_ACKNOWLEDGEMENT',
      'ADMIN_ALERT',
      'TEST',
    ];

    const list = await this.prisma.notification.findMany({
      where: {
        userId,
        channel: { notIn: ['ADMIN_PORTAL', 'INTERNAL', 'SYSTEM_AUDIT'] },
        type: { notIn: excludedTypes },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const unreadCount = list.filter((n) => n.status !== 'READ').length;
    return { notifications: list, unreadCount };
  }

  async markNotificationsRead(userId: string, ids?: string[]) {
    if (!userId) {
      return { unreadCount: 0, success: false };
    }

    const excludedTypes = [
      'AGENT_NEW_TICKET_ALERT',
      'TECHNICAL_LOG',
      'INTERNAL_TICKET',
      'SUPPORT_INTERNAL',
      'SUPPORT_ACKNOWLEDGEMENT',
      'ADMIN_ALERT',
      'TEST',
    ];

    await this.prisma.notification.updateMany({
      where: {
        userId,
        channel: { notIn: ['ADMIN_PORTAL', 'INTERNAL', 'SYSTEM_AUDIT'] },
        type: { notIn: excludedTypes },
        ...(Array.isArray(ids) && ids.length > 0 ? { id: { in: ids } } : { status: { not: 'READ' } }),
      },
      data: { status: 'READ' },
    });

    const unreadCount = await this.prisma.notification.count({
      where: {
        userId,
        status: { not: 'READ' },
        channel: { notIn: ['ADMIN_PORTAL', 'INTERNAL', 'SYSTEM_AUDIT'] },
        type: { notIn: excludedTypes },
      },
    });
    return { unreadCount, success: true };
  }

  async getUnreadNotificationCount(userId: string) {
    if (!userId) {
      return { unreadCount: 0 };
    }
    const excludedTypes = [
      'AGENT_NEW_TICKET_ALERT',
      'TECHNICAL_LOG',
      'INTERNAL_TICKET',
      'SUPPORT_INTERNAL',
      'SUPPORT_ACKNOWLEDGEMENT',
      'ADMIN_ALERT',
      'TEST',
    ];
    const unreadCount = await this.prisma.notification.count({
      where: {
        userId,
        status: { not: 'READ' },
        channel: { notIn: ['ADMIN_PORTAL', 'INTERNAL', 'SYSTEM_AUDIT'] },
        type: { notIn: excludedTypes },
      },
    });
    return { unreadCount };
  }

  async getSingleNotification(userId: string, id: string) {
    if (!userId || !id) {
      throw new BadRequestException('User ID and Notification ID are required.');
    }
    const excludedTypes = [
      'AGENT_NEW_TICKET_ALERT',
      'TECHNICAL_LOG',
      'INTERNAL_TICKET',
      'SUPPORT_INTERNAL',
      'SUPPORT_ACKNOWLEDGEMENT',
      'ADMIN_ALERT',
      'TEST',
    ];
    const notif = await this.prisma.notification.findFirst({
      where: {
        id,
        userId,
        channel: { notIn: ['ADMIN_PORTAL', 'INTERNAL', 'SYSTEM_AUDIT'] },
        type: { notIn: excludedTypes },
      },
    });
    if (!notif) {
      throw new NotFoundException('Notification not found or access denied.');
    }
    return notif;
  }

  async markSingleNotificationRead(userId: string, id: string) {
    if (!userId || !id) {
      throw new BadRequestException('User ID and Notification ID are required.');
    }
    const notif = await this.prisma.notification.findFirst({
      where: { id, userId },
    });
    if (!notif) {
      throw new NotFoundException('Notification not found or access denied.');
    }
    await this.prisma.notification.update({
      where: { id },
      data: { status: 'READ' },
    });
    return this.getUnreadNotificationCount(userId);
  }

  async deleteNotification(userId: string, id: string) {
    if (!userId || !id) {
      throw new BadRequestException('User ID and Notification ID are required.');
    }
    const notif = await this.prisma.notification.findFirst({
      where: { id, userId },
    });
    if (!notif) {
      throw new NotFoundException('Notification not found or access denied.');
    }
    await this.prisma.notification.delete({
      where: { id },
    });
    return { success: true, message: 'Notification removed.' };
  }

  /**
   * Validate password complexity:
   * - Minimum 8 characters
   * - At least one uppercase letter (A-Z)
   * - At least one lowercase letter (a-z)
   * - At least one number (0-9)
   * - At least one special character (@, #, $, %, &, !, etc.)
   */
  validatePasswordComplexity(password: string): void {
    if (!password || password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters long.');
    }
    if (!/[A-Z]/.test(password)) {
      throw new BadRequestException('Password must contain at least one uppercase letter (A-Z).');
    }
    if (!/[a-z]/.test(password)) {
      throw new BadRequestException('Password must contain at least one lowercase letter (a-z).');
    }
    if (!/[0-9]/.test(password)) {
      throw new BadRequestException('Password must contain at least one number (0-9).');
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) {
      throw new BadRequestException('Password must contain at least one special character (such as @, #, $, %, &, !).');
    }
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

  async updateProfile(userId: string, data: { fullName?: string; dateOfBirth?: string; pan?: string; clientType?: string; referralCode?: string }) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    if (data.clientType || data.referralCode) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          ...(data.clientType && { clientType: data.clientType }),
          ...(data.referralCode && { referralCode: data.referralCode })
        }
      });
    }

    let parsedDate = undefined;
    let age = undefined;
    let investorType = undefined;
    let majorityDate = undefined;

    if (data.dateOfBirth) {
      if (data.dateOfBirth.includes('/')) {
        const [d, m, y] = data.dateOfBirth.split('/');
        parsedDate = new Date(`${y}-${m}-${d}`);
      } else {
        parsedDate = new Date(data.dateOfBirth);
      }
      
      const today = new Date();
      age = today.getFullYear() - parsedDate.getFullYear();
      const mDiff = today.getMonth() - parsedDate.getMonth();
      if (mDiff < 0 || (mDiff === 0 && today.getDate() < parsedDate.getDate())) {
        age--;
      }
      
      investorType = age >= 18 ? 'ADULT' : 'MINOR';
      majorityDate = new Date(parsedDate);
      majorityDate.setFullYear(majorityDate.getFullYear() + 18);
    }

    const profileData: any = {
      ...(data.fullName && { fullName: data.fullName }),
      ...(data.pan && { pan: data.pan }),
      ...(parsedDate && { dateOfBirth: parsedDate }),
      ...(age !== undefined && { age }),
      ...(investorType && { investorType }),
      ...(majorityDate && { majorityDate })
    };

    let profile = await this.prisma.userProfile.findUnique({ where: { userId } });

    if (profile) {
      await this.prisma.userProfile.update({
        where: { userId },
        data: profileData
      });
    } else {
      await this.prisma.userProfile.create({
        data: {
          userId,
          ...profileData
        }
      });
    }
    return { success: true, investorType };
  }

  async changePassword(userId: string, currentPassword?: string, newPassword?: string) {
    this.validatePasswordComplexity(newPassword || '');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found.');

    if (user.passwordHash) {
      if (!currentPassword) {
        throw new BadRequestException('Current password is required to change password.');
      }
      const expected = Buffer.from(user.passwordHash, 'hex');
      const actual = Buffer.from(this.hash(currentPassword), 'hex');
      if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
        throw new BadRequestException('Current password is incorrect.');
      }
    }

    const hashedPassword = this.hash(newPassword!);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hashedPassword },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'PASSWORD_CHANGED',
        details: JSON.stringify({ hasPreviousPassword: Boolean(user.passwordHash), timestamp: new Date() }),
      },
    });

    return { success: true, message: 'Password updated successfully.' };
  }


  
  async requestPasswordReset(email: string, meta?: { ip?: string }) {
    const res = await this.requestPasswordResetOtp(email);
    return {
      status: 'OK',
      message: GENERIC_PASSWORD_RESET_MESSAGE,
      expiresInSeconds: res.expiresInSeconds,
      cooldownSeconds: 45,
    };
  }

  async requestPasswordResetOtp(identifier: string) {
    const isEmail = identifier.includes('@');
    if (!isEmail) {
      const normalizedMobile = this.normalizeMobile(identifier);
      const user = await this.prisma.user.findUnique({ where: { mobile: normalizedMobile } });
      if (!user) {
        this.logger.log(`Password reset requested for non-existent mobile: ${normalizedMobile}`);
        return {
          status: 'SENT',
          message: 'If an account exists with this mobile number, a verification code has been sent.',
          expiresInSeconds: OTP_TTL_MS / 1000,
        };
      }

      const requestedSince = new Date(Date.now() - OTP_RATE_LIMIT_WINDOW_MS);
      const requests = await this.prisma.otpVerification.count({
        where: { mobile: normalizedMobile, createdAt: { gte: requestedSince } },
      });
      if (requests >= OTP_RATE_LIMIT_COUNT) {
        throw new HttpException('Too many OTP requests. Please wait before trying again.', HttpStatus.TOO_MANY_REQUESTS);
      }

      const isDevSmsMock =
        process.env.NODE_ENV !== 'production' &&
        (process.env.OTP_SMS_MODE ?? 'mock').toLowerCase() === 'mock';
      const code = isDevSmsMock ? '1234' : randomInt(100000, 1000000).toString();

      await this.prisma.otpVerification.updateMany({
        where: { mobile: normalizedMobile, status: 'PENDING' },
        data: { status: 'SUPERSEDED' },
      });

      await this.prisma.otpVerification.create({
        data: {
          mobile: normalizedMobile,
          otpHash: this.hash(`RESET_PASSWORD:${normalizedMobile}:${code}`),
          expiresAt: new Date(Date.now() + OTP_TTL_MS),
          channel: 'SMS',
          status: 'PENDING',
        },
      });

      await this.otpProvider.send({ mobile: normalizedMobile, code, channel: 'SMS' });

      return {
        status: 'SENT',
        message: 'If an account exists with this mobile number, a verification code has been sent.',
        expiresInSeconds: OTP_TTL_MS / 1000,
        // devOtp removed: code logged server-side only
      };
    }

    const normalizedEmail = this.normalizeEmail(identifier);

    // Anti-enumeration: Check if user exists. If not, don't throw an error to the client.
    const user = await this.prisma.user.findFirst({ where: { email: normalizedEmail } });
    if (!user) {
      this.logger.log(`Password reset requested for non-existent email: ${normalizedEmail}`);
      return {
        status: 'SENT',
        message: 'If an account exists with this email address, a verification code has been sent.',
        expiresInSeconds: OTP_TTL_MS / 1000,
      };
    }

    const requestedSince = new Date(Date.now() - OTP_RATE_LIMIT_WINDOW_MS);
    const requests = await this.prisma.otpVerification.count({
      where: { mobile: normalizedEmail, createdAt: { gte: requestedSince } },
    });
    if (requests >= OTP_RATE_LIMIT_COUNT) {
      throw new HttpException('Too many OTP requests. Please wait before trying again.', HttpStatus.TOO_MANY_REQUESTS);
    }

    const code = randomInt(100000, 1000000).toString();

    await this.prisma.otpVerification.updateMany({
      where: { mobile: normalizedEmail, status: 'PENDING' },
      data: { status: 'SUPERSEDED' },
    });

    await this.prisma.otpVerification.create({
      data: {
        mobile: normalizedEmail,
        email: normalizedEmail,
        otpHash: this.hash(`RESET_PASSWORD:${normalizedEmail}:${code}`),
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
        channel: 'EMAIL',
        status: 'PENDING',
      },
    });

    await new EmailOtpProvider().send({
      mobile: normalizedEmail,
      code,
      channel: 'EMAIL',
      subject: 'TechArtha Password Reset OTP',
      heading: 'Reset your TechArtha password',
      description: 'Enter this verification code in the TechArtha app to reset your password.',
    });

    return {
      status: 'SENT',
      message: 'If an account exists with this email address, a verification code has been sent.',
      expiresInSeconds: OTP_TTL_MS / 1000,
      // devOtp removed: code logged server-side only
    };
  }

  async verifyPasswordResetOtp(identifier: string, otp: string) {
    const isEmail = identifier.includes('@');
    const normalizedTarget = isEmail ? this.normalizeEmail(identifier) : this.normalizeMobile(identifier);
    const cleanOtp = (otp ?? '').trim();
    if (!/^\d{4,6}$/.test(cleanOtp)) {
      throw new BadRequestException('Enter a valid verification code.');
    }

    const user = isEmail
      ? await this.prisma.user.findFirst({ where: { email: normalizedTarget } })
      : await this.prisma.user.findUnique({ where: { mobile: normalizedTarget } });
    if (!user) {
      throw new UnauthorizedException('Invalid or expired verification code.');
    }

    const record = await this.prisma.otpVerification.findFirst({
      where: { mobile: normalizedTarget, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      throw new BadRequestException('No pending password reset request found. Please request a new code.');
    }

    if (record.expiresAt <= new Date()) {
      await this.prisma.otpVerification.update({ where: { id: record.id }, data: { status: 'EXPIRED' } });
      throw new BadRequestException('This code has expired. Please request a new code.');
    }

    if (record.attempts >= OTP_MAX_ATTEMPTS) {
      await this.prisma.otpVerification.update({ where: { id: record.id }, data: { status: 'FAILED' } });
      throw new HttpException('Too many invalid attempts. Please request a new code.', HttpStatus.TOO_MANY_REQUESTS);
    }

    const expected = Buffer.from(record.otpHash, 'hex');
    const actual = Buffer.from(this.hash(`RESET_PASSWORD:${normalizedTarget}:${cleanOtp}`), 'hex');
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      await this.prisma.otpVerification.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } });
      throw new UnauthorizedException('The code is incorrect.');
    }

    await this.prisma.otpVerification.update({
      where: { id: record.id },
      data: { status: 'VERIFIED', verifiedAt: new Date() },
    });

    const resetToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        ...(isEmail ? { email: normalizedTarget } : { mobile: normalizedTarget }),
        purpose: 'PASSWORD_RESET',
        otpId: record.id,
      },
      { expiresIn: '15m' },
    );

    return {
      verified: true,
      status: 'OK',
      resetToken,
      resetAuthorization: resetToken,
      message: 'OTP verified successfully.',
    };
  }

  async resetPassword(resetToken: string, newPassword: string) {
    this.validatePasswordComplexity(newPassword);

    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(resetToken);
    } catch {
      throw new UnauthorizedException('Reset session has expired or is invalid. Please start again.');
    }

    if (payload?.purpose !== 'PASSWORD_RESET' || !payload?.sub || !payload?.otpId) {
      throw new UnauthorizedException('Invalid reset authorization.');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      throw new NotFoundException('Account not found.');
    }

    const otpRecord = await this.prisma.otpVerification.findUnique({ where: { id: payload.otpId } });
    if (!otpRecord || otpRecord.status !== 'VERIFIED') {
      throw new UnauthorizedException('This reset authorization has already been used or is invalid.');
    }

    if (!otpRecord.verifiedAt || (Date.now() - otpRecord.verifiedAt.getTime() > 15 * 60 * 1000)) {
      throw new UnauthorizedException('Reset session has expired. Please request a new OTP.');
    }

    const hashedPassword = this.hash(newPassword!);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hashedPassword },
    });

    await this.prisma.otpVerification.update({
      where: { id: otpRecord.id },
      data: { status: 'CONSUMED' },
    });

    await this.prisma.session.updateMany({
      where: { userId: user.id },
      data: { isActive: false },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'PASSWORD_RESET',
        details: JSON.stringify({
          email: payload.email || null,
          mobile: payload.mobile || null,
          channel: payload.mobile ? 'SMS' : 'EMAIL',
          timestamp: new Date(),
        }),
      },
    });

    return {
      success: true,
      status: 'OK',
      message: 'Your password has been successfully reset.',
    };
  }

}
