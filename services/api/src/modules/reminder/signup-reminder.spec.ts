import { Test, TestingModule } from '@nestjs/testing';
import { SignupReminderService } from './signup-reminder.service';
import { SignupReminderScheduler } from './signup-reminder.scheduler';
import { WhatsappService } from '../../integrations/whatsapp/whatsapp.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MockWhatsAppProvider } from '../../integrations/whatsapp/whatsapp.provider';

describe('SignupReminder Integration & Scenario Suite', () => {
  let reminderService: SignupReminderService;
  let reminderScheduler: SignupReminderScheduler;
  let whatsappService: WhatsappService;
  let mockWhatsAppProvider: MockWhatsAppProvider;

  // In-memory mock database store for completely isolated testing
  let usersDb: any[] = [];
  let profilesDb: any[] = [];
  let onboardingDb: any[] = [];
  let kycDb: any[] = [];
  let consentsDb: any[] = [];
  let remindersDb: any[] = [];
  let notificationsDb: any[] = [];
  let auditLogsDb: any[] = [];

  const mockPrismaService = {
    user: {
      findMany: jest.fn().mockImplementation(({ where, include }: any) => {
        return usersDb
          .filter((u) => {
            if (where.isActive !== undefined && u.isActive !== where.isActive) return false;
            if (where.mobile?.not === null && !u.mobile) return false;
            if (where.mobile?.in && !where.mobile.in.includes(u.mobile)) return false;
            if (where.createdAt?.lte && u.createdAt > where.createdAt.lte) return false;
            return true;
          })
          .map((u) => {
            const result: any = { ...u };
            if (include?.profile) result.profile = profilesDb.find((p) => p.userId === u.id) || null;
            if (include?.onboardingProgress)
              result.onboardingProgress = onboardingDb.find((o) => o.userId === u.id) || null;
            if (include?.kycApplication) result.kycApplication = kycDb.find((k) => k.userId === u.id) || null;
            if (include?.consents) {
              result.consents = consentsDb.filter(
                (c) => c.userId === u.id && c.type === 'TERMS_AND_CONDITIONS' && c.status === 'GRANTED'
              );
            }
            if (include?.signupReminder)
              result.signupReminder = remindersDb.find((r) => r.userId === u.id) || null;
            return result;
          });
      }),
      findUnique: jest.fn().mockImplementation(({ where, include }: any) => {
        const u = usersDb.find((x) => x.id === where.id || x.mobile === where.mobile);
        if (!u) return null;
        const result: any = { ...u };
        if (include?.profile) result.profile = profilesDb.find((p) => p.userId === u.id) || null;
        if (include?.onboardingProgress)
          result.onboardingProgress = onboardingDb.find((o) => o.userId === u.id) || null;
        if (include?.kycApplication) result.kycApplication = kycDb.find((k) => k.userId === u.id) || null;
        if (include?.consents) {
          result.consents = consentsDb.filter(
            (c) => c.userId === u.id && c.type === 'TERMS_AND_CONDITIONS' && c.status === 'GRANTED'
          );
        }
        if (include?.signupReminder)
          result.signupReminder = remindersDb.find((r) => r.userId === u.id) || null;
        return result;
      }),
    },
    signupReminder: {
      findUnique: jest.fn().mockImplementation(({ where, include }: any) => {
        const r = remindersDb.find(
          (x) => x.userId === where.userId || x.resumeToken === where.resumeToken || x.id === where.id
        );
        if (!r) return null;
        const result: any = { ...r };
        if (include?.user) {
          const u = usersDb.find((x) => x.id === r.userId);
          result.user = u
            ? {
                ...u,
                profile: profilesDb.find((p) => p.userId === u.id) || null,
              }
            : null;
        }
        return result;
      }),
      upsert: jest.fn().mockImplementation(({ where, update, create }: any) => {
        const existingIdx = remindersDb.findIndex((r) => r.userId === where.userId);
        if (existingIdx >= 0) {
          const updated = {
            ...remindersDb[existingIdx],
            ...update,
            attemptCount:
              update.attemptCount?.increment !== undefined
                ? remindersDb[existingIdx].attemptCount + 1
                : update.attemptCount !== undefined
                ? update.attemptCount
                : remindersDb[existingIdx].attemptCount,
            updatedAt: new Date(),
          };
          remindersDb[existingIdx] = updated;
          return updated;
        } else {
          const created = {
            id: `rem-${Date.now()}-${Math.random()}`,
            attemptCount: create.attemptCount || 0,
            maxAttempts: 3,
            status: 'PENDING',
            ...create,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          remindersDb.push(created);
          return created;
        }
      }),
      update: jest.fn().mockImplementation(({ where, data }: any) => {
        const idx = remindersDb.findIndex((r) => r.userId === where.userId || r.id === where.id);
        if (idx >= 0) {
          remindersDb[idx] = { ...remindersDb[idx], ...data, updatedAt: new Date() };
          return remindersDb[idx];
        }
        throw new Error('Record not found');
      }),
      groupBy: jest.fn().mockImplementation(() => {
        const map: Record<string, number> = {};
        for (const r of remindersDb) {
          map[r.status] = (map[r.status] || 0) + 1;
        }
        return Object.entries(map).map(([status, count]) => ({
          status,
          _count: { status: count },
        }));
      }),
    },
    notification: {
      create: jest.fn().mockImplementation(({ data }: any) => {
        const notif = { id: `notif-${Date.now()}`, ...data, createdAt: new Date() };
        notificationsDb.push(notif);
        return notif;
      }),
    },
    auditLog: {
      create: jest.fn().mockImplementation(({ data }: any) => {
        const log = { id: `log-${Date.now()}`, ...data, createdAt: new Date() };
        auditLogsDb.push(log);
        return log;
      }),
    },
  };

  beforeEach(async () => {
    // Reset in-memory database tables
    usersDb = [];
    profilesDb = [];
    onboardingDb = [];
    kycDb = [];
    consentsDb = [];
    remindersDb = [];
    notificationsDb = [];
    auditLogsDb = [];

    mockWhatsAppProvider = new MockWhatsAppProvider();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SignupReminderService,
        SignupReminderScheduler,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: WhatsappService,
          useValue: {
            sendIncompleteSignupReminder: jest
              .fn()
              .mockImplementation((input) =>
                mockWhatsAppProvider.sendIncompleteSignupReminder({
                  to: input.mobile || input.to,
                  userName: input.userName || 'there',
                  resumeToken: input.resumeToken,
                  resumeUrl: `https://techartha.com/resume?ref=${input.resumeToken}`,
                  templateName: input.templateName,
                  languageCode: input.languageCode,
                })
              ),
            handleOptOut: jest.fn().mockImplementation(async (mobile: string) => {
              const cleaned = mobile.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
              const users = usersDb.filter((u) => u.mobile.includes(cleaned));
              for (const u of users) {
                const existing = remindersDb.find((r) => r.userId === u.id);
                if (existing) {
                  existing.status = 'OPTED_OUT';
                  existing.failureReason = 'User opted out via WhatsApp reply.';
                } else {
                  remindersDb.push({
                    id: `rem-opt-${u.id}`,
                    userId: u.id,
                    mobile: u.mobile,
                    status: 'OPTED_OUT',
                    failureReason: 'User opted out via WhatsApp reply.',
                    attemptCount: 0,
                    maxAttempts: 3,
                  });
                }
              }
              return { optedOut: true, count: users.length };
            }),
            handleWhatsAppMessage: jest.fn(),
          },
        },
      ],
    }).compile();

    reminderService = module.get<SignupReminderService>(SignupReminderService);
    reminderScheduler = module.get<SignupReminderScheduler>(SignupReminderScheduler);
    whatsappService = module.get<WhatsappService>(WhatsappService);
  });

  // Scenario 1: User starts signup and abandons it
  it('Scenario 1: Detects users who started signup and abandoned without completing profile after 24h', async () => {
    // Create an inactive abandoned signup (> 24 hours ago)
    const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000);
    const user = {
      id: 'user-abandoned-1',
      mobile: '+919876543210',
      isActive: true,
      createdAt: twentyFiveHoursAgo,
      updatedAt: twentyFiveHoursAgo,
    };
    usersDb.push(user);
    // User accepted Terms during OTP/signup
    consentsDb.push({
      userId: user.id,
      type: 'TERMS_AND_CONDITIONS',
      status: 'GRANTED',
      createdAt: twentyFiveHoursAgo,
    });
    // Onboarding progress incomplete (only reached SIGNUP step, 10%)
    onboardingDb.push({
      userId: user.id,
      step: 'SIGNUP',
      completed: false,
      percentage: 10,
    });
    // No profile created yet
    // No reminder sent yet

    const eligible = await reminderService.findEligibleIncompleteSignups();
    expect(eligible).toHaveLength(1);
    expect(eligible[0].id).toBe('user-abandoned-1');
  });

  // Scenario 2: User completes signup before reminder is due
  it('Scenario 2: Skips users who completed profile/onboarding before the reminder', async () => {
    const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000);
    const completedUser = {
      id: 'user-completed-2',
      mobile: '+919876543211',
      isActive: true,
      createdAt: twentyFiveHoursAgo,
      updatedAt: twentyFiveHoursAgo,
    };
    usersDb.push(completedUser);
    consentsDb.push({
      userId: completedUser.id,
      type: 'TERMS_AND_CONDITIONS',
      status: 'GRANTED',
    });
    // Profile is completed with full name
    profilesDb.push({
      userId: completedUser.id,
      fullName: 'Vikram Malhotra',
      pan: 'ABCDE1234F',
    });
    // Onboarding progress is marked completed
    onboardingDb.push({
      userId: completedUser.id,
      step: 'COMPLETE',
      completed: true,
      percentage: 100,
    });

    const eligible = await reminderService.findEligibleIncompleteSignups();
    expect(eligible).toHaveLength(0);

    // Direct process attempt also skips safely
    const result = await reminderService.processReminderForUser('user-completed-2');
    expect(result.status).toBe('SKIPPED');
    expect(result.error).toContain('Completed');
    expect(mockWhatsAppProvider.sentMessages).toHaveLength(0);
  });

  // Scenario 3: Reminder is sent once to an eligible user with required consent
  it('Scenario 3: Dispatches approved WhatsApp reminder template with interactive button to eligible user', async () => {
    const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000);
    const user = {
      id: 'user-eligible-3',
      mobile: '+919876543212',
      isActive: true,
      createdAt: twentyFiveHoursAgo,
      updatedAt: twentyFiveHoursAgo,
    };
    usersDb.push(user);
    consentsDb.push({
      userId: user.id,
      type: 'TERMS_AND_CONDITIONS',
      status: 'GRANTED',
    });
    onboardingDb.push({
      userId: user.id,
      step: 'PROFILE',
      completed: false,
      percentage: 25,
    });

    const result = await reminderService.processReminderForUser('user-eligible-3');
    expect(result.status).toBe('SENT');
    expect(result.messageId).toBeDefined();

    // Verify WhatsApp provider dispatched template
    expect(mockWhatsAppProvider.sentMessages).toHaveLength(1);
    const sent = mockWhatsAppProvider.sentMessages[0];
    expect(sent.input.to).toBe('+919876543212');
    expect(sent.input.resumeToken).toBeDefined();
    expect(sent.input.resumeUrl).toContain(`ref=${encodeURIComponent(sent.input.resumeToken)}`);

    // Verify DB persistence
    const reminderRecord = remindersDb.find((r) => r.userId === 'user-eligible-3');
    expect(reminderRecord).toBeDefined();
    expect(reminderRecord.status).toBe('SENT');
    expect(reminderRecord.messageId).toBe(result.messageId);

    // Verify AuditLog & Notification created
    expect(notificationsDb).toHaveLength(1);
    expect(notificationsDb[0].channel).toBe('WHATSAPP');
    expect(auditLogsDb).toHaveLength(1);
    expect(auditLogsDb[0].action).toBe('WHATSAPP_REMINDER_SENT');
  });

  // Scenario 4: Duplicate scheduler runs do not send duplicate reminders (Idempotency)
  it('Scenario 4: Prevents duplicate messages across repeated scheduler runs (Strict Idempotency)', async () => {
    const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000);
    const user = {
      id: 'user-idempotent-4',
      mobile: '+919876543213',
      isActive: true,
      createdAt: twentyFiveHoursAgo,
      updatedAt: twentyFiveHoursAgo,
    };
    usersDb.push(user);
    consentsDb.push({
      userId: user.id,
      type: 'TERMS_AND_CONDITIONS',
      status: 'GRANTED',
    });
    onboardingDb.push({
      userId: user.id,
      step: 'SIGNUP',
      completed: false,
    });

    // Run 1: Sends reminder
    const run1 = await reminderService.processAllPendingReminders();
    expect(run1.sent).toBe(1);
    expect(mockWhatsAppProvider.sentMessages).toHaveLength(1);

    // Run 2: Immediately re-run scheduler sweep
    const run2 = await reminderService.processAllPendingReminders();
    expect(run2.sent).toBe(0);
    expect(run2.evaluated).toBe(0); // Excluded from eligible list because status === 'SENT'
    // Total sent messages remains strictly 1!
    expect(mockWhatsAppProvider.sentMessages).toHaveLength(1);

    // Run 3: Direct processReminderForUser call on the same user
    const directResult = await reminderService.processReminderForUser('user-idempotent-4');
    expect(directResult.status).toBe('SKIPPED');
    expect(directResult.error).toBe('Already sent');
    expect(mockWhatsAppProvider.sentMessages).toHaveLength(1);
  });

  // Scenario 5: User opts out
  it('Scenario 5: User opt-out prevents any future reminder dispatch', async () => {
    const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000);
    const user = {
      id: 'user-optout-5',
      mobile: '+919876543214',
      isActive: true,
      createdAt: twentyFiveHoursAgo,
      updatedAt: twentyFiveHoursAgo,
    };
    usersDb.push(user);
    consentsDb.push({
      userId: user.id,
      type: 'TERMS_AND_CONDITIONS',
      status: 'GRANTED',
    });
    onboardingDb.push({
      userId: user.id,
      step: 'SIGNUP',
      completed: false,
    });

    // User sends STOP on WhatsApp
    await whatsappService.handleOptOut('+919876543214');

    const reminderRecord = remindersDb.find((r) => r.userId === 'user-optout-5');
    expect(reminderRecord?.status).toBe('OPTED_OUT');

    // Scheduler sweep runs
    const runResult = await reminderService.processAllPendingReminders();
    expect(runResult.sent).toBe(0);
    expect(mockWhatsAppProvider.sentMessages).toHaveLength(0);

    // Direct invocation
    const directRes = await reminderService.processReminderForUser('user-optout-5');
    expect(directRes.status).toBe('OPTED_OUT');
    expect(mockWhatsAppProvider.sentMessages).toHaveLength(0);
  });

  // Scenario 6: WhatsApp provider returns an error
  it('Scenario 6: Safely handles provider failure, increments attempt count, and logs sanitized error without crash', async () => {
    mockWhatsAppProvider.shouldSimulateFailure = true;
    mockWhatsAppProvider.simulatedFailureMessage = 'Meta Graph API (500): Temporary downstream outage';

    const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000);
    const user = {
      id: 'user-failure-6',
      mobile: '+919876543215',
      isActive: true,
      createdAt: twentyFiveHoursAgo,
      updatedAt: twentyFiveHoursAgo,
    };
    usersDb.push(user);
    consentsDb.push({
      userId: user.id,
      type: 'TERMS_AND_CONDITIONS',
      status: 'GRANTED',
    });
    onboardingDb.push({
      userId: user.id,
      step: 'SIGNUP',
      completed: false,
    });

    const result = await reminderService.processReminderForUser('user-failure-6');
    expect(result.status).toBe('FAILED');
    expect(result.error).toContain('Temporary downstream outage');

    const savedRecord = remindersDb.find((r) => r.userId === 'user-failure-6');
    expect(savedRecord.status).toBe('FAILED');
    expect(savedRecord.attemptCount).toBe(1);
    expect(savedRecord.failureReason).toContain('Temporary downstream outage');
  });

  // Scenario 7 & 8: Deep linking resolution & Fallback
  it('Scenario 7 & 8: Resolves secure resume reference to native deep link and web fallback without secrets', async () => {
    const user = {
      id: 'user-deeplink-7',
      mobile: '+919876543216',
      isActive: true,
      createdAt: new Date(),
    };
    usersDb.push(user);
    profilesDb.push({
      userId: user.id,
      fullName: 'Pooja Sharma',
    });

    remindersDb.push({
      id: 'rem-token-7',
      userId: user.id,
      mobile: user.mobile,
      status: 'SENT',
      resumeToken: 'test-secure-uuid-token-777',
      resumeStep: 'KYC',
      attemptCount: 1,
      maxAttempts: 3,
    });

    const resolution = await reminderService.resolveResumeToken('test-secure-uuid-token-777');
    expect(resolution.valid).toBe(true);
    expect(resolution.targetScreen).toBe('KYC');
    expect(resolution.deepLinkUrl).toBe('techartha://resume?ref=test-secure-uuid-token-777&target=KYC');
    expect(resolution.fallbackWebUrl).toBe('/kyc');
    expect(resolution.appStoreUrl).toContain('play.google.com');
    // Ensure no passwords or sensitive tokens leaked
    expect((resolution as any).password).toBeUndefined();
    expect((resolution as any).token).toBeUndefined();
    // Masked mobile display
    expect(resolution.maskedMobile).toContain('******');
  });

  // Scenario 9: Summary metrics
  it('Scenario 9: Provides accurate status summary for monitoring and admin oversight', async () => {
    remindersDb.push(
      { userId: 'u1', status: 'SENT' },
      { userId: 'u2', status: 'SENT' },
      { userId: 'u3', status: 'FAILED' },
      { userId: 'u4', status: 'OPTED_OUT' },
      { userId: 'u5', status: 'SKIPPED' }
    );

    const summary = await reminderService.getStatusSummary();
    expect(summary.TOTAL).toBe(5);
    expect(summary.SENT).toBe(2);
    expect(summary.FAILED).toBe(1);
    expect(summary.OPTED_OUT).toBe(1);
    expect(summary.SKIPPED).toBe(1);
  });
});
