import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { SignupReminderService } from './signup-reminder.service';
import { SignupReminderScheduler } from './signup-reminder.scheduler';

@Controller()
export class ReminderController {
  constructor(
    private readonly reminderService: SignupReminderService,
    private readonly reminderScheduler: SignupReminderScheduler
  ) {}

  /**
   * Public endpoint to validate and resolve a WhatsApp reminder resume reference.
   * Consumed by the deep link handler and web resume landing page.
   */
  @Get('api/reminders/resume')
  async resolveResume(@Query('ref') token: string) {
    if (!token) {
      throw new BadRequestException('Query parameter "ref" is required.');
    }
    return this.reminderService.resolveResumeToken(token);
  }

  /**
   * Admin / ops endpoint to inspect reminder metrics and statuses.
   */
  @Get('admin/reminders/status')
  async getStatus() {
    return this.reminderService.getStatusSummary();
  }

  /**
   * Admin / ops endpoint to manually trigger a reminder processing sweep.
   * Can accept optional `inactivityHours` override (e.g. ?inactivityHours=0 for immediate testing).
   */
  @Post('admin/reminders/process')
  @HttpCode(HttpStatus.OK)
  async triggerProcessing(@Query('inactivityHours') hoursStr?: string) {
    const hours = hoursStr !== undefined ? parseFloat(hoursStr) : undefined;
    return this.reminderService.processAllPendingReminders(hours);
  }

  /**
   * Admin / ops endpoint to process a manual opt-out request by mobile.
   */
  @Post('admin/reminders/opt-out')
  @HttpCode(HttpStatus.OK)
  async manualOptOut(@Body('mobile') mobile: string) {
    if (!mobile) {
      throw new BadRequestException('Body field "mobile" is required.');
    }
    return this.reminderService.processReminderForUser(mobile);
  }
}
