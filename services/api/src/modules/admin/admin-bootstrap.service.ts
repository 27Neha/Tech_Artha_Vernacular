import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminSecurity } from './admin-security';

export interface PermissionDef {
  slug: string;
  module: string;
  action: string;
  description: string;
}

export const PERMISSIONS_CATALOG: PermissionDef[] = [
  // Overview & Activity
  { slug: 'dashboard.view', module: 'dashboard', action: 'view', description: 'View admin dashboard overview and key metrics' },
  { slug: 'activity.view', module: 'activity', action: 'view', description: 'View system-wide activity feeds and platform event stream' },
  { slug: 'notifications.view', module: 'notifications', action: 'view', description: 'View administrative alerts and system notifications' },

  // Customer Management
  { slug: 'customers.view', module: 'customers', action: 'view', description: 'View customer directory and basic investor profiles' },
  { slug: 'customers.view_sensitive', module: 'customers', action: 'view_sensitive', description: 'View unmasked customer personal financial data (PAN, full mobile)' },
  { slug: 'customers.update', module: 'customers', action: 'update', description: 'Update customer profiles, activate/deactivate investors' },
  { slug: 'onboarding.view', module: 'onboarding', action: 'view', description: 'View onboarding progression and registration funnel' },
  { slug: 'onboarding.update', module: 'onboarding', action: 'update', description: 'Advance or reset customer onboarding steps' },
  { slug: 'kyc.view', module: 'kyc', action: 'view', description: 'View KYC verification status, documents, and provider payloads' },
  { slug: 'kyc.review', module: 'kyc', action: 'review', description: 'Approve or reject manual KYC verification reviews' },
  { slug: 'bank_verification.view', module: 'bank_verification', action: 'view', description: 'View bank account verifications and penny drop status' },
  { slug: 'bank_verification.review', module: 'bank_verification', action: 'review', description: 'Manually review or approve bank accounts' },
  { slug: 'risk_profiles.view', module: 'risk_profiles', action: 'view', description: 'View investor risk assessment scores and risk categorization' },
  { slug: 'goals.view', module: 'goals', action: 'view', description: 'View customer financial goals, target amounts, and SIP schedules' },
  { slug: 'investment_accounts.view', module: 'investment_accounts', action: 'view', description: 'View investor mutual fund accounts and folios' },
  { slug: 'portfolio.view', module: 'portfolio', action: 'view', description: 'View customer portfolio holdings and asset distribution' },

  // Investment Operations
  { slug: 'transactions.view', module: 'transactions', action: 'view', description: 'View purchase orders and investment transactions' },
  { slug: 'transactions.export', module: 'transactions', action: 'export', description: 'Export transaction records to CSV/Excel' },
  { slug: 'sip.view', module: 'sip', action: 'view', description: 'View active SIPs, mandates, and recurring plans' },
  { slug: 'sip.manage', module: 'sip', action: 'manage', description: 'Pause, cancel, or re-trigger failed SIP installments' },
  { slug: 'order_status.view', module: 'order_status', action: 'view', description: 'View real-time order status and execution anomalies' },
  { slug: 'integrations.view', module: 'integrations', action: 'view', description: 'View provider integration health (Cybrilla, BSE, Resend, Interakt)' },
  { slug: 'integrations.manage', module: 'integrations', action: 'manage', description: 'Configure integration keys, test connections, and sync feeds' },

  // Support & Operations
  { slug: 'support.view', module: 'support', action: 'view', description: 'View support ticket inbox and customer inquiries' },
  { slug: 'support.create', module: 'support', action: 'create', description: 'Create internal tickets or log customer inquiries' },
  { slug: 'support.update', module: 'support', action: 'update', description: 'Reply to customer queries, update status, and add internal notes' },
  { slug: 'support.assign', module: 'support', action: 'assign', description: 'Assign tickets to technical agents and team members' },
  { slug: 'support.export', module: 'support', action: 'export', description: 'Export support metrics and inquiry logs' },
  { slug: 'issues.view', module: 'issues', action: 'view', description: 'View escalated customer issues and resolution bottlenecks' },
  { slug: 'tasks.view', module: 'tasks', action: 'view', description: 'View operational work queues and daily task lists' },
  { slug: 'tasks.update', module: 'tasks', action: 'update', description: 'Mark tasks in-progress, completed, or reassign' },

  // Reports & Compliance
  { slug: 'reports.view', module: 'reports', action: 'view', description: 'View business intelligence reports, AUM growth, and churn stats' },
  { slug: 'reports.export', module: 'reports', action: 'export', description: 'Export compliance reports, investor audits, and financial summaries' },
  { slug: 'compliance.view', module: 'compliance', action: 'view', description: 'View AML logs, regulatory disclosures, and SEBI compliance flags' },
  { slug: 'compliance.review', module: 'compliance', action: 'review', description: 'Perform compliance reviews, log escalations, and sign offs' },
  { slug: 'audit_logs.view', module: 'audit_logs', action: 'view', description: 'View immutable system audit logs and administrator activity' },
  { slug: 'audit_logs.export', module: 'audit_logs', action: 'export', description: 'Export audit logs for external auditors' },

  // Administration & RBAC
  { slug: 'team.view', module: 'team', action: 'view', description: 'View administrative team members, roles, and invitation status' },
  { slug: 'team.invite', module: 'team', action: 'invite', description: 'Invite new administrative team members with specified roles' },
  { slug: 'team.update', module: 'team', action: 'update', description: 'Change team member roles, department, and contact info' },
  { slug: 'team.suspend', module: 'team', action: 'suspend', description: 'Suspend or reactivate team members, revoke invitations' },
  { slug: 'roles.view', module: 'roles', action: 'view', description: 'View configured roles and permission matrices' },
  { slug: 'roles.create', module: 'roles', action: 'create', description: 'Create new custom roles and define permission bundles' },
  { slug: 'roles.update', module: 'roles', action: 'update', description: 'Modify custom role definitions and permission mappings' },
  { slug: 'roles.assign', module: 'roles', action: 'assign', description: 'Assign roles to staff members' },
  { slug: 'settings.view', module: 'settings', action: 'view', description: 'View system-wide settings, security policies, and integrations' },
  { slug: 'settings.update', module: 'settings', action: 'update', description: 'Update organization parameters, session limits, and notification rules' },
];

export const ROLE_PRESETS = [
  {
    name: 'SUPER_ADMIN',
    displayName: 'Super Administrator',
    description: 'Unrestricted full access across all platform modules, team management, security settings, and audit logs.',
    department: 'Executive / Tech',
    isSystem: true,
    permissions: PERMISSIONS_CATALOG.map((p) => p.slug),
  },
  {
    name: 'ADMIN',
    displayName: 'Operations Administrator',
    description: 'Broad administrative access to customer management, KYC, investments, support, and reports without security/secret management.',
    department: 'Management',
    isSystem: true,
    permissions: [
      'dashboard.view', 'activity.view', 'notifications.view',
      'customers.view', 'customers.update',
      'onboarding.view', 'onboarding.update',
      'kyc.view', 'kyc.review',
      'bank_verification.view', 'bank_verification.review',
      'risk_profiles.view', 'goals.view', 'investment_accounts.view', 'portfolio.view',
      'transactions.view', 'transactions.export', 'sip.view', 'order_status.view',
      'integrations.view',
      'support.view', 'support.create', 'support.update', 'support.assign', 'support.export',
      'issues.view', 'tasks.view', 'tasks.update',
      'reports.view', 'reports.export',
      'compliance.view', 'compliance.review',
      'audit_logs.view',
      'team.view', 'roles.view', 'settings.view',
    ],
  },
  {
    name: 'SUPPORT',
    displayName: 'Customer Support Specialist',
    description: 'Assigned to resolve customer queries, view masked customer profiles, manage tickets, and log internal notes.',
    department: 'Customer Support',
    isSystem: true,
    permissions: [
      'dashboard.view', 'notifications.view',
      'customers.view', // Masked PII
      'onboarding.view',
      'goals.view',
      'support.view', 'support.create', 'support.update', 'support.assign',
      'issues.view', 'tasks.view', 'tasks.update',
      'settings.view',
    ],
  },
  {
    name: 'OPERATIONS',
    displayName: 'Operations Officer',
    description: 'Responsible for KYC pipeline verification, onboarding assistance, bank verifications, and order exception resolution.',
    department: 'Operations',
    isSystem: true,
    permissions: [
      'dashboard.view', 'activity.view', 'notifications.view',
      'customers.view', 'customers.update',
      'onboarding.view', 'onboarding.update',
      'kyc.view', 'kyc.review',
      'bank_verification.view', 'bank_verification.review',
      'risk_profiles.view', 'goals.view', 'investment_accounts.view', 'portfolio.view',
      'transactions.view', 'sip.view', 'sip.manage', 'order_status.view',
      'integrations.view',
      'support.view', 'support.update',
      'tasks.view', 'tasks.update',
      'settings.view',
    ],
  },
  {
    name: 'FINANCE',
    displayName: 'Finance & Accounts',
    description: 'Manages transactions, payment mandates, SIP reconciliation, financial statements, and fee accounting.',
    department: 'Finance',
    isSystem: true,
    permissions: [
      'dashboard.view', 'notifications.view',
      'customers.view',
      'investment_accounts.view', 'portfolio.view',
      'transactions.view', 'transactions.export',
      'sip.view', 'order_status.view',
      'reports.view', 'reports.export',
      'audit_logs.view',
      'settings.view',
    ],
  },
  {
    name: 'COMPLIANCE',
    displayName: 'Compliance & AML Officer',
    description: 'Oversees SEBI regulatory adherence, AML risk checks, KYC audits, and investor disclosure tracking.',
    department: 'Legal & Compliance',
    isSystem: true,
    permissions: [
      'dashboard.view', 'activity.view', 'notifications.view',
      'customers.view', 'customers.view_sensitive',
      'kyc.view', 'kyc.review',
      'bank_verification.view', 'bank_verification.review',
      'risk_profiles.view', 'goals.view',
      'transactions.view',
      'compliance.view', 'compliance.review',
      'audit_logs.view', 'audit_logs.export',
      'reports.view', 'reports.export',
      'settings.view',
    ],
  },
  {
    name: 'ANALYST',
    displayName: 'Business Analyst',
    description: 'Read-only statistical access to platform metrics, cohort analytics, and fund performance trends.',
    department: 'Analytics',
    isSystem: true,
    permissions: [
      'dashboard.view', 'activity.view', 'notifications.view',
      'customers.view',
      'risk_profiles.view', 'goals.view', 'portfolio.view',
      'transactions.view', 'sip.view',
      'reports.view',
    ],
  },
];

@Injectable()
export class AdminBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AdminBootstrapService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onApplicationBootstrap() {
    try {
      this.logger.log('Starting TechArtha Admin RBAC & System Initialization...');
      await this.seedPermissions();
      await this.seedRoles();
      await this.seedInitialAdminUsers();
      await this.seedSystemSettings();
      await this.syncTechnicalAgents();
      this.logger.log('TechArtha Admin RBAC & System Initialization completed successfully.');
    } catch (err: any) {
      this.logger.error(`Failed to bootstrap Admin RBAC: ${err.message}`, err.stack);
    }
  }

  /**
   * Upsert all granular permissions
   */
  private async seedPermissions() {
    for (const p of PERMISSIONS_CATALOG) {
      await this.prisma.adminPermission.upsert({
        where: { slug: p.slug },
        update: {
          module: p.module,
          action: p.action,
          description: p.description,
        },
        create: {
          slug: p.slug,
          module: p.module,
          action: p.action,
          description: p.description,
        },
      });
    }
    this.logger.log(`Permissions catalog verified: ${PERMISSIONS_CATALOG.length} permissions active.`);
  }

  /**
   * Upsert system roles and map role permissions
   */
  private async seedRoles() {
    const allPermissions = await this.prisma.adminPermission.findMany();
    const permMap = new Map(allPermissions.map((p) => [p.slug, p.id]));

    for (const roleDef of ROLE_PRESETS) {
      const role = await this.prisma.adminRole.upsert({
        where: { name: roleDef.name },
        update: {
          displayName: roleDef.displayName,
          description: roleDef.description,
          department: roleDef.department,
          isSystem: roleDef.isSystem,
          status: 'ACTIVE',
        },
        create: {
          name: roleDef.name,
          displayName: roleDef.displayName,
          description: roleDef.description,
          department: roleDef.department,
          isSystem: roleDef.isSystem,
          status: 'ACTIVE',
        },
      });

      // Map role permissions
      for (const slug of roleDef.permissions) {
        const permId = permMap.get(slug);
        if (permId) {
          await this.prisma.adminRolePermission.upsert({
            where: {
              roleId_permissionId: {
                roleId: role.id,
                permissionId: permId,
              },
            },
            update: {},
            create: {
              roleId: role.id,
              permissionId: permId,
            },
          });
        }
      }
    }
    this.logger.log(`Standard system roles verified: ${ROLE_PRESETS.length} roles initialized.`);
  }

  /**
   * Seed standard administrator accounts into database with secure PBKDF2 hashes
   */
  private async seedInitialAdminUsers() {
    const defaultPass = (process.env.ADMIN_PASSWORD || 'TechArtha@2026!').trim();
    const passwordHash = AdminSecurity.hashPassword(defaultPass);

    const initialUsers = [
      {
        email: (process.env.ADMIN_EMAIL || 'support@techartha.com').trim().toLowerCase(),
        name: 'TechArtha Super Admin',
        role: 'SUPER_ADMIN',
        department: 'Executive / Tech',
      },
      {
        email: 'admin@techartha.com',
        name: 'Platform Super Admin',
        role: 'SUPER_ADMIN',
        department: 'Executive / Tech',
      },
      {
        email: 'ops@techartha.com',
        name: 'Operations Lead',
        role: 'OPERATIONS',
        department: 'Operations',
      },
      {
        email: 'analyst@techartha.com',
        name: 'Compliance Analyst',
        role: 'ANALYST',
        department: 'Analytics',
      },
    ];

    for (const u of initialUsers) {
      const role = await this.prisma.adminRole.findUnique({ where: { name: u.role } });

      await this.prisma.adminUser.upsert({
        where: { email: u.email },
        update: {
          name: u.name,
          role: u.role,
          roleId: role?.id ?? null,
          department: u.department,
          status: 'ACTIVE',
          isActive: true,
        },
        create: {
          email: u.email,
          name: u.name,
          passwordHash,
          role: u.role,
          roleId: role?.id ?? null,
          department: u.department,
          status: 'ACTIVE',
          isActive: true,
        },
      });
    }
  }

  /**
   * Sync existing TechnicalAgent rows into AdminUser as SUPPORT staff
   */
  private async syncTechnicalAgents() {
    try {
      const agents = await this.prisma.technicalAgent.findMany();
      const supportRole = await this.prisma.adminRole.findUnique({ where: { name: 'SUPPORT' } });
      const defaultPass = (process.env.ADMIN_PASSWORD || 'TechArtha@2026!').trim();
      const defaultHash = AdminSecurity.hashPassword(defaultPass);

      for (const agent of agents) {
        await this.prisma.adminUser.upsert({
          where: { email: agent.email.toLowerCase() },
          update: {
            name: agent.fullName,
            department: agent.department || 'Technical Support',
            isActive: agent.isActive,
            status: agent.isActive ? 'ACTIVE' : 'SUSPENDED',
          },
          create: {
            email: agent.email.toLowerCase(),
            name: agent.fullName,
            passwordHash: defaultHash,
            role: 'SUPPORT',
            roleId: supportRole?.id ?? null,
            department: agent.department || 'Technical Support',
            status: agent.isActive ? 'ACTIVE' : 'SUSPENDED',
            isActive: agent.isActive,
          },
        });
      }
    } catch (e: any) {
      this.logger.warn(`Could not sync TechnicalAgents: ${e.message}`);
    }
  }

  /**
   * Seed default system settings
   */
  private async seedSystemSettings() {
    const defaultSettings: Array<{ category: string; key: string; value: any; description: string }> = [
      {
        category: 'general',
        key: 'platform_general',
        value: {
          platformName: 'TechArtha',
          organizationName: 'TechArtha Technologies Private Limited',
          supportEmail: 'support@techartha.com',
          supportPhone: '+91 83088 16023',
          defaultLanguage: 'en',
          supportedLanguages: ['en', 'hi', 'mr'],
          timezone: 'Asia/Kolkata',
          dateFormat: 'DD/MM/YYYY',
          currency: 'INR',
          defaultPageSize: 15,
        },
        description: 'Global organization name, supported vernacular languages, and localization formats',
      },
      {
        category: 'security',
        key: 'platform_security',
        value: {
          sessionTimeoutMinutes: 480,
          maxLoginAttempts: 5,
          passwordMinLength: 8,
          requireSpecialChar: true,
          requireNumbers: true,
          mfaPolicy: 'OPTIONAL',
          invitationExpiryHours: 24,
          restrictAdminIp: false,
        },
        description: 'Session lifetimes, password complexity, brute-force policies, and invitation token validity',
      },
      {
        category: 'notifications',
        key: 'platform_notifications',
        value: {
          emailNotificationsEnabled: true,
          notifyOnNewTickets: true,
          notifyOnKycEscalations: true,
          notifyOnSecurityAlerts: true,
          primaryAlertEmail: 'support@techartha.com',
          slackWebhookUrl: null,
        },
        description: 'Administrative notification thresholds, email alerts, and webhook triggers',
      },
      {
        category: 'integrations',
        key: 'platform_integrations',
        value: {
          resend: {
            name: 'Resend Email Service',
            configured: !!(process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.includes('<')),
            sender: process.env.RESEND_FROM || 'support@techartha.com',
          },
          interakt: {
            name: 'Interakt WhatsApp OTP',
            configured: !!(process.env.INTERAKT_API_KEY && !process.env.INTERAKT_API_KEY.includes('<')),
          },
          cybrilla: {
            name: 'Cybrilla / Fintech Primitives',
            configured: true,
            environment: 'Sandbox / UAT',
          },
          bse: {
            name: 'BSE StAR MF Common API',
            configured: !!(process.env.BSE_API_KEY && !process.env.BSE_API_KEY.includes('<')),
            environment: 'UAT',
          },
        },
        description: 'External service integration connectivity statuses and credential flags',
      },
      {
        category: 'audit',
        key: 'platform_audit',
        value: {
          retentionDays: 365,
          logSensitiveDataAccess: true,
          exportAllowedRoles: ['SUPER_ADMIN', 'COMPLIANCE'],
        },
        description: 'Audit log retention policies and sensitive personal data inspection records',
      },
      {
        category: 'privacy',
        key: 'platform_privacy',
        value: {
          maskCustomerPiiByDefault: true,
          maskPiiFields: ['pan', 'mobile', 'bankAccount', 'aadhaar'],
          gdprConsentEnabled: true,
        },
        description: 'PII masking parameters and investor consent enforcement',
      },
    ];

    for (const s of defaultSettings) {
      await this.prisma.systemSetting.upsert({
        where: { key: s.key },
        update: {
          category: s.category,
          description: s.description,
        },
        create: {
          category: s.category,
          key: s.key,
          value: s.value,
          description: s.description,
        },
      });
    }
  }
}
