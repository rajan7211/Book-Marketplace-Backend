import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from './schemas/order.schema';
import { Listing, ListingSchema } from '../listings/schemas/listing.schema';
import { CartModule } from '../cart/cart.module';
import { SellersModule } from '../sellers/sellers.module';
import { OrdersRepository } from './orders.repository';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { SellerOrdersController } from './orders-seller.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Listing.name, schema: ListingSchema },
    ]),
    CartModule, // provides CartService for hydration
    SellersModule, // provides SellersService for SellerApprovedGuard
  ],
  controllers: [OrdersController, SellerOrdersController],
  providers: [OrdersRepository, OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
