import { BadRequestException, HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHmac, randomInt, randomUUID, timingSafeEqual } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { MockOtpProvider, OtpChannel, OtpProvider, ProductionOtpProvider } from './otp.provider';

const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const OTP_RATE_LIMIT_COUNT = 5;

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwtService: JwtService) {}

  private get otpProvider(): OtpProvider {
    return (process.env.OTP_PROVIDER ?? 'mock').toLowerCase() === 'mock'
      ? new MockOtpProvider()
      : new ProductionOtpProvider();
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
    const normalizedMobile = this.normalizeMobile(mobile);
    if (!['SMS', 'WHATSAPP', 'EMAIL'].includes(channel)) throw new BadRequestException('Unsupported OTP channel.');

    const requestedSince = new Date(Date.now() - OTP_RATE_LIMIT_WINDOW_MS);
    const requests = await this.prisma.otpVerification.count({ where: { mobile: normalizedMobile, createdAt: { gte: requestedSince } } });
    if (requests >= OTP_RATE_LIMIT_COUNT) throw new HttpException('Too many OTP requests. Please wait before trying again.', HttpStatus.TOO_MANY_REQUESTS);

    const code = randomInt(100000, 1000000).toString();
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
      devOtp: process.env.NODE_ENV !== 'production' ? code : undefined
    };
  }

  async verifyOtp(mobile: string, otp: string, deviceId?: string) {
    const normalizedMobile = this.normalizeMobile(mobile);
    if (!/^\d{6}$/.test(otp)) throw new BadRequestException('Enter the 6-digit code.');
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
    const user = await this.prisma.user.upsert({ where: { mobile: normalizedMobile }, update: {}, create: { mobile: normalizedMobile } });
    if (deviceId) {
      await this.prisma.device.upsert({ where: { deviceId }, update: { userId: user.id, lastActiveAt: new Date() }, create: { userId: user.id, deviceId } });
    }
    return this.createSession(user, deviceId);
  }

  async signup(input: { mobile: string; password?: string; clientType?: string; referralCode?: string }, deviceId?: string) {
    const normalizedMobile = this.normalizeMobile(input.mobile);
    const existing = await this.prisma.user.findUnique({ where: { mobile: normalizedMobile } });
    if (existing) throw new BadRequestException('An account with this mobile number already exists.');
    
    const user = await this.prisma.user.create({
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

  async loginPassword(mobile: string, password?: string, deviceId?: string) {
    const normalizedMobile = this.normalizeMobile(mobile);
    if (!password) throw new BadRequestException('Password is required.');
    
    const user = await this.prisma.user.findUnique({ where: { mobile: normalizedMobile } });
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

  private async createSession(user: { id: string; mobile: string }, deviceId?: string, replacingSessionId?: string) {
    if (replacingSessionId) await this.prisma.session.update({ where: { id: replacingSessionId }, data: { isActive: false } });
    const sessionId = randomUUID();
    const refreshToken = randomUUID() + randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const accessToken = await this.jwtService.signAsync({ sub: user.id, mobile: user.mobile, sid: sessionId });
    await this.prisma.session.create({
      data: { id: sessionId, userId: user.id, token: this.hash(accessToken), refreshToken: this.hash(refreshToken), expiresAt, deviceId },
    });
    await this.prisma.auditLog.create({ data: { userId: user.id, action: 'SESSION_CREATED', details: JSON.stringify({ deviceBound: Boolean(deviceId) }) } });
    return { accessToken, access_token: accessToken, refreshToken, expiresAt, user: { id: user.id, mobile: user.mobile } };
  }
}
