import { Injectable, UnauthorizedException, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthMessages } from '../../common/constants/auth-messages.constant';
import { Role } from '../../common/enums/role.enum';
import { BcryptUtil } from '../../common/utils/bcrypt.util';
import { TokenPayload, AuthResponse, JwtPayload } from '../../common/interfaces/auth.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    try {
      const allowedRoles = [Role.CUSTOMER, Role.SELLER];
      const requestedRole = registerDto.role || Role.CUSTOMER;
      if (!allowedRoles.includes(requestedRole)) {
        throw new BadRequestException('Invalid role for registration. Only CUSTOMER or SELLER are allowed.');
      }

      const newUser = await this.usersService.create({
        email: registerDto.email.toLowerCase(),
        password: registerDto.password,
        role: requestedRole,
      });

      const tokens: TokenPayload = await this.generateTokens(newUser.id, newUser.email, newUser.role);
      await this.usersService.updateRefreshToken(newUser.id, tokens.refreshToken);

      return {
        userId: newUser.id,
        email: newUser.email,
        role: newUser.role,
        name: `${registerDto.firstName} ${registerDto.lastName}`,
        ...tokens,
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw new ConflictException(AuthMessages.EMAIL_EXISTS);
      }
      throw error;
    }
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    let user;
    try {
      user = await this.usersService.findByEmailWithPassword(loginDto.email);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new UnauthorizedException(AuthMessages.INVALID_CREDENTIALS);
      }
      throw error;
    }

    const isPasswordValid = await BcryptUtil.comparePassword(
      loginDto.password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException(AuthMessages.INVALID_CREDENTIALS);
    }

    const tokens: TokenPayload = await this.generateTokens(user.id, user.email, user.role);
    await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async refreshTokens(refreshToken: string): Promise<TokenPayload> {
    try {
      if (!refreshToken) {
        throw new BadRequestException(AuthMessages.INVALID_TOKEN);
      }

      const secret = this.configService.get<string>('jwt.secret') || 'default-secret';
      let payload: JwtPayload;
      try {
        payload = this.jwtService.verify(refreshToken, { secret }) as JwtPayload;
      } catch {
        throw new UnauthorizedException(AuthMessages.TOKEN_EXPIRED);
      }

      const user = await this.usersService.findByEmailWithToken(payload.email);
      if (!user || user.refreshToken !== refreshToken) {
        throw new UnauthorizedException(AuthMessages.INVALID_TOKEN);
      }

      const tokens: TokenPayload = await this.generateTokens(user.id, user.email, user.role);
      await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);

      return tokens;
    } catch (error) {
      throw error;
    }
  }

  async logout(userId: string): Promise<void> {
    try {
      await this.usersService.updateRefreshToken(userId, null);
    } catch (error) {
      throw error;
    }
  }

  private async generateTokens(userId: string, email: string, role: string): Promise<TokenPayload> {
    try {
      const accessTokenPayload: JwtPayload = { sub: userId, email, role, type: 'access' };
      const refreshTokenPayload: JwtPayload = { sub: userId, email, role, type: 'refresh' };

      const accessExpiration = this.configService.get<string>('jwt.accessExpiration') || '15m';
      const refreshExpiration = this.configService.get<string>('jwt.refreshExpiration') || '7d';
      const secret = this.configService.get<string>('jwt.secret') || 'default-secret';

      const accessToken = this.jwtService.sign(accessTokenPayload, {
        secret,
        expiresIn: accessExpiration,
      });

      const refreshToken = this.jwtService.sign(refreshTokenPayload, {
        secret,
        expiresIn: refreshExpiration,
      });

      return { accessToken, refreshToken };
    } catch (error) {
      throw error;
    }
  }
}
