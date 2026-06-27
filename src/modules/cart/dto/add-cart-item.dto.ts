import { ApiProperty } from '@nestjs/swagger';

export class AddCartItemDto {
  @ApiProperty({ description: 'The listing (seller offer) being added' })
  listingId: string;

  @ApiProperty({ example: 2, default: 1, description: 'Units to add (1-100)' })
  quantity: number;
}