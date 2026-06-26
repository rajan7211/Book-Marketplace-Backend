import {
  Body, Controller, Get, HttpCode, HttpStatus, Patch, Post, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { RefreshPayload } from './strategies/jwt-refresh.strategy';
import {
  SendOtpDto, VerifyOtpDto, ResendOtpDto, LoginDto, RefreshTokenDto,
  ForgotPasswordDto, ResetPasswordDto, ChangePasswordDto,
  RegisterSellerDto,
} from './dto';
import {
  registerSchema, registerSellerSchema, verifyOtpSchema, resendOtpSchema,
  loginSchema, refreshTokenSchema, forgotPasswordSchema,
  resetPasswordSchema, changePasswordSchema,
} from './validation/auth.validation';
import { JoiValidationPipe } from '../../common/pipes';
import { Public, CurrentUser } from '../../common/decorators';
import { ResponseMessage } from '../../common/interceptors';
import { JwtAuthGuard } from '../../common/guards';
import { MESSAGES } from '../../common/constants';
import { AuthenticatedUser } from '../../common/interfaces';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly otpService: OtpService,
  ) {}

  // ───── Registration (customer + seller) ─────

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start CUSTOMER registration (sends OTP)' })
  @ResponseMessage('Verification code sent. Please check your email.')
  async register(
    @Body(new JoiValidationPipe(registerSchema)) dto: SendOtpDto,
  ): Promise<null> {
    await this.auth.initiateRegistration(dto);
    return null;
  }

  @Public()
  @Post('register-seller')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Start SELLER registration (sends OTP). Account starts PENDING_APPROVAL.',
  })
  @ResponseMessage('Verification code sent. Your seller account will be activated after admin approval.')
  async registerSeller(
    @Body(new JoiValidationPipe(registerSellerSchema)) dto: RegisterSellerDto,
  ): Promise<null> {
    await this.auth.initiateSellerRegistration(dto);
    return null;
  }

  @Public()
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify the OTP. Creates a customer OR seller based on stored data.',
  })
  @ResponseMessage(MESSAGES.AUTH.REGISTERED)
  async verifyOtp(
    @Body(new JoiValidationPipe(verifyOtpSchema)) dto: VerifyOtpDto,
  ): Promise<unknown> {
    return this.auth.verifyAndRegister(dto.email, dto.purpose, dto.otp);
  }

  @Public()
  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend the verification code (60s cooldown)' })
  @ResponseMessage('Verification code resent. Please check your email.')
  async resendOtp(
    @Body(new JoiValidationPipe(resendOtpSchema)) dto: ResendOtpDto,
  ): Promise<null> {
    await this.otpService.sendOtp(dto.email, dto.purpose);
    return null;
  }

  // ───── Login / Refresh / Logout ─────

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
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke the current refresh token' })
  @ResponseMessage(MESSAGES.AUTH.LOGGED_OUT)
  async logout(@CurrentUser('userId') userId: string): Promise<null> {
    await this.auth.logout(userId);
    return null;
  }

  // ───── Me ─────

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOperation({ summary: 'Current authenticated identity' })
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.auth.getMe(user.userId);
  }

  // ───── Password recovery ─────

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a password-reset OTP' })
  @ResponseMessage('If that email exists, a reset code has been sent.')
  async forgotPassword(
    @Body(new JoiValidationPipe(forgotPasswordSchema)) dto: ForgotPasswordDto,
  ): Promise<null> {
    await this.auth.forgotPassword(dto.email);
    return null;
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify the reset OTP and set a new password' })
  @ResponseMessage('Password reset successfully. Please log in again.')
  async resetPassword(
    @Body(new JoiValidationPipe(resetPasswordSchema)) dto: ResetPasswordDto,
  ): Promise<null> {
    await this.auth.resetPassword(dto);
    return null;
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change the current password' })
  @ResponseMessage('Password changed successfully. Please log in again.')
  async changePassword(
    @CurrentUser('userId') userId: string,
    @Body(new JoiValidationPipe(changePasswordSchema)) dto: ChangePasswordDto,
  ): Promise<null> {
    await this.auth.changePassword(userId, dto);
    return null;
  }
}
