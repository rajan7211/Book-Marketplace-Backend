import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Cart, CartSchema } from './schemas/cart.schema';
import { Listing, ListingSchema } from '../listings/schemas/listing.schema';
import { Book, BookSchema } from '../books/schemas/book.schema';
import {
  SellerProfile,
  SellerProfileSchema,
} from '../sellers/schemas/seller-profile.schema';
import { CartRepository } from './cart.repository';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';

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
  providers: [CartRepository, CartService],
  exports: [CartService],
})
export class CartModule {}
