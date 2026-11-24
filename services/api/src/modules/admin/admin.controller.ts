import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import {
  AdminLoginDto,
  UpdateKycStatusDto,
  UpdateSupportTicketDto,
  InviteTeamMemberDto,
  AcceptInvitationDto,
  UpdateTeamMemberRoleDto,
  UpdateTeamMemberStatusDto,
  CreateCustomRoleDto,
  UpdateCustomRoleDto,
  UpdateRolePermissionsDto,
} from './admin.dto';
import {
  AdminGuard,
  CurrentAdmin,
  AdminUser,
  AdminRoles,
  RequirePermissions,
} from './admin.guard';

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

  @Get('support/:id')
  @UseGuards(AdminGuard)
  async getSupportTicketDetails(@Param('id') id: string) {
    return this.adminService.getSupportTicketDetails(id);
  }

  @Post('support/:id/reply')
  @UseGuards(AdminGuard)
  @AdminRoles('SUPER_ADMIN', 'SUPPORT', 'OPERATIONS')
  async replyToSupportTicket(
    @Param('id') id: string,
    @Body() dto: { reply: string },
    @CurrentAdmin() admin: AdminUser,
  ) {
    return this.adminService.replyToSupportTicket(id, dto, admin);
  }

  @Post('support')
  @UseGuards(AdminGuard)
  @AdminRoles('SUPER_ADMIN', 'SUPPORT', 'OPERATIONS')
  async createSupportTicket(
    @Body() dto: { customerName: string; customerPhone?: string; customerEmail?: string; subject: string; message: string; channel?: string; priority?: string },
    @CurrentAdmin() admin: AdminUser,
  ) {
    return this.adminService.createSupportTicket(dto, admin);
  }

  @Delete('support/:id')
  @UseGuards(AdminGuard)
  @AdminRoles('SUPER_ADMIN', 'SUPPORT', 'OPERATIONS')
  async deleteSupportTicket(
    @Param('id') id: string,
    @CurrentAdmin() admin: AdminUser,
  ) {
    return this.adminService.deleteSupportTicket(id, admin);
  }

  // ==========================================
  // TECHNICAL SUPPORT AGENTS ONBOARDING
  // ==========================================
  @Get('agents')
  @UseGuards(AdminGuard)
  async getTechnicalAgents() {
    return this.adminService.getTechnicalAgents();
  }

  @Post('agents')
  @UseGuards(AdminGuard)
  @AdminRoles('SUPER_ADMIN', 'OPERATIONS')
  async createTechnicalAgent(
    @Body() dto: { fullName: string; email: string; phone?: string; role?: string; department?: string; notifyOnTickets?: boolean },
    @CurrentAdmin() admin: AdminUser,
  ) {
    return this.adminService.createTechnicalAgent(dto, admin);
  }

  @Patch('agents/:id')
  @UseGuards(AdminGuard)
  @AdminRoles('SUPER_ADMIN', 'OPERATIONS')
  async updateTechnicalAgent(
    @Param('id') id: string,
    @Body() dto: { fullName?: string; phone?: string; role?: string; department?: string; isActive?: boolean; notifyOnTickets?: boolean },
    @CurrentAdmin() admin: AdminUser,
  ) {
    return this.adminService.updateTechnicalAgent(id, dto, admin);
  }

  @Delete('agents/:id')
  @UseGuards(AdminGuard)
  @AdminRoles('SUPER_ADMIN', 'OPERATIONS')
  async deleteTechnicalAgent(
    @Param('id') id: string,
    @CurrentAdmin() admin: AdminUser,
  ) {
    return this.adminService.deleteTechnicalAgent(id, admin);
  }

  // ==========================================
  // TEAM NOTIFICATIONS (ADMIN NOTIFICATION BELL)
  // ==========================================
  @Get('notifications')
  @UseGuards(AdminGuard)
  async getAdminNotifications() {
    return this.adminService.getAdminNotifications();
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
  // TEAM MANAGEMENT & INVITATIONS
  // ==========================================
  @Get('team-members')
  @UseGuards(AdminGuard)
  @RequirePermissions('team.view')
  async getTeamMembers(
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('status') status?: string,
  ) {
    return this.adminService.getTeamMembers(search, role, status);
  }

  @Post('invitations')
  @UseGuards(AdminGuard)
  @RequirePermissions('team.invite')
  async inviteTeamMember(
    @Body() dto: InviteTeamMemberDto,
    @CurrentAdmin() admin: AdminUser,
  ) {
    return this.adminService.inviteMember(admin, dto);
  }

  @Post('invitations/:id/resend')
  @UseGuards(AdminGuard)
  @RequirePermissions('team.invite')
  async resendInvitation(
    @Param('id') id: string,
    @CurrentAdmin() admin: AdminUser,
  ) {
    return this.adminService.resendInvitation(admin, id);
  }

  @Post('invitations/:id/revoke')
  @UseGuards(AdminGuard)
  @RequirePermissions('team.suspend')
  async revokeInvitation(
    @Param('id') id: string,
    @CurrentAdmin() admin: AdminUser,
  ) {
    return this.adminService.revokeInvitation(admin, id);
  }

  @Patch('team-members/:id/role')
  @UseGuards(AdminGuard)
  @RequirePermissions('roles.assign')
  async updateMemberRole(
    @Param('id') id: string,
    @Body() dto: UpdateTeamMemberRoleDto,
    @CurrentAdmin() admin: AdminUser,
  ) {
    return this.adminService.updateMemberRole(admin, id, dto);
  }

  @Patch('team-members/:id/status')
  @UseGuards(AdminGuard)
  @RequirePermissions('team.suspend')
  async updateMemberStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTeamMemberStatusDto,
    @CurrentAdmin() admin: AdminUser,
  ) {
    return this.adminService.updateMemberStatus(admin, id, dto);
  }

  @Delete('team-members/:id')
  @UseGuards(AdminGuard)
  @RequirePermissions('team.suspend')
  async deleteMember(
    @Param('id') id: string,
    @CurrentAdmin() admin: AdminUser,
  ) {
    return this.adminService.deleteMember(admin, id);
  }

  // ==========================================
  // INVITATION ACCEPTANCE (PUBLIC)
  // ==========================================
  @Get('invitations/validate')
  async validateInvitationToken(@Query('token') token: string) {
    return this.adminService.validateInvitationToken(token);
  }

  @Post('invitations/accept')
  @HttpCode(HttpStatus.OK)
  async acceptInvitation(@Body() dto: AcceptInvitationDto) {
    return this.adminService.acceptInvitation(dto);
  }

  // ==========================================
  // ROLES & PERMISSIONS MANAGEMENT
  // ==========================================
  @Get('permissions')
  @UseGuards(AdminGuard)
  @RequirePermissions('roles.view')
  async getAllPermissions() {
    return this.adminService.getAllPermissions();
  }

  @Get('roles')
  @UseGuards(AdminGuard)
  @RequirePermissions('roles.view')
  async getAllRoles() {
    return this.adminService.getAllRoles();
  }

  @Get('roles/:id')
  @UseGuards(AdminGuard)
  @RequirePermissions('roles.view')
  async getRole(@Param('id') id: string) {
    return this.adminService.getRole(id);
  }

  @Post('roles')
  @UseGuards(AdminGuard)
  @RequirePermissions('roles.create')
  async createCustomRole(
    @Body() dto: CreateCustomRoleDto,
    @CurrentAdmin() admin: AdminUser,
  ) {
    return this.adminService.createCustomRole(admin, dto);
  }

  @Patch('roles/:id')
  @UseGuards(AdminGuard)
  @RequirePermissions('roles.update')
  async updateCustomRole(
    @Param('id') id: string,
    @Body() dto: UpdateCustomRoleDto,
    @CurrentAdmin() admin: AdminUser,
  ) {
    return this.adminService.updateCustomRole(admin, id, dto);
  }

  @Delete('roles/:id')
  @UseGuards(AdminGuard)
  @AdminRoles('SUPER_ADMIN')
  async deleteCustomRole(
    @Param('id') id: string,
    @CurrentAdmin() admin: AdminUser,
  ) {
    return this.adminService.deleteCustomRole(admin, id);
  }

  // ==========================================
  // SYSTEM SETTINGS & INTEGRATIONS
  // ==========================================
  @Get('settings/:category')
  @UseGuards(AdminGuard)
  @RequirePermissions('settings.view')
  async getSettingsByCategory(@Param('category') category: string) {
    return this.adminService.getSettingsByCategory(category);
  }

  @Patch('settings/:category')
  @UseGuards(AdminGuard)
  @RequirePermissions('settings.update')
  async updateSettingsCategory(
    @Param('category') category: string,
    @Body() body: Record<string, any>,
    @CurrentAdmin() admin: AdminUser,
  ) {
    return this.adminService.updateSettingsCategory(admin, category, body);
  }

  @Post('settings/integrations/:provider/test')
  @UseGuards(AdminGuard)
  @RequirePermissions('integrations.manage')
  async testIntegrationConnection(@Param('provider') provider: string) {
    return this.adminService.testIntegration(provider);
  }

  // ==========================================
  // SIDEBAR OPERATIONAL DOMAINS
  // ==========================================
  @Get('activity')
  @UseGuards(AdminGuard)
  @RequirePermissions('activity.view')
  async getActivityOverview(@Query('limit') limit?: number) {
    return this.adminService.getActivityOverview(Number(limit) || 30);
  }

  @Get('bank-verifications')
  @UseGuards(AdminGuard)
  @RequirePermissions('bank_verification.view')
  async getBankVerifications(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getBankVerifications({ page, limit, status, search });
  }

  @Get('risk-profiles')
  @UseGuards(AdminGuard)
  @RequirePermissions('risk_profiles.view')
  async getRiskProfiles(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getRiskProfiles({ page, limit, category, search });
  }

  @Get('goals')
  @UseGuards(AdminGuard)
  @RequirePermissions('goals.view')
  async getFinancialGoals(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getFinancialGoals({ page, limit, status, search });
  }

  @Get('investment-accounts')
  @UseGuards(AdminGuard)
  @RequirePermissions('investment_accounts.view')
  async getInvestmentAccounts(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getInvestmentAccounts({ page, limit, status, search });
  }

  @Get('portfolios')
  @UseGuards(AdminGuard)
  @RequirePermissions('portfolio.view')
  async getPortfolioOverview(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.adminService.getPortfolioOverview({ page, limit, search });
  }

  @Get('sips')
  @UseGuards(AdminGuard)
  @RequirePermissions('sip.view')
  async getSipManagement(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getSipManagement({ page, limit, status, search });
  }

  @Get('order-status')
  @UseGuards(AdminGuard)
  @RequirePermissions('order_status.view')
  async getOrderStatus(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getOrderStatus({ page, limit, status, search });
  }

  @Get('tasks')
  @UseGuards(AdminGuard)
  @RequirePermissions('tasks.view')
  async getOperationalTasks(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getOperationalTasks({ page, limit, status, search });
  }

  @Get('compliance')
  @UseGuards(AdminGuard)
  @RequirePermissions('compliance.view')
  async getComplianceRecords(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getComplianceRecords({ page, limit, status, search });
  }
}
