import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, NotFoundException } from '@nestjs/common';
import { AdminInvitationEmailService } from './admin-invitation-email.service';
import { FreshdeskService } from '../support/freshdesk.service';
import { WhatsappService } from '../../integrations/whatsapp/whatsapp.service';
import { SupportEmailService } from '../support/email.service';

describe('AdminService', () => {
  let service: AdminService;
  let prisma: any;
  let jwt: any;
  let invitationEmail: any;
  let freshdesk: any;
  let whatsapp: any;
  let supportEmail: any;

  beforeEach(async () => {
    prisma = {
      user: {
        count: jest.fn().mockResolvedValue(42),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
      },
      kYCApplication: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(10),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      goal: {
        count: jest.fn().mockResolvedValue(15),
        aggregate: jest.fn().mockResolvedValue({ _sum: { targetAmount: 500000, monthlySip: 25000 } }),
      },
      fpPurchaseOrder: {
        count: jest.fn().mockResolvedValue(8),
        groupBy: jest.fn().mockResolvedValue([]),
        findMany: jest.fn().mockResolvedValue([]),
      },
      supportTicket: {
        count: jest.fn().mockResolvedValue(3),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      auditLog: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({}),
        count: jest.fn().mockResolvedValue(5),
      },
      adminUser: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
      },
      adminRole: {
        findUnique: jest.fn().mockResolvedValue({ id: 'role-super-admin' }),
      },
    };

    jwt = {
      signAsync: jest.fn().mockResolvedValue('mock-admin-jwt-token'),
      verifyAsync: jest.fn(),
    };

    invitationEmail = {
      sendInvitationEmail: jest.fn().mockResolvedValue(true),
    };

    freshdesk = {
      createTicket: jest.fn().mockResolvedValue({ id: 1001 }),
      replyToTicket: jest.fn().mockResolvedValue({}),
    };

    whatsapp = {
      sendWhatsAppMessage: jest.fn().mockResolvedValue({ success: true }),
    };

    supportEmail = {
      sendAgentReplyEmail: jest.fn().mockResolvedValue({ success: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
        { provide: AdminInvitationEmailService, useValue: invitationEmail },
        { provide: FreshdeskService, useValue: freshdesk },
        { provide: WhatsappService, useValue: whatsapp },
        { provide: SupportEmailService, useValue: supportEmail },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  describe('login', () => {
    it('authenticates valid super admin and returns JWT', async () => {
      const result = await service.login({
        email: 'admin@techartha.com',
        password: 'TechArtha@Admin2026!',
      });

      expect(result).toHaveProperty('token', 'mock-admin-jwt-token');
      expect(result.user.role).toBe('SUPER_ADMIN');
      expect(jwt.signAsync).toHaveBeenCalled();
    });

    it('throws UnauthorizedException on invalid password', async () => {
      await expect(
        service.login({
          email: 'admin@techartha.com',
          password: 'WrongPassword!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getDashboardStats', () => {
    it('aggregates live platform metrics accurately', async () => {
      const stats = await service.getDashboardStats();
      expect(stats.users.total).toBe(42);
      expect(stats.goals.total).toBe(15);
      expect(stats.goals.totalTargetAmount).toBe(500000);
      expect(stats.support.total).toBe(3);
    });
  });

  describe('getUsers', () => {
    it('returns formatted and masked users for staff', async () => {
      prisma.user.findMany.mockResolvedValue([
        {
          id: 'u-1',
          mobile: '9876543210',
          email: 'neha@example.com',
          preferredLanguage: 'en',
          isActive: true,
          createdAt: new Date(),
          profile: { fullName: 'Neha Sharma', pan: 'ABCDE1234F' },
          kycApplication: { overallStatus: 'VERIFIED', manualReviewRequired: false },
          onboardingProgress: { step: 'COMPLETE', percentage: 100, lastCompletedStep: 'RISK' },
          riskProfile: { category: 'MODERATE', score: 28 },
          _count: { goals: 2, supportTickets: 0 },
          portfolio: { currentValue: 50000, totalInvested: 45000 },
        },
      ]);
      prisma.user.count.mockResolvedValue(1);

      const result = await service.getUsers(
        {},
        {
          id: 'staff-ops',
          email: 'ops@techartha.com',
          name: 'Ops',
          role: 'OPERATIONS',
          permissions: ['customers.view'],
          canViewSensitivePii: false,
          isAdmin: true,
        },
      );

      expect(result.data.length).toBe(1);
      expect(result.data[0].fullName).toBe('Neha Sharma');
      // PII should be masked for operations role
      expect(result.data[0].pan).toBe('ABCDE****F');
      expect(result.data[0].mobile).toContain('***');
    });
  });

  describe('getOnboardingQueue', () => {
    it('fetches onboarding applications list', async () => {
      prisma.kYCApplication.findMany.mockResolvedValue([
        {
          id: 'kyc-1',
          userId: 'u-1',
          provider: 'CYBRILLA',
          providerTransactionId: 'cyb-tx-001',
          overallStatus: 'MANUAL_REVIEW',
          panStatus: 'VERIFIED',
          documentStatus: 'VERIFIED',
          faceLivenessStatus: 'PENDING',
          faceMatchStatus: 'PENDING',
          amlStatus: 'CLEAR',
          manualReviewRequired: true,
          failureReason: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          completedAt: null,
          user: {
            id: 'u-1',
            mobile: '9876543210',
            email: 'neha@example.com',
            profile: { fullName: 'Neha Sharma', pan: 'ABCDE1234F', dateOfBirth: new Date() },
          },
          verifications: [],
        },
      ]);
      prisma.kYCApplication.count.mockResolvedValue(1);

      const queue = await service.getOnboardingQueue({});
      expect(queue.data.length).toBe(1);
      expect(queue.data[0].overallStatus).toBe('MANUAL_REVIEW');
      expect(queue.data[0].manualReviewRequired).toBe(true);
    });
  });

  describe('getClientActiveGoals', () => {
    it('returns active goals with backend progress and completion calculation', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u-1',
        mobile: '9876543210',
        email: 'neha@example.com',
        isActive: true,
        profile: { fullName: 'Neha Mahajan' },
        goals: [
          {
            id: 'g-1',
            userId: 'u-1',
            name: 'Education Goal',
            goalType: 'EDUCATION',
            bucketName: 'Balanced',
            status: 'ACTIVE',
            timePeriod: 5,
            monthlySip: 10000,
            sipDate: 5,
            targetAmount: 1000000,
            currentSavings: 250000,
            inflationRate: 6,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      });

      const res = await service.getClientActiveGoals('u-1', {
        id: 'admin-1',
        email: 'admin@techartha.com',
        name: 'Admin',
        role: 'SUPER_ADMIN',
        permissions: ['*'],
        canViewSensitivePii: true,
        isAdmin: true,
      });

      expect(res.client.id).toBe('u-1');
      expect(res.client.name).toBe('Neha Mahajan');
      expect(res.goals.length).toBe(1);
      expect(res.goals[0].currentProgress).toBe(250000);
      expect(res.goals[0].remainingAmount).toBe(750000);
      expect(res.goals[0].completionPercentage).toBe(25);
      expect(res.summary.overallCompletionPercentage).toBe(25);
    });
  });
});
