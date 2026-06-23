import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Cart, CartSchema } from './schemas/cart.schema';
import { Listing, ListingSchema } from '../listings/schemas/listing.schema';
import { Book, BookSchema } from '../books/schemas/book.schema';
import { SellerProfile, SellerProfileSchema } from '../sellers/schemas/seller-profile.schema';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';

/**
 * Cart needs read access to Listing / Book / SellerProfile so it can
 * validate purchasability and hydrate live price/stock. We register those
 * models directly here (read-only use) to keep the module self-contained.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Cart.name, schema: CartSchema },
      { name: Listing.name, schema: ListingSchema },
      { name: Book.name, schema: BookSchema },
      { name: SellerProfile.name, schema: SellerProfileSchema },
    ]),
  ],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
