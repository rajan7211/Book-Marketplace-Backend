import { ApiProperty } from '@nestjs/swagger';

/**
 * Body for POST /auth/reset-password.
 * Re-verifies the OTP at reset time (defense against replay between verify and reset).
 */
export class ResetPasswordDto {
  @ApiProperty({ example: 'john@example.com' })
  email: string;

  @ApiProperty({ example: '482915', description: '6-digit code from the email' })
  otp: string;

  @ApiProperty({ example: 'NewSecret@456', minLength: 6 })
  newPassword: string;
}
