import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSellerDto {
  @ApiPropertyOptional({ example: 'BookHub Traders' })
  businessName?: string;

  @ApiPropertyOptional({ example: 'Rajan Thakur' })
  contactPerson?: string;

  @ApiPropertyOptional({ example: '8580432871' })
  mobile?: string;
}
