import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { createHmac, randomInt, timingSafeEqual } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { InteraktService } from '../../integrations/interakt/interakt.service';
import {
  ChannelRoutingOtpProvider,
  InteraktOtpProvider,
  MockOtpProvider,
  OtpChannel,
  OtpProvider,
} from '../auth/otp.provider';
import { EmailOtpProvider } from '../auth/email.provider';

export type TransactionAction = 'PURCHASE' | 'REDEMPTION' | 'SIP';

/** The parameters an OTP authorises. Anything that changes the money must be in here. */
export type TransactionPayload = {
  action: TransactionAction;
  amount?: number | null;
  units?: number | null;
  schemeIsin?: string | null;
  folioNumber?: string | null;
  bucketId?: string | null;
  frequency?: string | null;
  numberOfInstallments?: number | null;
  fullExit?: boolean | null;
};

const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_COUNT = 5;

/**
 * Second-factor authorisation for money movement - Cybrilla compliance points 5 to 7.
 *
 * The code is bound to one transaction. Verification checks both that the code is right
 * AND that the request being executed fingerprints to the same parameters the code was
 * issued for, so an authorisation cannot be carried from one transaction to another.
 */
@Injectable()
export class TwoFactorService {
  private readonly logger = new Logger(TwoFactorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly interakt: InteraktService,
  ) {}

  private get otpProvider(): OtpProvider {
    const providerStr = (process.env.OTP_PROVIDER ?? 'mock').toLowerCase();
    if (providerStr === 'mock') return new MockOtpProvider();
    return new ChannelRoutingOtpProvider(
      new InteraktOtpProvider(this.interakt),
      new MockOtpProvider(),
      new EmailOtpProvider(),
    );
  }

  /**
   * A stable fingerprint of what is being authorised.
   *
   * Field order is fixed and values are normalised, because the fingerprint is computed
   * twice - once when the code is issued and once when the transaction runs - and the
   * two must agree for an unchanged request. Amounts are fixed to 2 decimals so 500 and
   * 500.00 do not read as different transactions, and absent fields become an empty
   * string rather than being skipped, so {amount: 1} cannot collide with {units: 1}.
   */
  fingerprint(payload: TransactionPayload): string {
    const num = (v: number | null | undefined) => (v == null ? '' : Number(v).toFixed(2));
    const str = (v: string | null | undefined) => (v == null ? '' : String(v).trim().toUpperCase());
    const canonical = [
      str(payload.action),
      num(payload.amount),
      num(payload.units),
      str(payload.schemeIsin),
      str(payload.folioNumber),
      str(payload.bucketId),
      str(payload.frequency),
      payload.numberOfInstallments == null ? '' : String(payload.numberOfInstallments),
      payload.fullExit ? 'FULL' : '',
    ].join('|');
    return this.hash(canonical);
  }

  /** Wording the investor sees in the OTP message, so they know what they are approving. */
  describe(payload: TransactionPayload): string {
    const rupees = payload.amount != null ? `Rs.${Number(payload.amount).toFixed(2)}` : null;
    switch (payload.action) {
      case 'PURCHASE':
        return `investment of ${rupees ?? 'the requested amount'}`;
      case 'SIP':
        return `SIP of ${rupees ?? 'the requested amount'}${payload.frequency ? ` (${payload.frequency})` : ''}`;
      case 'REDEMPTION':
        if (payload.fullExit) return `full withdrawal from folio ${payload.folioNumber ?? ''}`.trim();
        return `withdrawal of ${rupees ?? `${payload.units ?? ''} units`} from folio ${payload.folioNumber ?? ''}`.trim();
      default:
        return 'this transaction';
    }
  }

  /**
   * The consent the investor gives when entering the code (Cybrilla compliance points
   * 5 to 7). Shown beside the code field, and stored with the challenge once accepted,
   * so the record shows exactly what was agreed to - not just that a code matched.
   */
  consentStatement(payload: TransactionPayload): string {
    return `I authorise TechArtha to place this ${this.describe(payload)} on my behalf. I have checked the details and understand that mutual fund investments are subject to market risks.`;
  }

  /** Issues a code for one specific transaction and sends it to the investor. */
  async challenge(userId: string, payload: TransactionPayload, channel: OtpChannel = 'WHATSAPP') {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('Account not found.');

    const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
    const recent = await this.prisma.transactionChallenge.count({
      where: { userId, createdAt: { gte: since } },
    });
    if (recent >= RATE_LIMIT_COUNT) {
      throw new BadRequestException('Too many authorisation requests. Please wait a few minutes and try again.');
    }

    // Any earlier pending challenge is dead the moment a new one is issued, so two codes
    // for different amounts can never both be live.
    await this.prisma.transactionChallenge.updateMany({
      where: { userId, status: 'PENDING' },
      data: { status: 'SUPERSEDED' },
    });

    const code = randomInt(1000, 10000).toString();
    const summary = this.describe(payload);

    const challenge = await this.prisma.transactionChallenge.create({
      data: {
        userId,
        action: payload.action,
        payloadHash: this.fingerprint(payload),
        otpHash: this.hash(`${userId}:${code}`),
        summary,
        channel,
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
        status: 'PENDING',
      },
    });

    const devBypass = process.env.NODE_ENV !== 'production' && process.env.AUTH_DEV_BYPASS === 'true';
    try {
      await this.otpProvider.send({ mobile: user.mobile, code, channel });
    } catch (e) {
      if (!devBypass) throw e;
      this.logger.warn(
        `Transaction OTP delivery failed; returning it inline because AUTH_DEV_BYPASS is on. ${
          e instanceof Error ? e.message : e
        }`,
      );
    }

    return {
      challengeId: challenge.id,
      action: payload.action,
      summary,
      consentStatement: this.consentStatement(payload),
      expiresInSeconds: OTP_TTL_MS / 1000,
      devOtp: devBypass ? code : undefined,
    };
  }

  /**
   * Verifies a code against the transaction about to run, and consumes it.
   *
   * Consumed before the transaction executes, not after: a code that has been accepted
   * must not survive to authorise a retry the investor did not make.
   */
  async verifyAndConsume(
    userId: string,
    payload: TransactionPayload,
    challengeId: string | undefined,
    otp: string | undefined,
    consent: boolean | undefined,
  ) {
    if (!challengeId || !otp) {
      throw new UnauthorizedException('This transaction needs to be authorised. Request a code and enter it to continue.');
    }
    // Checked before the code is looked at, so a missing consent never costs an attempt.
    if (consent !== true) {
      throw new BadRequestException('Confirm that you authorise this transaction to continue.');
    }

    const challenge = await this.prisma.transactionChallenge.findFirst({
      where: { id: challengeId, userId },
    });
    if (!challenge) throw new UnauthorizedException('That authorisation could not be found. Request a new code.');
    if (challenge.status !== 'PENDING') {
      throw new UnauthorizedException('That code has already been used. Request a new one.');
    }
    if (challenge.expiresAt <= new Date()) {
      await this.prisma.transactionChallenge.update({
        where: { id: challenge.id },
        data: { status: 'EXPIRED' },
      });
      throw new UnauthorizedException('That code has expired. Request a new one.');
    }
    if (challenge.attempts >= MAX_ATTEMPTS) {
      await this.prisma.transactionChallenge.update({
        where: { id: challenge.id },
        data: { status: 'EXPIRED' },
      });
      throw new UnauthorizedException('Too many incorrect attempts. Request a new code.');
    }

    // The heart of it: the code must have been issued for THIS transaction.
    if (challenge.payloadHash !== this.fingerprint(payload)) {
      await this.prisma.transactionChallenge.update({
        where: { id: challenge.id },
        data: { status: 'SUPERSEDED' },
      });
      throw new UnauthorizedException(
        'These transaction details have changed since the code was sent. Request a new code to authorise them.',
      );
    }

    const expected = Buffer.from(challenge.otpHash);
    const actual = Buffer.from(this.hash(`${userId}:${otp.trim()}`));
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      await this.prisma.transactionChallenge.update({
        where: { id: challenge.id },
        data: { attempts: { increment: 1 } },
      });
      throw new UnauthorizedException('That code is not valid.');
    }

    await this.prisma.transactionChallenge.update({
      where: { id: challenge.id },
      data: {
        status: 'CONSUMED',
        consumedAt: new Date(),
        consentText: this.consentStatement(payload),
        consentedAt: new Date(),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'TRANSACTION_AUTHORISED',
        details: JSON.stringify({
          challengeId: challenge.id,
          transaction: challenge.action,
          summary: challenge.summary,
          consent: this.consentStatement(payload),
        }),
      },
    });

    return true;
  }

  private hash(value: string) {
    return createHmac('sha256', process.env.OTP_HASH_SECRET ?? process.env.JWT_SECRET ?? 'development-only-change-me')
      .update(value)
      .digest('hex');
  }
}
