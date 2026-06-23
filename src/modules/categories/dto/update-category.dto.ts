import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCategoryDto {
  @ApiPropertyOptional({ example: 'Self Improvement' })
  name?: string;

  @ApiPropertyOptional({ example: 'Updated description' })
  description?: string;

  @ApiPropertyOptional({ example: 1 })
  sortOrder?: number;

  @ApiPropertyOptional({ example: true })
  isActive?: boolean;
}
