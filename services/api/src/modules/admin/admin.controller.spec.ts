import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminGuard, AdminUser } from './admin.guard';
import { JwtService } from '@nestjs/jwt';

describe('AdminController', () => {
  let controller: AdminController;
  let adminService: any;

  const mockAdminUser: AdminUser = {
    id: 'staff-sa-001',
    email: 'admin@techartha.com',
    name: 'Super Admin',
    role: 'SUPER_ADMIN',
    permissions: ['*'],
    canViewSensitivePii: true,
    isAdmin: true,
  };

  beforeEach(async () => {
    adminService = {
      login: jest.fn().mockResolvedValue({ token: 'mock-token', user: mockAdminUser }),
      getDashboardStats: jest.fn().mockResolvedValue({ users: { total: 10 } }),
      getUsers: jest.fn().mockResolvedValue({ data: [], pagination: {} }),
      getUserDetails: jest.fn().mockResolvedValue({ user: { id: 'u-1' } }),
      getOnboardingQueue: jest.fn().mockResolvedValue({ data: [], pagination: {} }),
      updateKycManualReview: jest.fn().mockResolvedValue({ id: 'app-1', overallStatus: 'VERIFIED' }),
      getTransactions: jest.fn().mockResolvedValue({ data: [], pagination: {} }),
      getSupportTickets: jest.fn().mockResolvedValue({ data: [], pagination: {} }),
      updateSupportTicket: jest.fn().mockResolvedValue({ id: 'ticket-1', status: 'RESOLVED' }),
      getAuditLogs: jest.fn().mockResolvedValue({ data: [], pagination: {} }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        { provide: AdminService, useValue: adminService },
        { provide: JwtService, useValue: { verifyAsync: jest.fn() } },
        { provide: AdminGuard, useValue: { canActivate: jest.fn().mockReturnValue(true) } },
      ],
    })
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AdminController>(AdminController);
  });

  it('delegates login to adminService', async () => {
    const res = await controller.login({ email: 'admin@techartha.com', password: 'pwd' });
    expect(res).toEqual({ token: 'mock-token', user: mockAdminUser });
    expect(adminService.login).toHaveBeenCalledWith({ email: 'admin@techartha.com', password: 'pwd' });
  });

  it('delegates getDashboardStats to adminService', async () => {
    const stats = await controller.getDashboardStats();
    expect(stats).toEqual({ users: { total: 10 } });
    expect(adminService.getDashboardStats).toHaveBeenCalled();
  });

  it('delegates getUsers to adminService', async () => {
    await controller.getUsers(1, 10, 'Neha', 'active', 'VERIFIED', 'true', mockAdminUser);
    expect(adminService.getUsers).toHaveBeenCalledWith(
      { page: 1, limit: 10, search: 'Neha', status: 'active', kycStatus: 'VERIFIED', maskPii: true },
      mockAdminUser,
    );
  });

  it('delegates updateKycStatus to adminService', async () => {
    await controller.updateKycStatus('app-1', { overallStatus: 'VERIFIED' }, mockAdminUser);
    expect(adminService.updateKycManualReview).toHaveBeenCalledWith('app-1', { overallStatus: 'VERIFIED' }, mockAdminUser);
  });
});
