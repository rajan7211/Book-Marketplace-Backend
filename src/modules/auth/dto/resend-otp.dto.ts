import { ApiProperty } from '@nestjs/swagger';
import { OtpPurpose } from '../enums/otp-purpose.enum';

/**
 * DTO for POST /auth/resend-otp.
 * Same shape as SendOtpDto but kept separate so Swagger shows it
 * as a distinct endpoint with a distinct description.
 */
export class ResendOtpDto {
  @ApiProperty({ example: 'rajan@example.com' })
  email: string;

  @ApiProperty({
    enum: OtpPurpose,
    example: OtpPurpose.REGISTRATION,
  })
  purpose: OtpPurpose;
}
