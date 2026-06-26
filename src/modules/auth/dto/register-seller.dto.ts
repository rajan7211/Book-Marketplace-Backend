import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for POST /auth/register-seller.
 * Different shape from customer register — no firstName/lastName,
 * but adds businessName/contactPerson/mobile.
 */
export class RegisterSellerDto {
  @ApiProperty({ example: 'BookHub Traders' })
  businessName: string;

  @ApiProperty({ example: 'Amit Sharma' })
  contactPerson: string;

  @ApiProperty({ example: 'seller@bookhub.com' })
  email: string;

  @ApiProperty({ example: '9876543210' })
  mobile: string;

  @ApiProperty({ example: 'Secret@123', minLength: 6 })
  password: string;
}
