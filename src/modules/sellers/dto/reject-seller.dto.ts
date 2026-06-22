import { ApiPropertyOptional } from '@nestjs/swagger';

export class RejectSellerDto {
  @ApiPropertyOptional({ example: 'Incomplete business documents' })
  reason?: string;
}
