import {
  BadRequestException,
  HttpException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  AuthService,
  EXPIRED_RESET_OTP_MESSAGE,
  GENERIC_PASSWORD_RESET_MESSAGE,
  INVALID_RESET_AUTH_MESSAGE,
  INVALID_RESET_OTP_MESSAGE,
  TOO_MANY_OTP_ATTEMPTS_MESSAGE,
} from './auth.service';
import { EmailOtpProvider } from './email.provider';
import { ConsentService } from '../consent/consent.service';

describe('Email OTP Forgot Password flow & security', () => {
  const savedEnv = { ...process.env };

  function makeHarness() {
    const users: any[] = [];
    const otps: any[] = [];
    const tokens: any[] = [];
    const sessions: any[] = [];
    const auditLogs: any[] = [];

    const matchesWhere = (row: any, where: any = {}) => {
      for (const [k, v] of Object.entries(where)) {
        if (v === null) {
          if (row[k] !== null && row[k] !== undefined) return false;
        } else if (v && typeof v === 'object' && 'gt' in (v as any)) {
          if (!(row[k] > (v as any).gt)) return false;
        } else if (v && typeof v === 'object' && 'lt' in (v as any)) {
          if (!(row[k] < (v as any).lt)) return false;
        } else if (row[k] !== v) {
          return false;
        }
      }
      return true;
    };

    const prisma: any = {
      user: {
        findUnique: async ({ where }: any) =>
          users.find((u) => (where.email ? u.email === where.email : u.id === where.id)) ?? null,
        update: async ({ where, data }: any) => {
          const user = users.find((u) => u.id === where.id);
          Object.assign(user, data);
          return user;
        },
      },
      passwordResetOtp: {
        findFirst: async ({ where }: any) => {
          const matched = otps.filter((o) => matchesWhere(o, where));
          return matched.length ? matched[matched.length - 1] : null;
        },
        create: async ({ data }: any) => {
          const rec = {
            id: `otp_${otps.length + 1}`,
            usedAt: null,
            createdAt: new Date(),
            ...data,
          };
          otps.push(rec);
          return rec;
        },
        update: async ({ where, data }: any) => {
          const rec = otps.find((o) => o.id === where.id);
          if (data?.attempts && typeof data.attempts === 'object' && 'increment' in data.attempts) {
            rec.attempts = (rec.attempts ?? 0) + data.attempts.increment;
            const { attempts: _ignored, ...rest } = data;
            Object.assign(rec, rest);
          } else {
            Object.assign(rec, data);
          }
          return rec;
        },
        updateMany: async ({ where, data }: any) => {
          let count = 0;
          for (const rec of otps) {
            if (matchesWhere(rec, where)) {
              Object.assign(rec, data);
              count++;
            }
          }
          return { count };
        },
      },
      passwordResetToken: {
        findUnique: async ({ where }: any) => {
          const rec = tokens.find((t) => t.tokenHash === where.tokenHash) ?? null;
          if (!rec) return null;
          const user = users.find((u) => u.id === rec.userId) ?? null;
          return { ...rec, user };
        },
        create: async ({ data }: any) => {
          const rec = {
            id: `prt_${tokens.length + 1}`,
            usedAt: null,
            createdAt: new Date(),
            ...data,
          };
          tokens.push(rec);
          return rec;
        },
        updateMany: async ({ where, data }: any) => {
          let count = 0;
          for (const rec of tokens) {
            if (matchesWhere(rec, where)) {
              Object.assign(rec, data);
              count++;
            }
          }
          return { count };
        },
      },
      session: {
        create: async ({ data }: any) => {
          const s = { isActive: true, createdAt: new Date(), ...data };
          sessions.push(s);
          return s;
        },
        updateMany: async ({ where, data }: any) => {
          let count = 0;
          for (const s of sessions) {
            if (matchesWhere(s, where)) {
              Object.assign(s, data);
              count++;
            }
          }
          return { count };
        },
      },
      auditLog: {
        create: async ({ data }: any) => {
          auditLogs.push(data);
          return data;
        },
      },
      device: {
        upsert: async () => ({}),
      },
      $transaction: async (cb: (tx: any) => Promise<any>) => cb(prisma),
    };

    const jwtService = { signAsync: async () => 'jwt.mock.token' } as any;
    const interaktService = {} as any;
    const emailProvider = {
      send: jest.fn().mockResolvedValue(undefined),
      sendPasswordResetOtpEmail: jest.fn().mockResolvedValue(undefined),
    } as any;
    const zohoCrmService = {} as any;

    const authService = new (AuthService as any)(
      prisma,
      jwtService,
      interaktService,
      emailProvider,
      zohoCrmService,
    ) as AuthService;

    const addUser = (email: string, password: string) => {
      const id = `u_${users.length + 1}`;
      users.push({
        id,
        email,
        mobile: '+919999999999',
        isActive: true,
        passwordHash: (authService as any).hash(password),
        profile: { fullName: 'Neha Investor' },
      });
      return id;
    };

    return {
      authService,
      emailProvider,
      users,
      otps,
      tokens,
      sessions,
      auditLogs,
      addUser,
    };
  }

  beforeEach(() => {
    process.env = { ...savedEnv, NODE_ENV: 'test' };
  });

  afterAll(() => {
    process.env = savedEnv;
  });

  it('normalizes email, generates 6-digit OTP, stores only hash, and hides OTP from API response', async () => {
    const { authService, emailProvider, otps, addUser } = makeHarness();
    const uid = addUser('investor@techartha.com', 'OldPass@123');

    const res = await authService.requestPasswordReset('  Investor@TechArtha.COM  ', {
      ip: '1.2.3.4',
    });

    expect(res).toEqual({
      status: 'OK',
      message: GENERIC_PASSWORD_RESET_MESSAGE,
      expiresInSeconds: 300,
      cooldownSeconds: 45,
    });
    expect(emailProvider.sendPasswordResetOtpEmail).toHaveBeenCalledTimes(1);

    const sentPayload = emailProvider.sendPasswordResetOtpEmail.mock.calls[0][0];
    expect(sentPayload.email).toBe('investor@techartha.com');
    expect(sentPayload.code).toMatch(/^\d{6}$/);
    expect(sentPayload.expiresInMinutes).toBe(5);

    expect(otps).toHaveLength(1);
    expect(otps[0].userId).toBe(uid);
    expect(otps[0].purpose).toBe('PASSWORD_RESET');
    expect(otps[0].otpHash).not.toBe(sentPayload.code);
    expect(otps[0].otpHash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(res)).not.toContain(sentPayload.code);
  });

  it('returns identical generic response without sending email for unregistered accounts', async () => {
    const { authService, emailProvider, otps } = makeHarness();
    const res = await authService.requestPasswordReset('unknown@example.com');

    expect(res.status).toBe('OK');
    expect(res.message).toBe(GENERIC_PASSWORD_RESET_MESSAGE);
    expect(emailProvider.sendPasswordResetOtpEmail).not.toHaveBeenCalled();
    expect(otps).toHaveLength(0);
  });

  it('rejects invalid email formats cleanly', async () => {
    const { authService } = makeHarness();
    await expect(authService.requestPasswordReset('')).rejects.toThrow(BadRequestException);
    await expect(authService.requestPasswordReset('not-an-email')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('marks OTP DELIVERY_FAILED and rolls back cooldown when email provider fails', async () => {
    const { authService, emailProvider, otps, auditLogs, addUser } = makeHarness();
    addUser('investor@techartha.com', 'OldPass@123');
    emailProvider.sendPasswordResetOtpEmail.mockRejectedValueOnce(
      new ServiceUnavailableException('Email delivery unavailable'),
    );

    await expect(authService.requestPasswordReset('investor@techartha.com')).rejects.toThrow(
      ServiceUnavailableException,
    );
    expect(otps).toHaveLength(1);
    expect(otps[0].status).toBe('DELIVERY_FAILED');
    expect(otps[0].usedAt).toBeInstanceOf(Date);
    expect(auditLogs.some((l) => l.action === 'PASSWORD_RESET_OTP_DELIVERY_FAILED')).toBe(true);

    // Retry immediately succeeds once provider recovers because cooldown was rolled back
    await expect(authService.requestPasswordReset('investor@techartha.com')).resolves.toMatchObject({
      status: 'OK',
    });
  });

  it('enforces resend cooldown, invalidates older OTP on resend, and enforces rate limiting', async () => {
    const { authService, emailProvider, otps, addUser } = makeHarness();
    addUser('investor@techartha.com', 'OldPass@123');

    await authService.requestPasswordReset('investor@techartha.com', { ip: '10.0.0.1' });
    await expect(
      authService.requestPasswordReset('investor@techartha.com', { ip: '10.0.0.1' }),
    ).rejects.toThrow(HttpException);

    // Simulate cooldown elapsed across repeated resends
    const cooldowns = (authService as any).resetEmailCooldowns as Map<string, number>;
    for (let i = 0; i < 4; i++) {
      cooldowns.set('investor@techartha.com', Date.now() - 46_000);
      await authService.requestPasswordReset('investor@techartha.com', { ip: '10.0.0.1' });
    }

    expect(otps).toHaveLength(5);
    expect(otps[0].status).toBe('SUPERSEDED');
    expect(otps[0].usedAt).toBeInstanceOf(Date);
    expect(otps[4].status).toBe('PENDING');

    // Old OTP is rejected; latest OTP works
    const oldCode = emailProvider.sendPasswordResetOtpEmail.mock.calls[0][0].code;
    await expect(
      authService.verifyPasswordResetOtp('investor@techartha.com', oldCode),
    ).rejects.toThrow(INVALID_RESET_OTP_MESSAGE);

    // 6th request within 15m hits email rate limit even after cooldown
    cooldowns.set('investor@techartha.com', Date.now() - 46_000);
    await expect(
      authService.requestPasswordReset('investor@techartha.com', { ip: '10.0.0.1' }),
    ).rejects.toThrow(HttpException);
  });

  it('enforces 5-attempt limit, rejects expired OTPs, and completes full password reset lifecycle', async () => {
    const { authService, emailProvider, otps, tokens, sessions, addUser } = makeHarness();
    const uid = addUser('investor@techartha.com', 'OldPass@123');
    sessions.push({
      id: 's1',
      userId: uid,
      isActive: true,
      token: 'h1',
      refreshToken: 'r1',
      expiresAt: new Date(Date.now() + 100000),
    });

    await authService.requestPasswordReset('investor@techartha.com');
    const code1 = emailProvider.sendPasswordResetOtpEmail.mock.calls[0][0].code;
    const wrongCode = code1 === '000000' ? '111111' : '000000';

    // 4 wrong attempts -> Invalid message; 5th -> Locked / 429
    for (let i = 0; i < 4; i++) {
      await expect(
        authService.verifyPasswordResetOtp('investor@techartha.com', wrongCode),
      ).rejects.toThrow(INVALID_RESET_OTP_MESSAGE);
    }
    await expect(
      authService.verifyPasswordResetOtp('investor@techartha.com', wrongCode),
    ).rejects.toThrow(TOO_MANY_OTP_ATTEMPTS_MESSAGE);
    expect(otps[0].status).toBe('FAILED');

    // Request a fresh OTP after cooldown
    (authService as any).resetEmailCooldowns.set('investor@techartha.com', Date.now() - 46_000);
    await authService.requestPasswordReset('investor@techartha.com');
    const code2 = emailProvider.sendPasswordResetOtpEmail.mock.calls[1][0].code;

    // Expired OTP is rejected cleanly
    otps[1].expiresAt = new Date(Date.now() - 1000);
    await expect(
      authService.verifyPasswordResetOtp('investor@techartha.com', code2),
    ).rejects.toThrow(EXPIRED_RESET_OTP_MESSAGE);
    expect(otps[1].status).toBe('EXPIRED');

    // Request 3rd valid OTP
    (authService as any).resetEmailCooldowns.set('investor@techartha.com', Date.now() - 46_000);
    await authService.requestPasswordReset('investor@techartha.com');
    const code3 = emailProvider.sendPasswordResetOtpEmail.mock.calls[2][0].code;

    const verifyRes = await authService.verifyPasswordResetOtp('investor@techartha.com', code3);
    expect(verifyRes.status).toBe('VERIFIED');
    expect(verifyRes.resetAuthorization).toMatch(/^[a-f0-9]{64}$/);
    expect(otps[2].status).toBe('VERIFIED');

    // Verified OTP cannot be reused
    await expect(
      authService.verifyPasswordResetOtp('investor@techartha.com', code3),
    ).rejects.toThrow(INVALID_RESET_OTP_MESSAGE);

    // Weak password rejected before consuming resetAuthorization
    await expect(authService.resetPassword(verifyRes.resetAuthorization, 'weak')).rejects.toThrow(
      BadRequestException,
    );
    expect(tokens[0].usedAt).toBeNull();

    // Strong password update succeeds, consumes token, revokes active sessions
    const resetRes = await authService.resetPassword(verifyRes.resetAuthorization, 'NewPass@456');
    expect(resetRes.status).toBe('OK');
    expect(tokens[0].usedAt).toBeInstanceOf(Date);
    expect(sessions[0].isActive).toBe(false);

    // resetAuthorization cannot be reused
    await expect(
      authService.resetPassword(verifyRes.resetAuthorization, 'AnotherPass@789'),
    ).rejects.toThrow(INVALID_RESET_AUTH_MESSAGE);

    // Old password fails; new password succeeds
    await expect(
      authService.loginPassword('investor@techartha.com', true, 'OldPass@123'),
    ).rejects.toThrow(UnauthorizedException);
    const loginRes = await authService.loginPassword('investor@techartha.com', true, 'NewPass@456');
    expect(loginRes.accessToken).toBe('jwt.mock.token');
  });
});

describe('EmailOtpProvider.sendPasswordResetOtpEmail', () => {
  const savedEnv = { ...process.env };
  const origFetch = global.fetch;

  beforeEach(() => {
    process.env = { ...savedEnv };
  });

  afterEach(() => {
    global.fetch = origFetch;
  });

  it('fails explicitly when ZEPTOMAIL_ENABLED is false', async () => {
    process.env.ZEPTOMAIL_ENABLED = 'false';
    const provider = new EmailOtpProvider();
    await expect(
      provider.sendPasswordResetOtpEmail({
        email: 'user@example.com',
        code: '482910',
        expiresInMinutes: 5,
      }),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it('sends exact subject and template body via ZeptoMail when configured, and surfaces 401 failures', async () => {
    process.env.ZEPTOMAIL_ENABLED = 'true';
    process.env.ZEPTOMAIL_SEND_MAIL_TOKEN = 'Zoho-enczapikey test-token-value';
    process.env.ZEPTOMAIL_AUTH_FROM_EMAIL = 'noreply@techartha.com';

    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'OK' }),
    });
    global.fetch = fetchMock as any;

    const provider = new EmailOtpProvider();
    await provider.sendPasswordResetOtpEmail({
      email: 'investor@techartha.com',
      code: '482910',
      expiresInMinutes: 5,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(payload.from.address).toBe('noreply@techartha.com');
    expect(payload.subject).toBe('Your TechArtha Password Reset Code');
    expect(payload.textbody).toContain('Your verification code is:\n\n482910');
    expect(payload.textbody).toContain('This code is valid for 5 minutes.');
    expect(payload.textbody).toContain('Team TechArtha');
    expect(payload.htmlbody).toContain('482910');

    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: { code: 'TM_4001', message: 'Invalid API Token found' } }),
    });
    await expect(
      provider.sendPasswordResetOtpEmail({
        email: 'investor@techartha.com',
        code: '482910',
        expiresInMinutes: 5,
      }),
    ).rejects.toThrow(ServiceUnavailableException);
  });
});

describe('ConsentService deduplication', () => {
  it('returns existing GRANTED consent for same version instead of inserting duplicates', async () => {
    const consents: any[] = [];
    const prisma: any = {
      consent: {
        findFirst: async ({ where }: any) =>
          consents.find(
            (c) =>
              c.userId === where.userId &&
              c.type === where.type &&
              c.version === where.version &&
              c.status === where.status,
          ) ?? null,
        create: async ({ data }: any) => {
          const row = {
            id: `c_${consents.length + 1}`,
            createdAt: new Date(),
            ...data,
            events: [{ event: 'GRANTED' }],
          };
          consents.push(row);
          return row;
        },
      },
      auditLog: { create: async () => ({}) },
    };

    const service = new ConsentService(prisma);
    const first = await service.grant({ userId: 'u1', type: 'TERMS_AND_CONDITIONS', source: 'APP' });
    const second = await service.grant({
      userId: 'u1',
      type: 'TERMS_AND_CONDITIONS',
      source: 'APP',
    });

    expect(consents).toHaveLength(1);
    expect(second.id).toBe(first.id);
  });
});
