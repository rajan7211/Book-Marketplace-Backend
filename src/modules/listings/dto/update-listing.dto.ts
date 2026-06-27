import { ApiPropertyOptional } from '@nestjs/swagger';
import { ListingStatus } from '../../../common/enums';

export class UpdateListingDto {
  @ApiPropertyOptional({ example: 379 })
  price?: number;

  @ApiPropertyOptional({ example: 599 })
  mrp?: number;

  @ApiPropertyOptional({ example: 15 })
  stock?: number;

  @ApiPropertyOptional({ enum: ListingStatus, example: ListingStatus.ACTIVE })
  status?: ListingStatus;
}