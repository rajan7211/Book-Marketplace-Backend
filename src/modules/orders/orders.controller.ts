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
import { CreateOrderDto } from './dto';
import { createOrderSchema } from './validation/order.validation';
import { JoiValidationPipe, ParseObjectIdPipe } from '../../common/pipes';
import { Roles, CurrentUser } from '../../common/decorators';
import { ResponseMessage } from '../../common/interceptors';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { Role } from '../../common/enums';
import { MESSAGES } from '../../common/constants';

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CUSTOMER)
@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post()
  @ApiOperation({
    summary: 'Checkout: split cart into one order per seller',
  })
  @ResponseMessage(MESSAGES.ORDER.PLACED)
  checkout(
    @CurrentUser('customerId') customerId: string,
    @Body(new JoiValidationPipe(createOrderSchema)) dto: CreateOrderDto,
  ) {
    return this.orders.checkout(
      new Types.ObjectId(customerId),
      dto.shippingAddress,
    );
  }

  @Get('mine')
  @ApiOperation({ summary: 'My orders (newest first)' })
  getMyOrders(@CurrentUser('customerId') customerId: string) {
    return this.orders.getMyOrders(new Types.ObjectId(customerId));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Order detail' })
  getOrderById(
    @CurrentUser('customerId') customerId: string,
    @Param('id', ParseObjectIdPipe) id: string,
  ) {
    return this.orders.getOrderById(id, new Types.ObjectId(customerId));
  }

  @Patch(':id/cancel')
  @ApiOperation({
    summary: 'Cancel my order (only allowed if status is CREATED)',
  })
  @ResponseMessage('Order cancelled')
  cancel(
    @CurrentUser('customerId') customerId: string,
    @Param('id', ParseObjectIdPipe) id: string,
  ) {
    return this.orders.cancel(id, new Types.ObjectId(customerId));
  }
}