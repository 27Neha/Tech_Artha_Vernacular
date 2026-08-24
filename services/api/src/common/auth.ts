import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export type AuthenticatedUser = { id: string; mobile: string; sessionId: string };

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => context.switchToHttp().getRequest().user,
);

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ headers: Record<string, string | undefined>; user?: AuthenticatedUser }>();
    const authorization = request.headers.authorization;
    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('A valid access token is required.');
    }

    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; mobile: string; sid: string }>(authorization.slice(7));
      if (!payload.sub || !payload.mobile || !payload.sid) throw new Error('Incomplete token');
      request.user = { id: payload.sub, mobile: payload.mobile, sessionId: payload.sid };
      return true;
    } catch {
      throw new UnauthorizedException('Your session is invalid or has expired. Please sign in again.');
    }
  }
}
