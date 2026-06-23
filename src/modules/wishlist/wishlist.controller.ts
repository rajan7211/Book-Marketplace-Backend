import { Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { WishlistService } from './wishlist.service';
import { ParseObjectIdPipe } from '../../common/pipes';
import { CurrentUser, Roles } from '../../common/decorators';
import { Role } from '../../common/enums';
import { ResponseMessage } from '../../common/interceptors/response.interceptor';

/**
 * Wishlist endpoints belong to the logged-in customer.
 * customerId always comes from the JWT, never the request body.
 */
@ApiTags('Wishlist')
@ApiBearerAuth()
@Roles(Role.CUSTOMER)
@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlist: WishlistService) {}

  @Get()
  @ApiOperation({ summary: 'Get my wishlist (with live book info and lowest price)' })
  getWishlist(@CurrentUser('customerId') customerId: string) {
    return this.wishlist.getWishlist(customerId);
  }

  @Post(':bookId')
  @ApiOperation({ summary: 'Add a book to my wishlist (idempotent)' })
  @ResponseMessage('Added to wishlist')
  addBook(
    @CurrentUser('customerId') customerId: string,
    @Param('bookId', ParseObjectIdPipe) bookId: string,
  ) {
    return this.wishlist.addBook(customerId, bookId);
  }

  @Delete(':bookId')
  @ApiOperation({ summary: 'Remove a book from my wishlist (idempotent)' })
  @ResponseMessage('Removed from wishlist')
  removeBook(
    @CurrentUser('customerId') customerId: string,
    @Param('bookId', ParseObjectIdPipe) bookId: string,
  ) {
    return this.wishlist.removeBook(customerId, bookId);
  }
}
