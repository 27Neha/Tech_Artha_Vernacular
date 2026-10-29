import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { SignupReminderService } from './signup-reminder.service';

@Injectable()
export class SignupReminderScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SignupReminderScheduler.name);
  private timer: NodeJS.Timeout | null = null;
  private isProcessing = false;

  constructor(private readonly reminderService: SignupReminderService) {}

  onModuleInit() {
    const isEnabled = process.env.REMINDER_SCHEDULER_ENABLED !== 'false';
    const intervalMs = parseInt(process.env.REMINDER_CHECK_INTERVAL_MS || '900000', 10); // default 15 mins

    if (!isEnabled) {
      this.logger.log('[SignupReminderScheduler] Background timer is disabled via REMINDER_SCHEDULER_ENABLED=false.');
      return;
    }

    this.logger.log(`[SignupReminderScheduler] Starting background reminder scheduler (Interval: ${intervalMs}ms).`);
    this.timer = setInterval(async () => {
      await this.runReminderJob();
    }, intervalMs);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      this.logger.log('[SignupReminderScheduler] Stopped background reminder timer.');
    }
  }

  /**
   * Executes reminder cycle with concurrency protection.
   */
  async runReminderJob(): Promise<{ executed: boolean; summary?: any }> {
    if (this.isProcessing) {
      this.logger.warn('[SignupReminderScheduler] A reminder cycle is already in progress. Skipping cycle.');
      return { executed: false };
    }

    this.isProcessing = true;
    try {
      this.logger.log('[SignupReminderScheduler] Starting automated reminder scan for inactive signups...');
      const summary = await this.reminderService.processAllPendingReminders();
      this.logger.log(
        `[SignupReminderScheduler] Cycle complete: Evaluated ${summary.evaluated}, Sent: ${summary.sent}, Failed: ${summary.failed}, Skipped: ${summary.skipped}`
      );
      return { executed: true, summary };
    } catch (err: any) {
      this.logger.error(`[SignupReminderScheduler] Error during reminder cycle: ${err.message}`);
      return { executed: false, summary: { error: err.message } };
    } finally {
      this.isProcessing = false;
    }
  }
}
