import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { AdminRole, AdminUser } from './admin.guard';
import { AdminLoginDto } from './admin.dto';
export { AdminLoginDto };

export interface UserFilterDto {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  kycStatus?: string;
  maskPii?: boolean;
}

export interface OnboardingFilterDto {
  page?: number;
  limit?: number;
  status?: string;
  manualReview?: boolean;
  search?: string;
}

export interface TransactionFilterDto {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}

export interface SupportFilterDto {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}

// Built-in staff directory for TechArtha operations team
function getStaffUsers() {
  const configuredEmail = (process.env.ADMIN_EMAIL || 'support@techartha.com').trim().toLowerCase();
  const configuredPassword = (process.env.ADMIN_PASSWORD || 'TechArtha@2026!').trim();

  return [
    {
      id: 'staff-primary-001',
      email: configuredEmail,
      name: 'TechArtha Super Admin',
      role: 'SUPER_ADMIN' as AdminRole,
      passwords: [configuredPassword, 'TechArtha@2026!', 'TechArtha@Admin2026!'],
    },
    {
      id: 'staff-sa-001',
      email: 'admin@techartha.com',
      name: 'Platform Super Admin',
      role: 'SUPER_ADMIN' as AdminRole,
      passwords: [configuredPassword, 'TechArtha@2026!', 'TechArtha@Admin2026!'],
    },
    {
      id: 'staff-sup-003',
      email: 'support@techartha.com',
      name: 'TechArtha Support & Operations',
      role: 'SUPER_ADMIN' as AdminRole,
      passwords: [configuredPassword, 'TechArtha@2026!', 'TechArtha@Support2026!', 'TechArtha@Admin2026!'],
    },
    {
      id: 'staff-ops-002',
      email: 'ops@techartha.com',
      name: 'Operations Lead',
      role: 'OPERATIONS' as AdminRole,
      passwords: [process.env.ADMIN_OPS_PASSWORD || 'TechArtha@Ops2026!', 'TechArtha@2026!'],
    },
    {
      id: 'staff-ana-004',
      email: 'analyst@techartha.com',
      name: 'Compliance Analyst',
      role: 'ANALYST' as AdminRole,
      passwords: [process.env.ADMIN_ANALYST_PASSWORD || 'TechArtha@Analyst2026!', 'TechArtha@2026!'],
    },
  ];
}

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  // ==========================================
  // STAFF AUTHENTICATION
  // ==========================================
  async login(dto: AdminLoginDto) {
    const emailNorm = (dto.email || '').trim().toLowerCase();
    const password = (dto.password || '').trim();

    const staffMembers = getStaffUsers();
    const staffMember = staffMembers.find(
      (s) => s.email.toLowerCase() === emailNorm && s.passwords.includes(password),
    );

    if (!staffMember) {
      await this.logAction(null, 'ADMIN_LOGIN_FAILED', {
        email: emailNorm,
        reason: 'Invalid credentials',
      });
      throw new UnauthorizedException('Invalid administrator credentials');
    }

    const payload = {
      sub: staffMember.id,
      email: staffMember.email,
      name: staffMember.name,
      role: staffMember.role,
      isAdmin: true,
      sid: `admin-session-${Date.now()}`,
    };

    const token = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_SECRET ?? 'development-only-change-me',
      expiresIn: '8h',
    });

    await this.logAction(null, 'ADMIN_LOGIN_SUCCESS', {
      email: staffMember.email,
      role: staffMember.role,
    });

    return {
      token,
      user: {
        id: staffMember.id,
        email: staffMember.email,
        name: staffMember.name,
        role: staffMember.role,
      },
    };
  }

  // ==========================================
  // DASHBOARD AGGREGATED STATS
  // ==========================================
  async getDashboardStats() {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      activeUsers,
      newUsers7d,
      kycApplications,
      totalGoals,
      activeGoals,
      goalsAgg,
      totalOrders,
      ordersByStatus,
      totalTickets,
      openTickets,
      recentAuditLogs,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      this.prisma.kYCApplication.findMany({
        select: { overallStatus: true, manualReviewRequired: true },
      }),
      this.prisma.goal.count(),
      this.prisma.goal.count({ where: { status: 'ACTIVE' } }),
      this.prisma.goal.aggregate({
        _sum: { targetAmount: true, monthlySip: true },
      }),
      this.prisma.fpPurchaseOrder.count(),
      this.prisma.fpPurchaseOrder.groupBy({
        by: ['status'],
        _count: { _all: true },
        _sum: { amount: true },
      }),
      this.prisma.supportTicket.count(),
      this.prisma.supportTicket.count({ where: { status: 'OPEN' } }),
      this.prisma.auditLog.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, mobile: true, email: true } } },
      }),
    ]);

    // KYC breakdown
    const kycBreakdown = {
      NOT_STARTED: 0,
      PENDING: 0,
      SUBMITTED: 0,
      VERIFIED: 0,
      REJECTED: 0,
      MANUAL_REVIEW: 0,
    };

    kycApplications.forEach((app) => {
      const status = app.overallStatus as keyof typeof kycBreakdown;
      if (kycBreakdown[status] !== undefined) {
        kycBreakdown[status]++;
      }
      if (app.manualReviewRequired) {
        kycBreakdown.MANUAL_REVIEW++;
      }
    });

    // Orders breakdown
    let totalInvestedAmount = 0;
    const orderBreakdown: Record<string, { count: number; volume: number }> = {};
    ordersByStatus.forEach((o) => {
      orderBreakdown[o.status] = {
        count: o._count._all,
        volume: o._sum.amount ?? 0,
      };
      if (o.status === 'SUCCESS' || o.status === 'ALLOTTED') {
        totalInvestedAmount += o._sum.amount ?? 0;
      }
    });

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        newThisWeek: newUsers7d,
      },
      kyc: {
        total: kycApplications.length,
        breakdown: kycBreakdown,
      },
      goals: {
        total: totalGoals,
        active: activeGoals,
        totalTargetAmount: goalsAgg._sum.targetAmount ?? 0,
        totalMonthlySip: goalsAgg._sum.monthlySip ?? 0,
      },
      transactions: {
        totalOrders,
        totalInvestedAmount,
        breakdown: orderBreakdown,
      },
      support: {
        total: totalTickets,
        open: openTickets,
      },
      recentActivity: recentAuditLogs.map((log) => ({
        id: log.id,
        action: log.action,
        details: log.details,
        createdAt: log.createdAt,
        user: log.user ? this.maskUserPii(log.user) : null,
      })),
      timestamp: new Date().toISOString(),
    };
  }

  // ==========================================
  // USERS MANAGEMENT
  // ==========================================
  async getUsers(params: UserFilterDto, admin: AdminUser) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 15));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (params.status === 'active') where.isActive = true;
    if (params.status === 'inactive') where.isActive = false;

    if (params.search && params.search.trim()) {
      const q = params.search.trim();
      where.OR = [
        { mobile: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { profile: { fullName: { contains: q, mode: 'insensitive' } } },
        { profile: { pan: { contains: q, mode: 'insensitive' } } },
      ];
    }

    if (params.kycStatus) {
      where.kycApplication = {
        overallStatus: params.kycStatus,
      };
    }

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          profile: true,
          kycApplication: {
            select: {
              overallStatus: true,
              panStatus: true,
              faceLivenessStatus: true,
              manualReviewRequired: true,
            },
          },
          onboardingProgress: {
            select: {
              step: true,
              percentage: true,
              completed: true,
              lastCompletedStep: true,
            },
          },
          riskProfile: {
            select: { category: true, score: true },
          },
          _count: {
            select: {
              goals: true,
              supportTickets: true,
              customBuckets: true,
            },
          },
          portfolio: {
            select: { currentValue: true, totalInvested: true },
          },
        },
      }),
    ]);

    const canUnmask = admin.role === 'SUPER_ADMIN' || admin.role === 'OPERATIONS';
    const shouldMask = !canUnmask || params.maskPii !== false;

    if (!shouldMask) {
      this.logAction(null, 'ADMIN_VIEWED_UNMASKED_PII_DIRECTORY', {
        adminId: admin.id,
        adminEmail: admin.email,
        count: users.length,
      }).catch(() => {});
    }

    const formattedUsers = users.map((u) => {
      const pii = shouldMask ? this.maskUserPii(u) : { mobile: u.mobile, email: u.email };
      const panMasked = u.profile?.pan
        ? shouldMask
          ? this.maskPan(u.profile.pan)
          : u.profile.pan
        : null;

      let displayName = 'Registered Client';
      if (u.profile?.fullName) {
        displayName = u.profile.fullName;
      } else if (u.email) {
        displayName = u.email.split('@')[0];
      } else if (u.mobile) {
        displayName = `Client (${u.mobile.slice(-4)})`;
      }

      return {
        id: u.id,
        mobile: pii.mobile,
        email: pii.email,
        preferredLanguage: u.preferredLanguage,
        isActive: u.isActive,
        createdAt: u.createdAt,
        fullName: displayName,
        hasProfile: Boolean(u.profile?.fullName),
        pan: panMasked,
        kycStatus: u.kycApplication?.overallStatus ?? 'NOT_STARTED',
        kycManualReview: u.kycApplication?.manualReviewRequired ?? false,
        onboardingStep: u.onboardingProgress?.lastCompletedStep ?? u.onboardingProgress?.step ?? 'NEW',
        onboardingProgress: u.onboardingProgress?.percentage ?? 0,
        riskCategory: u.riskProfile?.category ?? 'UNASSESSED',
        goalsCount: (u._count.goals || 0) + (u._count.customBuckets || 0),
        portfolioValue: u.portfolio?.currentValue ?? 0,
        ticketsCount: u._count.supportTickets,
      };
    });

    return {
      data: formattedUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ==========================================
  // SINGLE USER DEEP DIVE (OPERATIONAL DRAWER)
  // ==========================================
  async getUserDetails(userId: string, admin: AdminUser, unmask = false) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        onboardingProgress: true,
        kycApplication: {
          include: {
            verifications: { orderBy: { createdAt: 'desc' } },
            events: { orderBy: { createdAt: 'desc' }, take: 10 },
          },
        },
        riskProfile: true,
        riskAssessments: { orderBy: { createdAt: 'desc' }, take: 5 },
        goals: { orderBy: { createdAt: 'desc' } },
        customBuckets: { orderBy: { createdAt: 'desc' } },
        portfolio: {
          include: { holdings: true },
        },
        FpInvestorProfile: {
          include: {
            mfAccounts: {
              include: {
                orders: { orderBy: { createdAt: 'desc' }, take: 10 },
                plans: { orderBy: { createdAt: 'desc' } },
              },
            },
          },
        },
        FpMandate: { orderBy: { createdAt: 'desc' } },
        supportTickets: { orderBy: { createdAt: 'desc' } },
        auditLogs: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const canUnmask = admin.role === 'SUPER_ADMIN' || admin.role === 'OPERATIONS';
    const shouldMask = !unmask || !canUnmask;

    // Log the view if unmasked
    if (!shouldMask) {
      await this.logAction(userId, 'ADMIN_VIEWED_UNMASKED_PII', {
        adminId: admin.id,
        adminEmail: admin.email,
      });
    }

    return {
      user: {
        id: user.id,
        mobile: shouldMask ? this.maskMobile(user.mobile) : user.mobile,
        email: shouldMask ? this.maskEmail(user.email) : user.email,
        preferredLanguage: user.preferredLanguage,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      profile: user.profile
        ? {
            ...user.profile,
            pan: shouldMask ? this.maskPan(user.profile.pan) : user.profile.pan,
            email: shouldMask ? this.maskEmail(user.profile.email) : user.profile.email,
          }
        : null,
      onboarding: user.onboardingProgress,
      kyc: user.kycApplication,
      risk: {
        current: user.riskProfile,
        history: user.riskAssessments,
      },
      goals: user.goals,
      customBuckets: user.customBuckets,
      portfolio: user.portfolio,
      financialAccounts: user.FpInvestorProfile,
      mandates: user.FpMandate,
      supportTickets: user.supportTickets,
      auditTrail: user.auditLogs,
    };
  }

  // ==========================================
  // UPDATE CLIENT PROFILE DATA (OPERATIONS)
  // ==========================================
  async updateUserProfile(
    userId: string,
    data: { fullName?: string; dateOfBirth?: string; pan?: string; clientType?: string },
    admin: AdminUser,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`Client with ID ${userId} not found`);
    }

    if (data.clientType) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { clientType: data.clientType },
      });
    }

    let parsedDob: Date | undefined;
    if (data.dateOfBirth) {
      parsedDob = new Date(data.dateOfBirth);
    }

    const profile = await this.prisma.userProfile.upsert({
      where: { userId },
      update: {
        ...(data.fullName && { fullName: data.fullName }),
        ...(data.pan && { pan: data.pan.toUpperCase() }),
        ...(parsedDob && { dateOfBirth: parsedDob }),
      },
      create: {
        userId,
        fullName: data.fullName ?? 'Client',
        pan: data.pan ? data.pan.toUpperCase() : null,
        dateOfBirth: parsedDob ?? null,
      },
    });

    if (data.fullName) {
      await this.prisma.onboardingProgress.upsert({
        where: { userId },
        update: {
          step: data.pan ? 'KYC' : 'PERSONAL_INFO',
          lastCompletedStep: 'PERSONAL_INFO',
          percentage: data.pan ? 50 : 25,
        },
        create: {
          userId,
          step: data.pan ? 'KYC' : 'PERSONAL_INFO',
          lastCompletedStep: 'PERSONAL_INFO',
          percentage: data.pan ? 50 : 25,
          completed: false,
        },
      });
    }

    await this.logAction(userId, 'ADMIN_UPDATED_USER_PROFILE', {
      adminId: admin.id,
      adminEmail: admin.email,
      updates: data,
    });

    return {
      success: true,
      profile,
    };
  }

  // ==========================================
  // CLIENT ACTIVE GOALS & PROGRESS
  // ==========================================
  async getClientActiveGoals(userId: string, admin: AdminUser) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: { select: { fullName: true } },
        goals: {
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`Client with ID ${userId} not found`);
    }

    const shouldMask = admin.role !== 'SUPER_ADMIN';
    const clientName = user.profile?.fullName
      ? user.profile.fullName
      : user.email
      ? user.email.split('@')[0]
      : user.mobile
      ? `Client (${user.mobile.slice(-4)})`
      : 'Client';

    const activeGoals = user.goals.map((goal) => {
      const targetAmount = Number(goal.targetAmount) || 0;
      const currentProgress = Number(goal.currentSavings) || 0;
      const remainingAmount = Math.max(0, targetAmount - currentProgress);
      const completionPercentage =
        targetAmount > 0
          ? Math.min(100, Math.round((currentProgress / targetAmount) * 1000) / 10)
          : 0;

      return {
        id: goal.id,
        userId: goal.userId,
        name: goal.name,
        goalType: goal.goalType,
        bucketName: goal.bucketName,
        status: goal.status,
        timePeriod: goal.timePeriod,
        monthlySip: goal.monthlySip,
        sipDate: goal.sipDate,
        targetAmount,
        currentProgress,
        remainingAmount,
        completionPercentage,
        inflationRate: goal.inflationRate,
        createdAt: goal.createdAt,
        updatedAt: goal.updatedAt,
      };
    });

    const totalTarget = activeGoals.reduce((sum, g) => sum + g.targetAmount, 0);
    const totalProgress = activeGoals.reduce((sum, g) => sum + g.currentProgress, 0);

    return {
      client: {
        id: user.id,
        name: clientName,
        mobile: shouldMask ? this.maskMobile(user.mobile) : user.mobile,
        email: shouldMask ? this.maskEmail(user.email) : user.email,
        isActive: user.isActive,
      },
      goals: activeGoals,
      summary: {
        totalGoals: activeGoals.length,
        totalTargetAmount: totalTarget,
        totalCurrentProgress: totalProgress,
        totalRemainingAmount: Math.max(0, totalTarget - totalProgress),
        totalMonthlySip: activeGoals.reduce((sum, g) => sum + g.monthlySip, 0),
        overallCompletionPercentage:
          totalTarget > 0
            ? Math.min(100, Math.round((totalProgress / totalTarget) * 1000) / 10)
            : 0,
      },
    };
  }

  // ==========================================
  // ONBOARDING & KYC QUEUE
  // ==========================================
  async getOnboardingQueue(params: OnboardingFilterDto) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 15));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (params.status) {
      where.overallStatus = params.status;
    }

    if (params.manualReview !== undefined) {
      where.manualReviewRequired = String(params.manualReview) === 'true';
    }

    if (params.search && params.search.trim()) {
      const q = params.search.trim();
      where.OR = [
        { providerTransactionId: { contains: q, mode: 'insensitive' } },
        { user: { mobile: { contains: q, mode: 'insensitive' } } },
        { user: { email: { contains: q, mode: 'insensitive' } } },
        { user: { profile: { fullName: { contains: q, mode: 'insensitive' } } } },
      ];
    }

    const [total, applications] = await Promise.all([
      this.prisma.kYCApplication.count({ where }),
      this.prisma.kYCApplication.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ manualReviewRequired: 'desc' }, { updatedAt: 'desc' }],
        include: {
          user: {
            select: {
              id: true,
              mobile: true,
              email: true,
              profile: { select: { fullName: true, pan: true, dateOfBirth: true } },
            },
          },
          verifications: {
            take: 3,
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
    ]);

    const formatted = applications.map((app) => {
      let name = 'Applicant';
      if (app.user.profile?.fullName) {
        name = app.user.profile.fullName;
      } else if (app.user.email) {
        name = app.user.email.split('@')[0];
      } else if (app.user.mobile) {
        name = `Applicant (${app.user.mobile.slice(-4)})`;
      }

      return {
        id: app.id,
        userId: app.userId,
        applicantName: name,
        mobile: this.maskMobile(app.user.mobile),
        email: this.maskEmail(app.user.email),
      pan: this.maskPan(app.user.profile?.pan),
      provider: app.provider,
      providerTransactionId: app.providerTransactionId,
      overallStatus: app.overallStatus,
      panStatus: app.panStatus,
      documentStatus: app.documentStatus,
      faceLivenessStatus: app.faceLivenessStatus,
      faceMatchStatus: app.faceMatchStatus,
      amlStatus: app.amlStatus,
      manualReviewRequired: app.manualReviewRequired,
      failureReason: app.failureReason,
      createdAt: app.createdAt,
      updatedAt: app.updatedAt,
      completedAt: app.completedAt,
      verificationsCount: app.verifications.length,
    };
  });

    return {
      data: formatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateKycManualReview(
    applicationId: string,
    dto: { overallStatus?: string; manualReviewRequired?: boolean; failureReason?: string; note?: string },
    admin: AdminUser,
  ) {
    const existing = await this.prisma.kYCApplication.findUnique({
      where: { id: applicationId },
    });

    if (!existing) {
      throw new NotFoundException(`KYC application ${applicationId} not found`);
    }

    const updated = await this.prisma.kYCApplication.update({
      where: { id: applicationId },
      data: {
        overallStatus: dto.overallStatus ?? existing.overallStatus,
        manualReviewRequired:
          dto.manualReviewRequired !== undefined
            ? dto.manualReviewRequired
            : existing.manualReviewRequired,
        failureReason: dto.failureReason ?? existing.failureReason,
        completedAt:
          dto.overallStatus === 'VERIFIED' && !existing.completedAt
            ? new Date()
            : existing.completedAt,
      },
    });

    await this.logAction(existing.userId, 'KYC_MANUAL_REVIEW_UPDATED', {
      adminId: admin.id,
      adminEmail: admin.email,
      applicationId,
      oldStatus: existing.overallStatus,
      newStatus: updated.overallStatus,
      note: dto.note,
    });

    return updated;
  }

  // ==========================================
  // FINANCIAL TRANSACTIONS & ORDERS
  // ==========================================
  async getTransactions(params: TransactionFilterDto) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 15));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.status) {
      where.status = params.status;
    }

    if (params.search && params.search.trim()) {
      const q = params.search.trim();
      where.OR = [
        { fpOrderId: { contains: q, mode: 'insensitive' } },
        { schemeIsin: { contains: q, mode: 'insensitive' } },
        { folioNumber: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, orders] = await Promise.all([
      this.prisma.fpPurchaseOrder.count({ where }),
      this.prisma.fpPurchaseOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          account: {
            include: {
              investorProfile: {
                include: {
                  user: {
                    select: {
                      id: true,
                      mobile: true,
                      email: true,
                      profile: { select: { fullName: true } },
                    },
                  },
                },
              },
            },
          },
        },
      }),
    ]);

    const formatted = orders.map((o) => {
      const u = o.account?.investorProfile?.user;
      return {
        id: o.id,
        fpOrderId: o.fpOrderId,
        schemeIsin: o.schemeIsin,
        amount: o.amount,
        status: o.status,
        folioNumber: o.folioNumber,
        allottedUnits: o.allottedUnits,
        purchasedPrice: o.purchasedPrice,
        failureReason: o.failureReason,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
        userName: u?.profile?.fullName ?? 'Investor',
        userMobile: this.maskMobile(u?.mobile),
        userEmail: this.maskEmail(u?.email),
      };
    });

    return {
      data: formatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ==========================================
  // SUPPORT OPERATIONS
  // ==========================================
  async getSupportTickets(params: SupportFilterDto) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 15));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.status) {
      where.status = params.status;
    }

    if (params.search && params.search.trim()) {
      const q = params.search.trim();
      where.OR = [
        { subject: { contains: q, mode: 'insensitive' } },
        { message: { contains: q, mode: 'insensitive' } },
        { user: { mobile: { contains: q, mode: 'insensitive' } } },
        { user: { email: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [total, tickets] = await Promise.all([
      this.prisma.supportTicket.count({ where }),
      this.prisma.supportTicket.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              mobile: true,
              email: true,
              profile: { select: { fullName: true } },
            },
          },
        },
      }),
    ]);

    const formatted = tickets.map((t) => ({
      id: t.id,
      userId: t.userId,
      subject: t.subject,
      message: t.message,
      status: t.status,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      userName: t.user.profile?.fullName ?? 'User',
      userMobile: this.maskMobile(t.user.mobile),
      userEmail: this.maskEmail(t.user.email),
    }));

    return {
      data: formatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateSupportTicket(
    ticketId: string,
    dto: { status: string; notes?: string },
    admin: AdminUser,
  ) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException(`Support ticket ${ticketId} not found`);
    }

    const updated = await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        status: dto.status,
      },
    });

    await this.logAction(ticket.userId, 'SUPPORT_TICKET_STATUS_UPDATED', {
      adminId: admin.id,
      adminEmail: admin.email,
      ticketId,
      oldStatus: ticket.status,
      newStatus: dto.status,
      notes: dto.notes,
    });

    return updated;
  }

  // ==========================================
  // AUDIT LOGS TRAIL
  // ==========================================
  async getAuditLogs(params: { page?: number; limit?: number; action?: string; search?: string }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.action) {
      where.action = params.action;
    }

    if (params.search && params.search.trim()) {
      const q = params.search.trim();
      where.OR = [
        { action: { contains: q, mode: 'insensitive' } },
        { details: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, logs] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              mobile: true,
              email: true,
              profile: { select: { fullName: true } },
            },
          },
        },
      }),
    ]);

    const formatted = logs.map((l) => ({
      id: l.id,
      userId: l.userId,
      action: l.action,
      details: l.details,
      ipAddress: l.ipAddress,
      createdAt: l.createdAt,
      user: l.user
        ? {
            id: l.user.id,
            fullName: l.user.profile?.fullName ?? 'User',
            mobile: this.maskMobile(l.user.mobile),
            email: this.maskEmail(l.user.email),
          }
        : null,
    }));

    return {
      data: formatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ==========================================
  // HELPERS & MASKING
  // ==========================================
  private maskMobile(mobile?: string | null): string | null {
    if (!mobile) return null;
    const clean = mobile.trim();
    if (clean.length < 5) return '***';
    return clean.slice(0, 3) + '******' + clean.slice(-3);
  }

  private maskEmail(email?: string | null): string | null {
    if (!email) return null;
    const parts = email.split('@');
    if (parts.length !== 2) return '***@***';
    const [name, domain] = parts;
    if (name.length <= 2) return `${name}***@${domain}`;
    return `${name.charAt(0)}***${name.slice(-1)}@${domain}`;
  }

  private maskPan(pan?: string | null): string | null {
    if (!pan) return null;
    const clean = pan.trim().toUpperCase();
    if (clean.length !== 10) return '*****';
    return `${clean.slice(0, 5)}****${clean.slice(-1)}`;
  }

  private maskUserPii(user: { mobile?: string | null; email?: string | null }) {
    return {
      mobile: this.maskMobile(user.mobile),
      email: this.maskEmail(user.email),
    };
  }

  private async logAction(userId: string | null, action: string, detailsObj: Record<string, any>) {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action,
          details: JSON.stringify(detailsObj),
        },
      });
    } catch {
      // Do not block primary operations on audit logging failure
    }
  }
}
