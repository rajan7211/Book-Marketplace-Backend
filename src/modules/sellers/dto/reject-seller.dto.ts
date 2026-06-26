import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Body for PATCH /api/admin/sellers/:id/reject.
 * Reason is optional — admin may just click "reject" without explanation.
 */
export class RejectSellerDto {
  @ApiPropertyOptional({ example: 'Incomplete business documents' })
  reason?: string;
}
