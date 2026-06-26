import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OtpPurpose } from '../enums/otp-purpose.enum';

/**
 * DTO for POST /auth/send-otp.
 *
 * The 3 registration fields are OPTIONAL — they're required only when
 * purpose === REGISTRATION. Joi enforces this conditionally.
 */
export class SendOtpDto {
  @ApiProperty({ example: 'rajan@example.com' })
  email: string;

  @ApiProperty({
    enum: OtpPurpose,
    example: OtpPurpose.REGISTRATION,
    description:
      'REGISTRATION: requires firstName/lastName/password. PASSWORD_RESET: just email.',
  })
  purpose: OtpPurpose;

  @ApiPropertyOptional({ example: 'John', description: 'Required when purpose=REGISTRATION' })
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe', description: 'Required when purpose=REGISTRATION' })
  lastName?: string;

  @ApiPropertyOptional({ example: 'Secret@123', description: 'Required when purpose=REGISTRATION' })
  password?: string;
}
