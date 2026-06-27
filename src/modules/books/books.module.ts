import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Book, BookSchema } from './schemas/book.schema';
import { Listing, ListingSchema } from '../listings/schemas/listing.schema';
import { BooksRepository } from './books.repository';
import { BooksService } from './books.service';
import { BooksController } from './books.controller';
import { BooksAdminController } from './books-admin.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Book.name, schema: BookSchema },
      // Listing model is registered so BooksRepository can join listings for price sort.
      { name: Listing.name, schema: ListingSchema },
    ]),
  ],
  controllers: [BooksController, BooksAdminController],
  providers: [BooksRepository, BooksService],
  exports: [BooksService],
})
export class BooksModule {}
