import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedUser } from '../interfaces';
import { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';

/**
 * Inject the authenticated user (or one of its fields) into a handler.
 * Usage: @CurrentUser() user | @CurrentUser('userId') userId
 */
export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return data ? req.user?.[data] : req.user;
  },
);
