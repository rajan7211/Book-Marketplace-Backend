import { ApiProperty } from '@nestjs/swagger';
export class AddCartItemDto {
  @ApiProperty({ description: 'The listing (seller offer) being added', example: '665f1b2c...' })
  listingId: string;

  @ApiProperty({ description: 'How many units to add', example: 1, default: 1 })
  quantity: number;
}
