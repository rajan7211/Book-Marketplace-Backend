import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { JwtPayload } from '../../../common/interfaces';
import { MESSAGES } from '../../../common/constants';

export interface RefreshPayload extends JwtPayload {
  refreshToken: string;
}

/**
 * Validates the REFRESH token from the request body and forwards the raw
 * token so AuthService can compare it against the stored bcrypt hash (rotation).
 */
@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('jwt.refreshSecret')!,
      passReqToCallback: true,
    });
  }

  validate(req: Request, payload: JwtPayload): RefreshPayload {
    const refreshToken = (req.body as { refreshToken?: string })?.refreshToken;
    if (!refreshToken || !payload?.sub) {
      throw new UnauthorizedException(MESSAGES.AUTH.INVALID_TOKEN);
    }
    return { ...payload, refreshToken };
  }
}
