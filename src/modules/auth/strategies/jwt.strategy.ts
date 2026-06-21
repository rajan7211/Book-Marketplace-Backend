import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthenticatedUser, JwtPayload } from '../../../common/interfaces';
import { MESSAGES } from '../../../common/constants';

/** Validates the ACCESS token. Result is attached to req.user. */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('jwt.accessSecret')!,
    });
  }

  validate(payload: JwtPayload): AuthenticatedUser {
    if (!payload?.sub) {
      throw new UnauthorizedException(MESSAGES.AUTH.INVALID_TOKEN);
    }
    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      customerId: payload.customerId,
      sellerId: payload.sellerId,
    };
  }
}
