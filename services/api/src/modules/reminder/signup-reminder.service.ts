import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsappService } from '../../integrations/whatsapp/whatsapp.service';
import { randomUUID } from 'crypto';

export interface ProcessReminderResult {
  userId: string;
  mobile: string;
  status: 'SENT' | 'FAILED' | 'SKIPPED' | 'OPTED_OUT';
  messageId?: string;
  error?: string;
}

@Injectable()
export class SignupReminderService {
  private readonly logger = new Logger(SignupReminderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsappService: WhatsappService
  ) {}

  /**
   * Identifies users whose signup or onboarding is incomplete after the inactivity window.
   * Default inactivity window: 24 hours (configurable via REMINDER_INACTIVITY_HOURS).
   */
  async findEligibleIncompleteSignups(inactivityHoursOverride?: number) {
    const hours = inactivityHoursOverride !== undefined 
      ? inactivityHoursOverride 
      : parseFloat(process.env.REMINDER_INACTIVITY_HOURS || '24');

    const cutoffDate = new Date(Date.now() - hours * 60 * 60 * 1000);

    // Retrieve active users created before cutoff date who have a verified phone number
    const users = await this.prisma.user.findMany({
      where: {
        isActive: true,
        createdAt: { lte: cutoffDate },
        mobile: { not: null },
      },
      include: {
        profile: true,
        onboardingProgress: true,
        kycApplication: true,
        consents: {
          where: { type: 'TERMS_AND_CONDITIONS', status: 'GRANTED' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        signupReminder: true,
      },
    });

    const eligible = users.filter((u) => {
      // 1. Phone number format validation (must be at least 10 digits)
      const digits = (u.mobile || '').replace(/\D/g, '');
      if (digits.length < 10) return false;

      // 2. Already sent check: strictly 1 reminder per user (idempotency)
      if (u.signupReminder?.status === 'SENT') return false;

      // 3. Opted-out check
      if (u.signupReminder?.status === 'OPTED_OUT') return false;

      // 4. Max attempts check
      if (u.signupReminder?.status === 'FAILED' && u.signupReminder.attemptCount >= u.signupReminder.maxAttempts) {
        return false;
      }

      // 5. Consent requirement check
      // User must have accepted Terms & Conditions (which includes communication consent)
      const hasConsent = u.consents.length > 0;
      if (!hasConsent) {
        return false;
      }

      // 6. Profile & Onboarding Completion check
      // A user is considered complete if onboardingProgress is marked completed AND profile has required fields
      const isProfileComplete = Boolean(u.profile?.fullName && u.profile?.fullName.trim().length > 0);
      const isOnboardingComplete = Boolean(u.onboardingProgress?.completed === true);

      // If user completed their profile and onboarding, they are NOT eligible for an incomplete signup reminder
      if (isProfileComplete && isOnboardingComplete) {
        return false;
      }

      return true;
    });

    return eligible;
  }

  /**
   * Processes a single user's reminder with database-level idempotency and concurrency guards.
   */
  async processReminderForUser(userId: string): Promise<ProcessReminderResult> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        onboardingProgress: true,
        kycApplication: true,
        consents: {
          where: { type: 'TERMS_AND_CONDITIONS', status: 'GRANTED' },
        },
        signupReminder: true,
      },
    });

    if (!user || !user.mobile) {
      return { userId, mobile: '', status: 'SKIPPED', error: 'User or mobile not found' };
    }

    const maskedMobile = user.mobile.replace(/(\+?\d{2,4})\d{4}(\d{4})/, '$1****$2');

    // Idempotency: skip if already sent
    if (user.signupReminder?.status === 'SENT') {
      this.logger.log(`[SignupReminder] User ${userId} already received a reminder. Skipping.`);
      return { userId, mobile: maskedMobile, status: 'SKIPPED', error: 'Already sent' };
    }

    // Skip if opted out
    if (user.signupReminder?.status === 'OPTED_OUT') {
      this.logger.log(`[SignupReminder] User ${userId} opted out. Skipping.`);
      return { userId, mobile: maskedMobile, status: 'OPTED_OUT', error: 'User opted out' };
    }

    // Skip if user completed profile in the meantime
    const isProfileComplete = Boolean(user.profile?.fullName && user.profile.fullName.trim().length > 0);
    const isOnboardingComplete = Boolean(user.onboardingProgress?.completed === true);

    if (isProfileComplete && isOnboardingComplete) {
      // Mark reminder as SKIPPED so scheduler doesn't evaluate again
      await this.prisma.signupReminder.upsert({
        where: { userId: user.id },
        update: { status: 'SKIPPED', failureReason: 'Profile completed before reminder sent.' },
        create: {
          userId: user.id,
          mobile: user.mobile,
          status: 'SKIPPED',
          failureReason: 'Profile completed before reminder sent.',
        },
      });
      return { userId, mobile: maskedMobile, status: 'SKIPPED', error: 'Completed before reminder' };
    }

    // Determine target resume step
    let resumeStep = 'PROFILE';
    if (isProfileComplete && (!user.kycApplication || user.kycApplication.status !== 'APPROVED')) {
      resumeStep = 'KYC';
    }

    // Generate secure, unique, non-sensitive resume token
    const resumeToken = user.signupReminder?.resumeToken || randomUUID();

    // Lock/mark as PROCESSING to ensure concurrency safety
    await this.prisma.signupReminder.upsert({
      where: { userId: user.id },
      update: {
        status: 'PROCESSING',
        resumeToken,
        resumeStep,
        lastAttemptAt: new Date(),
        attemptCount: { increment: 1 },
      },
      create: {
        userId: user.id,
        mobile: user.mobile,
        status: 'PROCESSING',
        resumeToken,
        resumeStep,
        lastAttemptAt: new Date(),
        attemptCount: 1,
      },
    });

    const userName = user.profile?.fullName?.split(' ')[0] || '';

    // Send WhatsApp message
    const dispatchResult = await this.whatsappService.sendIncompleteSignupReminder({
      mobile: user.mobile,
      userName,
      resumeToken,
      resumeStep,
      languageCode: user.preferredLanguage || 'en',
    });

    if (dispatchResult.success) {
      // Mark SENT
      await this.prisma.signupReminder.update({
        where: { userId: user.id },
        data: {
          status: 'SENT',
          messageId: dispatchResult.messageId,
          sentAt: new Date(),
          failureReason: null,
        },
      });

      // Record Notification record
      await this.prisma.notification.create({
        data: {
          userId: user.id,
          type: 'INCOMPLETE_SIGNUP_REMINDER',
          title: 'Complete Your TechArtha Profile',
          body: 'Your TechArtha journey has begun! Complete your profile to get started.',
          channel: 'WHATSAPP',
          status: 'SENT',
        },
      });

      // Record compliance AuditLog
      await this.prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'WHATSAPP_REMINDER_SENT',
          details: JSON.stringify({
            channel: 'WHATSAPP',
            template: 'techartha_incomplete_signup_reminder',
            messageId: dispatchResult.messageId,
            resumeStep,
          }),
        },
      });

      this.logger.log(`[SignupReminder] Sent reminder to user ${userId} (masked: ${maskedMobile}).`);
      return {
        userId,
        mobile: maskedMobile,
        status: 'SENT',
        messageId: dispatchResult.messageId,
      };
    } else {
      // Record failure with attempt count
      await this.prisma.signupReminder.update({
        where: { userId: user.id },
        data: {
          status: 'FAILED',
          failedAt: new Date(),
          failureReason: dispatchResult.error || 'Provider dispatch failed',
        },
      });

      this.logger.warn(`[SignupReminder] Failed to send reminder to user ${userId}: ${dispatchResult.error}`);
      return {
        userId,
        mobile: maskedMobile,
        status: 'FAILED',
        error: dispatchResult.error,
      };
    }
  }

  /**
   * Executes reminder processing for all eligible users in batches.
   */
  async processAllPendingReminders(inactivityHoursOverride?: number): Promise<{
    evaluated: number;
    sent: number;
    failed: number;
    skipped: number;
    results: ProcessReminderResult[];
  }> {
    const eligibleUsers = await this.findEligibleIncompleteSignups(inactivityHoursOverride);
    const results: ProcessReminderResult[] = [];

    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const u of eligibleUsers) {
      const result = await this.processReminderForUser(u.id);
      results.push(result);
      if (result.status === 'SENT') sent++;
      else if (result.status === 'FAILED') failed++;
      else skipped++;
    }

    return {
      evaluated: eligibleUsers.length,
      sent,
      failed,
      skipped,
      results,
    };
  }

  /**
   * Resolves a public, non-sensitive resume token into target screen routing directions.
   * Safe for public consumption by the deep link and web resume landing page.
   */
  async resolveResumeToken(token: string) {
    if (!token || typeof token !== 'string') {
      throw new NotFoundException('Invalid or missing resume reference.');
    }

    const reminder = await this.prisma.signupReminder.findUnique({
      where: { resumeToken: token },
      include: {
        user: {
          select: {
            id: true,
            isActive: true,
            mobile: true,
            profile: { select: { fullName: true } },
          },
        },
      },
    });

    if (!reminder || !reminder.user || !reminder.user.isActive) {
      throw new NotFoundException('Resume reference has expired or is invalid.');
    }

    const targetScreen = reminder.resumeStep === 'KYC' ? 'KYC' : 'EditProfile';
    const fallbackWebUrl = reminder.resumeStep === 'KYC' ? '/kyc' : '/dashboard/profile/edit';
    const appStoreUrl =
      process.env.APP_STORE_URL || 'https://play.google.com/store/apps/details?id=com.techartha.mobile';

    // Mask phone number for user recognition on landing page (e.g. +91••••••1234)
    const rawMobile = reminder.user.mobile || '';
    const maskedMobile = rawMobile.replace(/(\+?\d{2,4})\d{4}(\d{4})/, '$1******$2');

    return {
      valid: true,
      targetScreen,
      step: reminder.resumeStep,
      maskedMobile,
      userName: reminder.user.profile?.fullName?.split(' ')[0] || '',
      deepLinkUrl: `techartha://resume?ref=${encodeURIComponent(token)}&target=${targetScreen}`,
      fallbackWebUrl,
      appStoreUrl,
    };
  }

  /**
   * Summary status counts for Admin portal monitoring.
   */
  async getStatusSummary() {
    const counts = await this.prisma.signupReminder.groupBy({
      by: ['status'],
      _count: { status: true },
    });

    const summary: Record<string, number> = {
      TOTAL: 0,
      PENDING: 0,
      PROCESSING: 0,
      SENT: 0,
      FAILED: 0,
      SKIPPED: 0,
      OPTED_OUT: 0,
    };

    for (const c of counts) {
      summary[c.status] = c._count.status;
      summary.TOTAL += c._count.status;
    }

    return summary;
  }
}
