import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Listing, ListingSchema } from './schemas/listing.schema';
import { Book, BookSchema } from '../books/schemas/book.schema';
import { ListingsRepository } from './listings.repository';
import { ListingsService } from './listings.service';
import { ListingsController } from './listings.controller';
import { SellersModule } from '../sellers/sellers.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Listing.name, schema: ListingSchema },
      { name: Book.name, schema: BookSchema },
    ]),
    SellersModule,
  ],
  controllers: [ListingsController],
  providers: [ListingsRepository, ListingsService],
  exports: [ListingsService],
})
export class ListingsModule {}
