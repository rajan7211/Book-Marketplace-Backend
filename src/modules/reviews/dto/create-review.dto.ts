import { ApiProperty } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiProperty({ example: 5, minimum: 1, maximum: 5, description: 'Rating from 1 to 5 stars' })
  rating: number;

  @ApiProperty({ example: 'Amazing book, loved every chapter!' })
  comment: string;
}