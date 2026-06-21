import { ApiProperty } from '@nestjs/swagger';

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
