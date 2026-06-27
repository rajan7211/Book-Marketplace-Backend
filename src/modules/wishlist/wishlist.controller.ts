import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { WishlistService } from './wishlist.service';
import { ParseObjectIdPipe } from '../../common/pipes';
import { Roles, CurrentUser } from '../../common/decorators';
import { ResponseMessage } from '../../common/interceptors';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { Role } from '../../common/enums';

@ApiTags('Wishlist')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CUSTOMER)
@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlist: WishlistService) {}

  @Get()
  @ApiOperation({
    summary: 'Get my wishlist (with book info and lowest current price)',
  })
  getWishlist(@CurrentUser('customerId') customerId: string) {
    return this.wishlist.getWishlist(new Types.ObjectId(customerId));
  }

  @Post(':bookId')
  @ApiOperation({ summary: 'Add a book to my wishlist (idempotent)' })
  @ResponseMessage('Added to wishlist')
  addBook(
    @CurrentUser('customerId') customerId: string,
    @Param('bookId', ParseObjectIdPipe) bookId: string,
  ) {
    return this.wishlist.addBook(new Types.ObjectId(customerId), bookId);
  }

  @Delete(':bookId')
  @ApiOperation({ summary: 'Remove a book from my wishlist (idempotent)' })
  @ResponseMessage('Removed from wishlist')
  removeBook(
    @CurrentUser('customerId') customerId: string,
    @Param('bookId', ParseObjectIdPipe) bookId: string,
  ) {
    return this.wishlist.removeBook(new Types.ObjectId(customerId), bookId);
  }
}
