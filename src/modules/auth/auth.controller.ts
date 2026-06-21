import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { RefreshPayload } from './strategies/jwt-refresh.strategy';
import {
  LoginDto,
  RefreshTokenDto,
  RegisterCustomerDto,
  RegisterSellerDto,
} from './dto';
import {
  loginSchema,
  refreshTokenSchema,
  registerCustomerSchema,
  registerSellerSchema,
} from './validation/auth.validation';
import { JoiValidationPipe } from '../../common/pipes';
import { Public, CurrentUser } from '../../common/decorators';
import { ResponseMessage } from '../../common/interceptors/response.interceptor';
import { MESSAGES } from '../../common/constants';
import { AuthenticatedUser } from '../../common/interfaces';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a customer' })
  @ResponseMessage(MESSAGES.AUTH.REGISTERED)
  register(@Body(new JoiValidationPipe(registerCustomerSchema)) dto: RegisterCustomerDto) {
    return this.auth.registerCustomer(dto);
  }

  @Public()
  @Post('register/seller')
  @ApiOperation({ summary: 'Register a seller (pending admin approval)' })
  @ResponseMessage(MESSAGES.AUTH.REGISTERED)
  registerSeller(@Body(new JoiValidationPipe(registerSellerSchema)) dto: RegisterSellerDto) {
    return this.auth.registerSeller(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email + password' })
  @ResponseMessage(MESSAGES.AUTH.LOGGED_IN)
  login(@Body(new JoiValidationPipe(loginSchema)) dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Public()
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate tokens using a valid refresh token' })
  @ResponseMessage(MESSAGES.AUTH.TOKEN_REFRESHED)
  refresh(
    @Body(new JoiValidationPipe(refreshTokenSchema)) _dto: RefreshTokenDto,
    @CurrentUser() user: RefreshPayload,
  ) {
    return this.auth.refresh(user.sub, user.refreshToken);
  }

  @ApiBearerAuth()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke the current refresh token' })
  @ResponseMessage(MESSAGES.AUTH.LOGGED_OUT)
  async logout(@CurrentUser('userId') userId: string) {
    await this.auth.logout(userId);
    return null;
  }

  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Current authenticated identity' })
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.auth.getMe(user.userId);
  }

  @Public()
  @Get('check-email')
  @ApiOperation({ summary: 'Check whether an email is already registered' })
  checkEmail(@Query('email') email: string) {
    return this.auth.checkEmail(email ?? '');
  }
}
