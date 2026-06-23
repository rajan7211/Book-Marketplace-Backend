import { ApiProperty } from '@nestjs/swagger';

/** Payload for setting the quantity of an existing cart line. */
export class UpdateCartItemDto {
  @ApiProperty({ description: 'New quantity (absolute, not a delta)', example: 3 })
  quantity: number;
}
