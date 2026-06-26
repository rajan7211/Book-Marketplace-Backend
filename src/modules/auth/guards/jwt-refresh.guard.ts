import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Wraps the 'jwt-refresh' passport strategy.
 * Reads the refresh token from req.body.refreshToken, verifies signature,
 * and puts the payload on req.user.
 */
@Injectable()
export class JwtRefreshGuard extends AuthGuard('jwt-refresh') {}
