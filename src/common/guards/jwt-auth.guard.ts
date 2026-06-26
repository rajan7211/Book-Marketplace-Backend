import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { MESSAGES } from '../constants';

/**
 * Global JWT authentication guard.
 *
 * Reads @Public() metadata. If set, skip JWT verification entirely.
 * Otherwise, run passport's 'jwt' strategy (which validates the token).
 *
 * Wired globally via main.ts: app.useGlobalGuards(new JwtAuthGuard(...))
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }

  // Called by passport when verification fails or returns no user.
  handleRequest<TUser>(err: unknown, user: TUser): TUser {
    if (err || !user) {
      throw new UnauthorizedException(MESSAGES.COMMON.UNAUTHORIZED);
    }
    return user;
  }
}
