import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  ForbiddenException,
  createParamDecorator,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';

export type AdminRole = 'SUPER_ADMIN' | 'OPERATIONS' | 'COMPLIANCE' | 'FINANCE' | 'SUPPORT' | 'ANALYST';

export class AdminUser {
  id!: string;
  email!: string;
  name!: string;
  role!: AdminRole;
  position?: string;
  permissions?: string[];
  isAdmin!: boolean;
}

export const ADMIN_ROLES_KEY = 'admin_roles';
export const AdminRoles = (...roles: AdminRole[]) => SetMetadata(ADMIN_ROLES_KEY, roles);

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

    if (!payload || !payload.isAdmin || !payload.sub) {
      throw new ForbiddenException('Access restricted to authorized TechArtha administration personnel.');
    }

    // Server-side allowlist verification against the database
    let members: any[] = [];
    try {
      members = await this.prisma.$queryRawUnsafe<any[]>(
        `SELECT id, email, name, role, position, status, "sessionVersion", permissions FROM "AdminMember" WHERE id = $1 LIMIT 1`,
        payload.sub,
      );
    } catch (dbErr: any) {
      // If table query fails, don't allow bypass
      throw new UnauthorizedException('Unable to verify administrator authorization.');
    }

    if (!members || members.length === 0) {
      throw new ForbiddenException('Administrator account not found in authorized directory.');
    }

    const member = members[0];

    // Check account status (ACTIVE vs DEACTIVATED vs INVITED)
    if (member.status !== 'ACTIVE') {
      throw new ForbiddenException(`Administrator account is ${member.status?.toLowerCase() || 'inactive'}. Access denied.`);
    }

    // Verify sessionVersion for immediate token revocation upon deactivation or password change
    if (
      payload.sessionVersion !== undefined &&
      member.sessionVersion !== undefined &&
      Number(payload.sessionVersion) !== Number(member.sessionVersion)
    ) {
      throw new UnauthorizedException('Admin session has been revoked. Please sign in again.');
    }

    let permissions: string[] = [];
    try {
      if (typeof member.permissions === 'string') {
        permissions = JSON.parse(member.permissions);
      } else if (Array.isArray(member.permissions)) {
        permissions = member.permissions;
      }
    } catch {
      permissions = [];
    }

    const adminUser: AdminUser = {
      id: member.id,
      email: member.email,
      name: member.name || 'Staff User',
      role: (member.role as AdminRole) || 'OPERATIONS',
      position: member.position,
      permissions,
      isAdmin: true,
    };

    request.adminUser = adminUser;

    const requiredRoles = this.reflector.getAllAndOverride<AdminRole[]>(ADMIN_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // SUPER_ADMIN has access to everything
    if (adminUser.role === 'SUPER_ADMIN') {
      return true;
    }

    const hasRole = requiredRoles.includes(adminUser.role);
    if (!hasRole) {
      throw new ForbiddenException(
        `Insufficient permissions for role ${adminUser.role}. Required: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}

