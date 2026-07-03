import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateReviewDto {
  @ApiPropertyOptional({ example: 4, minimum: 1, maximum: 5 })
  rating?: number;

  @ApiPropertyOptional({ example: 'Updated my opinion after re-reading' })
  comment?: string;
}