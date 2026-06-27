import { ApiPropertyOptional } from '@nestjs/swagger';

export class RejectBookDto {
  @ApiPropertyOptional({ example: 'Cover image is misleading' })
  reason?: string;
}
