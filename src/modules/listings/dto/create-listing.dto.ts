import { ApiProperty } from '@nestjs/swagger';

export class CreateListingDto {
  @ApiProperty({ description: 'The book ID (must be APPROVED)', example: '65f1b2c...' })
  bookId: string;

  @ApiProperty({ example: 399, description: 'Selling price (must be > 0 and <= mrp)' })
  price: number;

  @ApiProperty({ example: 599, description: 'Printed MRP (Maximum Retail Price)' })
  mrp: number;

  @ApiProperty({ example: 10, default: 0, description: 'Units in stock (>= 0)' })
  stock?: number;
}