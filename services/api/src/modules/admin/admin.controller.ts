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
  Req,
  Headers,
} from '@nestjs/common';
import type { Request } from 'express';
import { AdminService } from './admin.service';
import {
  AdminLoginDto,
  UpdateKycStatusDto,
  UpdateSupportTicketDto,
  InviteMemberDto,
  UpdateMemberRoleDto,
  ActivateMemberDto,
  UpdateAdminProfileDto,
  ChangeAdminPasswordDto,
} from './admin.dto';
import { AdminGuard, CurrentAdmin, AdminUser, AdminRoles } from './admin.guard';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ==========================================
  // STAFF AUTHENTICATION (PUBLIC)
  // ==========================================
  @Post('auth/login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: AdminLoginDto, @Req() req?: Request) {
    const ip = (req?.headers?.['x-forwarded-for'] as string) || req?.socket?.remoteAddress || '127.0.0.1';
    return this.adminService.login(dto, ip);
  }

  @Post('auth/activate')
  @HttpCode(HttpStatus.OK)
  async activateAccount(@Body() dto: ActivateMemberDto, @Req() req?: Request) {
    const ip = (req?.headers?.['x-forwarded-for'] as string) || req?.socket?.remoteAddress || '127.0.0.1';
    return this.adminService.activateAccount(dto, ip);
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

  // ==========================================
  // TEAM MEMBERS & ACCESS CONTROL
  // ==========================================
  @Get('members')
  @UseGuards(AdminGuard)
  async getMembers(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('status') status?: string,
  ) {
    return this.adminService.getMembers({ page, limit, search, role, status });
  }

  @Post('members/invite')
  @UseGuards(AdminGuard)
  @AdminRoles('SUPER_ADMIN')
  async inviteMember(
    @Body() dto: InviteMemberDto,
    @CurrentAdmin() admin: AdminUser,
    @Headers('host') host?: string,
  ) {
    return this.adminService.inviteMember(dto, admin, host);
  }

  @Patch('members/:id/role')
  @UseGuards(AdminGuard)
  @AdminRoles('SUPER_ADMIN')
  async updateMemberRole(
    @Param('id') id: string,
    @Body() dto: UpdateMemberRoleDto,
    @CurrentAdmin() admin: AdminUser,
  ) {
    return this.adminService.updateMemberRole(id, dto, admin);
  }

  @Patch('members/:id/deactivate')
  @UseGuards(AdminGuard)
  @AdminRoles('SUPER_ADMIN')
  async deactivateMember(
    @Param('id') id: string,
    @CurrentAdmin() admin: AdminUser,
  ) {
    return this.adminService.deactivateMember(id, admin);
  }

  @Patch('members/:id/reactivate')
  @UseGuards(AdminGuard)
  @AdminRoles('SUPER_ADMIN')
  async reactivateMember(
    @Param('id') id: string,
    @CurrentAdmin() admin: AdminUser,
  ) {
    return this.adminService.reactivateMember(id, admin);
  }

  @Post('members/:id/resend-invite')
  @UseGuards(AdminGuard)
  @AdminRoles('SUPER_ADMIN')
  async resendInvite(
    @Param('id') id: string,
    @CurrentAdmin() admin: AdminUser,
    @Headers('host') host?: string,
  ) {
    return this.adminService.resendInvite(id, admin, host);
  }

  // ==========================================
  // SETTINGS & PROFILE OPERATIONS
  // ==========================================
  @Patch('settings/profile')
  @UseGuards(AdminGuard)
  async updateProfile(
    @CurrentAdmin() admin: AdminUser,
    @Body() dto: UpdateAdminProfileDto,
  ) {
    return this.adminService.updateProfile(admin, dto);
  }

  @Post('settings/change-password')
  @UseGuards(AdminGuard)
  async changePassword(
    @CurrentAdmin() admin: AdminUser,
    @Body() dto: ChangeAdminPasswordDto,
  ) {
    return this.adminService.changePassword(admin, dto);
  }

  @Get('settings/roles')
  @UseGuards(AdminGuard)
  async getRolesConfig() {
    return this.adminService.getRolesConfig();
  }

  @Get('settings/system')
  @UseGuards(AdminGuard)
  async getSystemInfo() {
    return this.adminService.getSystemInfo();
  }

  @Get('settings/audit-logs')
  @UseGuards(AdminGuard)
  async getAdminAuditLogs(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.adminService.getAdminAuditLogs({ page, limit, search });
  }
}

