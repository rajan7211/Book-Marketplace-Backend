import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { CartService } from './cart.service';
import { AddCartItemDto, UpdateCartItemDto } from './dto';
import {
  addCartItemSchema,
  updateCartItemSchema,
} from './validation/cart.validation';
import { JoiValidationPipe, ParseObjectIdPipe } from '../../common/pipes';
import { Roles, CurrentUser } from '../../common/decorators';
import { ResponseMessage } from '../../common/interceptors';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { Role } from '../../common/enums';
import { MESSAGES } from '../../common/constants';

@ApiTags('Cart')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CUSTOMER)
@Controller('cart')
export class CartController {
  constructor(private readonly cart: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Get my cart (with live prices and stock)' })
  getCart(@CurrentUser('customerId') customerId: string) {
    return this.cart.getCart(new Types.ObjectId(customerId));
  }

  @Post('items')
  @ApiOperation({ summary: 'Add an item to my cart' })
  @ResponseMessage(MESSAGES.CART.ITEM_ADDED)
  addItem(
    @CurrentUser('customerId') customerId: string,
    @Body(new JoiValidationPipe(addCartItemSchema)) dto: AddCartItemDto,
  ) {
    return this.cart.addItem(
      new Types.ObjectId(customerId),
      dto.listingId,
      dto.quantity ?? 1,
    );
  }

  @Patch('items/:listingId')
  @ApiOperation({ summary: 'Update the quantity of a cart item' })
  @ResponseMessage(MESSAGES.COMMON.UPDATED)
  updateItem(
    @CurrentUser('customerId') customerId: string,
    @Param('listingId', ParseObjectIdPipe) listingId: string,
    @Body(new JoiValidationPipe(updateCartItemSchema)) dto: UpdateCartItemDto,
  ) {
    return this.cart.updateItem(
      new Types.ObjectId(customerId),
      listingId,
      dto.quantity,
    );
  }

  @Delete('items/:listingId')
  @ApiOperation({ summary: 'Remove an item from my cart' })
  @ResponseMessage(MESSAGES.CART.ITEM_REMOVED)
  removeItem(
    @CurrentUser('customerId') customerId: string,
    @Param('listingId', ParseObjectIdPipe) listingId: string,
  ) {
    return this.cart.removeItem(
      new Types.ObjectId(customerId),
      listingId,
    );
  }
  
  @Delete()
  @ApiOperation({ summary: 'Empty my cart' })
  @ResponseMessage(MESSAGES.CART.CLEARED)
  clear(@CurrentUser('customerId') customerId: string) {
    return this.cart.clear(new Types.ObjectId(customerId));
  }
}
