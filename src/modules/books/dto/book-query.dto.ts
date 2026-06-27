import { ApiPropertyOptional } from '@nestjs/swagger';

export type BookSortOption =
  | 'newest'
  | 'title-asc'
  | 'title-desc'
  | 'price-asc'
  | 'price-desc';

export class BookQueryDto {
  @ApiPropertyOptional({ default: 1 }) page?: number;
  @ApiPropertyOptional({ default: 10 }) limit?: number;
  @ApiPropertyOptional({ description: 'Full-text search over title/author/tags/publisher' })
  search?: string;
  @ApiPropertyOptional({ example: 'Self Help' })
  category?: string;
  @ApiPropertyOptional({ example: 'bestseller' })
  tag?: string;
  @ApiPropertyOptional({
    enum: ['newest', 'title-asc', 'title-desc', 'price-asc', 'price-desc'],
    default: 'newest',
  })
  sort?: BookSortOption;
}
