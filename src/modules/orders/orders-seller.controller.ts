import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { OrdersService } from './orders.service';
import { JoiValidationPipe, ParseObjectIdPipe } from '../../common/pipes';
import { Roles, CurrentUser } from '../../common/decorators';
import { ResponseMessage } from '../../common/interceptors';
import { JwtAuthGuard, RolesGuard, SellerApprovedGuard } from '../../common/guards';
import { Role } from '../../common/enums';

/**
 * Seller-side order endpoints.
 *
 * The state machine for seller's actions:
 *   CREATED    → ACCEPTED, CANCELLED
 *   ACCEPTED   → SHIPPED, CANCELLED
 *   SHIPPED    → DELIVERED
 *   DELIVERED  → (terminal — no seller actions)
 *
 * @UseGuards order matters:
 *   1. JwtAuthGuard sets req.user (we need sellerId)
 *   2. RolesGuard checks role === SELLER
 *   3. SellerApprovedGuard checks the seller is APPROVED
 */
@ApiTags('Seller Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, SellerApprovedGuard)
@Roles(Role.SELLER)
@Controller('seller/orders')
export class SellerOrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  @ApiOperation({ summary: 'List my orders (orders for my listings, newest first)' })
  list(@CurrentUser('sellerId') sellerId: string) {
    return this.orders.getSellerOrders(new Types.ObjectId(sellerId));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Order detail (must be MY order — ownership enforced)' })
  detail(
    @CurrentUser('sellerId') sellerId: string,
    @Param('id', ParseObjectIdPipe) id: string,
  ) {
    return this.orders.getSellerOrderById(id, new Types.ObjectId(sellerId));
  }

  @Patch(':id/accept')
  @ApiOperation({ summary: 'Accept the order (CREATED → ACCEPTED)' })
  @ResponseMessage('Order accepted')
  accept(
    @CurrentUser('sellerId') sellerId: string,
    @Param('id', ParseObjectIdPipe) id: string,
  ) {
    return this.orders.acceptOrder(id, new Types.ObjectId(sellerId));
  }

  @Patch(':id/ship')
  @ApiOperation({ summary: 'Mark shipped (ACCEPTED → SHIPPED)' })
  @ResponseMessage('Order marked as shipped')
  ship(
    @CurrentUser('sellerId') sellerId: string,
    @Param('id', ParseObjectIdPipe) id: string,
  ) {
    return this.orders.shipOrder(id, new Types.ObjectId(sellerId));
  }

  @Patch(':id/deliver')
  @ApiOperation({ summary: 'Mark delivered (SHIPPED → DELIVERED)' })
  @ResponseMessage('Order marked as delivered')
  deliver(
    @CurrentUser('sellerId') sellerId: string,
    @Param('id', ParseObjectIdPipe) id: string,
  ) {
    return this.orders.deliverOrder(id, new Types.ObjectId(sellerId));
  }

  @Patch(':id/cancel')
  @ApiOperation({
    summary:
      'Cancel order (CREATED or ACCEPTED → CANCELLED, restores stock atomically)',
  })
  @ResponseMessage('Order cancelled')
  cancel(
    @CurrentUser('sellerId') sellerId: string,
    @Param('id', ParseObjectIdPipe) id: string,
  ) {
    return this.orders.cancelBySeller(id, new Types.ObjectId(sellerId));
  }
}
