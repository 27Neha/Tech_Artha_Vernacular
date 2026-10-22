import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminLoginDto, UpdateKycStatusDto, UpdateSupportTicketDto } from './admin.dto';
import { AdminGuard, CurrentAdmin, AdminUser, AdminRoles } from './admin.guard';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ==========================================
  // STAFF AUTHENTICATION (PUBLIC)
  // ==========================================
  @Post('auth/login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: AdminLoginDto) {
    return this.adminService.login(dto);
  }

  // ==========================================
  // CURRENT SESSION
  // ==========================================
  @Get('me')
  @UseGuards(AdminGuard)
  getCurrentAdmin(@CurrentAdmin() admin: AdminUser) {
    return {
      admin,
      timestamp: new Date().toISOString(),
    };
  }

  // ==========================================
  // DASHBOARD AGGREGATED STATS
  // ==========================================
  @Get('dashboard/stats')
  @UseGuards(AdminGuard)
  async getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  // ==========================================
  // USERS MANAGEMENT
  // ==========================================
  @Get('users')
  @UseGuards(AdminGuard)
  async getUsers(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('kycStatus') kycStatus?: string,
    @Query('maskPii') maskPii?: string,
    @CurrentAdmin() admin?: AdminUser,
  ) {
    return this.adminService.getUsers(
      {
        page,
        limit,
        search,
        status,
        kycStatus,
        maskPii: maskPii !== 'false',
      },
      admin!,
    );
  }

  @Get('users/:id')
  @UseGuards(AdminGuard)
  async getUserDetails(
    @Param('id') id: string,
    @Query('unmask') unmask?: string,
    @CurrentAdmin() admin?: AdminUser,
  ) {
    return this.adminService.getUserDetails(id, admin!, unmask === 'true');
  }

  @Get('users/:id/goals')
  @UseGuards(AdminGuard)
  async getClientActiveGoals(
    @Param('id') id: string,
    @CurrentAdmin() admin: AdminUser,
  ) {
    return this.adminService.getClientActiveGoals(id, admin);
  }

  @Patch('users/:id/profile')
  @UseGuards(AdminGuard)
  @AdminRoles('SUPER_ADMIN', 'OPERATIONS')
  async updateUserProfile(
    @Param('id') id: string,
    @Body() body: { fullName?: string; dateOfBirth?: string; pan?: string; clientType?: string },
    @CurrentAdmin() admin: AdminUser,
  ) {
    return this.adminService.updateUserProfile(id, body, admin);
  }

  // ==========================================
  // ONBOARDING & KYC QUEUE
  // ==========================================
  @Get('onboarding')
  @UseGuards(AdminGuard)
  async getOnboardingQueue(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('manualReview') manualReview?: boolean,
    @Query('search') search?: string,
  ) {
    return this.adminService.getOnboardingQueue({
      page,
      limit,
      status,
      manualReview,
      search,
    });
  }

  @Patch('onboarding/:id')
  @UseGuards(AdminGuard)
  @AdminRoles('SUPER_ADMIN', 'OPERATIONS')
  async updateKycStatus(
    @Param('id') id: string,
    @Body() dto: UpdateKycStatusDto,
    @CurrentAdmin() admin: AdminUser,
  ) {
    return this.adminService.updateKycManualReview(id, dto, admin);
  }

  // ==========================================
  // FINANCIAL TRANSACTIONS & ORDERS
  // ==========================================
  @Get('transactions')
  @UseGuards(AdminGuard)
  async getTransactions(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getTransactions({
      page,
      limit,
      status,
      search,
    });
  }

  // ==========================================
  // SUPPORT OPERATIONS
  // ==========================================
  @Get('support')
  @UseGuards(AdminGuard)
  async getSupportTickets(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getSupportTickets({
      page,
      limit,
      status,
      search,
    });
  }

  @Patch('support/:id')
  @UseGuards(AdminGuard)
  @AdminRoles('SUPER_ADMIN', 'SUPPORT', 'OPERATIONS')
  async updateSupportTicket(
    @Param('id') id: string,
    @Body() dto: UpdateSupportTicketDto,
    @CurrentAdmin() admin: AdminUser,
  ) {
    return this.adminService.updateSupportTicket(id, dto, admin);
  }

  // ==========================================
  // AUDIT LOGS TRAIL
  // ==========================================
  @Get('audit-logs')
  @UseGuards(AdminGuard)
  async getAuditLogs(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('action') action?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getAuditLogs({
      page,
      limit,
      action,
      search,
    });
  }
}
