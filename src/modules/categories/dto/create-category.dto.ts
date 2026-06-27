import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Self Help' })
  name: string;

  @ApiPropertyOptional({ example: 'Books about personal development' })
  description?: string;

  @ApiPropertyOptional({ example: 0, description: 'Display order (ascending)' })
  sortOrder?: number;
}
