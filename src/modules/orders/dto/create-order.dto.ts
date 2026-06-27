import { ApiProperty } from '@nestjs/swagger';

export class CreateOrderDto {
  @ApiProperty({ example: '123 Main St, Mumbai, MH 400001' })
  shippingAddress: string;
}
