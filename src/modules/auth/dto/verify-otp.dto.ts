import { ApiProperty } from '@nestjs/swagger';
import { OtpPurpose } from '../enums/otp-purpose.enum';

/**
 * DTO for POST /auth/verify-otp.
 * Includes the user-entered OTP code.
 */
export class VerifyOtpDto {
  @ApiProperty({ example: 'rajan@example.com' })
  email: string;

  @ApiProperty({
    enum: OtpPurpose,
    example: OtpPurpose.REGISTRATION,
  })
  purpose: OtpPurpose;

  @ApiProperty({
    example: '482915',
    description: 'The 6-digit code from the email',
  })
  otp: string;
}
