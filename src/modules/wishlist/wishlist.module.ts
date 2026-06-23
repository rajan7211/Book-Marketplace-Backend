import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Wishlist, WishlistSchema } from './schemas/wishlist.schema';
import { Book, BookSchema } from '../books/schemas/book.schema';
import { Listing, ListingSchema } from '../listings/schemas/listing.schema';
import { SellerProfile, SellerProfileSchema } from '../sellers/schemas/seller-profile.schema';
import { WishlistService } from './wishlist.service';
import { WishlistController } from './wishlist.controller';

/**
 * Wishlist needs read access to Book / Listing / SellerProfile to validate
 * books and compute the lowest live price, so it registers those models here.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Wishlist.name, schema: WishlistSchema },
      { name: Book.name, schema: BookSchema },
      { name: Listing.name, schema: ListingSchema },
      { name: SellerProfile.name, schema: SellerProfileSchema },
    ]),
  ],
  controllers: [WishlistController],
  providers: [WishlistService],
  exports: [WishlistService],
})
export class WishlistModule {}
