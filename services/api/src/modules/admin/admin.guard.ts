import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  ForbiddenException,
  createParamDecorator,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';

export type AdminRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'SUPPORT'
  | 'OPERATIONS'
  | 'FINANCE'
  | 'COMPLIANCE'
  | 'ANALYST'
  | string;

export class AdminUser {
  id!: string;
  email!: string;
  name!: string;
  role!: AdminRole;
  department?: string;
  permissions!: string[];
  canViewSensitivePii!: boolean;
  isAdmin!: boolean;
}

export const ADMIN_ROLES_KEY = 'admin_roles';
export const AdminRoles = (...roles: AdminRole[]) => SetMetadata(ADMIN_ROLES_KEY, roles);

export const ADMIN_PERMISSIONS_KEY = 'admin_permissions';
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(ADMIN_PERMISSIONS_KEY, permissions);

export const CurrentAdmin = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AdminUser => {
    const req = context.switchToHttp().getRequest();
    return req.adminUser;
  },
);

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Admin authorization token is required.');
    }

    const token = authHeader.slice(7);
    let payload: any;
    try {
      payload = await this.jwt.verifyAsync(token, {
        secret: process.env.JWT_SECRET ?? 'development-only-change-me',
      });
    } catch {
      throw new UnauthorizedException('Admin session is invalid or has expired.');
    }

    if (!payload || !payload.isAdmin) {
      throw new ForbiddenException('Access restricted to authorized TechArtha administration personnel.');
    }

    const userEmail = (payload.email || '').toLowerCase();

    // Revalidate live account status from database
    const dbAdmin = await this.prisma.adminUser.findUnique({
      where: { email: userEmail },
      include: {
        assignedRole: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    }).catch(() => null);

    // If account was marked SUSPENDED, DEACTIVATED, or isActive=false, block immediately
    if (dbAdmin && (!dbAdmin.isActive || dbAdmin.status === 'SUSPENDED' || dbAdmin.status === 'DEACTIVATED')) {
      throw new UnauthorizedException('Your administrator account has been suspended or deactivated.');
    }

    // Determine effective role and permissions
    const effectiveRole = dbAdmin?.role || payload.role || 'OPERATIONS';
    const isSuperAdmin = effectiveRole === 'SUPER_ADMIN';

    let permissions: string[] = [];
    if (isSuperAdmin) {
      permissions = ['*']; // Super Admin possesses all privileges
    } else if (dbAdmin?.assignedRole?.permissions) {
      permissions = dbAdmin.assignedRole.permissions.map((rp) => rp.permission.slug);
    } else {
      // Fallback to token permissions if available
      permissions = payload.permissions || [];
    }

    const canViewSensitivePii = isSuperAdmin || permissions.includes('customers.view_sensitive');

    const adminUser: AdminUser = {
      id: dbAdmin?.id || payload.sub,
      email: userEmail,
      name: dbAdmin?.name || payload.name || 'Staff User',
      role: effectiveRole,
      department: dbAdmin?.department || 'Operations',
      permissions,
      canViewSensitivePii,
      isAdmin: true,
    };

    request.adminUser = adminUser;

    // Check Role constraints if any
    const requiredRoles = this.reflector.getAllAndOverride<AdminRole[]>(ADMIN_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (requiredRoles && requiredRoles.length > 0 && !isSuperAdmin) {
      const hasRole = requiredRoles.includes(adminUser.role);
      if (!hasRole) {
        throw new ForbiddenException(
          `Insufficient role authority (${adminUser.role}). Required: ${requiredRoles.join(', ')}`,
        );
      }
    }

    // Check Granular Permissions constraints if any
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(ADMIN_PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (requiredPermissions && requiredPermissions.length > 0 && !isSuperAdmin) {
      const missing = requiredPermissions.filter((rp) => !permissions.includes(rp));
      if (missing.length > 0) {
        throw new ForbiddenException(
          `Access Denied: Missing required permission(s): ${missing.join(', ')}`,
        );
      }
    }

    return true;
  }
}
