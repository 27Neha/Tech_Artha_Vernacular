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

export type AdminRole = 'SUPER_ADMIN' | 'OPERATIONS' | 'SUPPORT' | 'ANALYST';

export class AdminUser {
  id!: string;
  email!: string;
  name!: string;
  role!: AdminRole;
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

    const adminUser: AdminUser = {
      id: payload.sub,
      email: payload.email,
      name: payload.name ?? 'Staff User',
      role: (payload.role as AdminRole) ?? 'OPERATIONS',
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
      throw new ForbiddenException(`Insufficient permissions for role ${adminUser.role}. Required: ${requiredRoles.join(', ')}`);
    }

    return true;
  }
}
