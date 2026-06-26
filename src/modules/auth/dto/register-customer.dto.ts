import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for POST /auth/register-customer.
 * The user submits ALL the data needed to create their account
 * PLUS the OTP code that proves they own the email.
 */
export class RegisterCustomerDto {
  @ApiProperty({ example: 'john@example.com' })
  email: string;

  @ApiProperty({
    example: '482915',
    description: '6-digit code from the email',
  })
  otp: string;

  @ApiProperty({ example: 'Secret@123', minLength: 6 })
  password: string;

  @ApiProperty({ example: 'John' })
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  lastName: string;
}
