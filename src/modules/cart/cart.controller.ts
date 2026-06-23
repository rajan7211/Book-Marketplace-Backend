import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { addCartItemSchema, updateCartItemSchema } from './validation/cart.validation';
import { JoiValidationPipe, ParseObjectIdPipe } from '../../common/pipes';
import { CurrentUser, Roles } from '../../common/decorators';
import { Role } from '../../common/enums';
import { ResponseMessage } from '../../common/interceptors/response.interceptor';
import { MESSAGES } from '../../common/constants';

@ApiTags('Cart')
@ApiBearerAuth()
@Roles(Role.CUSTOMER)
@Controller('cart')
export class CartController {
  constructor(private readonly cart: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Get my cart (with live prices and stock)' })
  getCart(@CurrentUser('customerId') customerId: string) {
    return this.cart.getCart(customerId);
  }

  @Post('items')
  @ApiOperation({ summary: 'Add an item to my cart' })
  @ResponseMessage(MESSAGES.CART.ITEM_ADDED)
  addItem(
    @CurrentUser('customerId') customerId: string,
    @Body(new JoiValidationPipe(addCartItemSchema)) dto: AddCartItemDto,
  ) {
    return this.cart.addItem(customerId, dto);
  }

  @Patch('items/:listingId')
  @ApiOperation({ summary: 'Update the quantity of a cart item' })
  @ResponseMessage(MESSAGES.COMMON.UPDATED)
  updateItem(
    @CurrentUser('customerId') customerId: string,
    @Param('listingId', ParseObjectIdPipe) listingId: string,
    @Body(new JoiValidationPipe(updateCartItemSchema)) dto: UpdateCartItemDto,
  ) {
    return this.cart.updateItem(customerId, listingId, dto.quantity);
  }

  @Delete('items/:listingId')
  @ApiOperation({ summary: 'Remove an item from my cart' })
  @ResponseMessage(MESSAGES.CART.ITEM_REMOVED)
  removeItem(
    @CurrentUser('customerId') customerId: string,
    @Param('listingId', ParseObjectIdPipe) listingId: string,
  ) {
    return this.cart.removeItem(customerId, listingId);
  }

  @Delete()
  @ApiOperation({ summary: 'Empty my cart' })
  @ResponseMessage(MESSAGES.CART.CLEARED)
  clear(@CurrentUser('customerId') customerId: string) {
    return this.cart.clear(customerId);
  }
}
