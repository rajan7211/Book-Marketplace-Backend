import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Book, BookSchema } from './schemas/book.schema';
import { Listing, ListingSchema } from '../listings/schemas/listing.schema';
import { UploadsModule } from '../uploads/uploads.module';
import { BooksRepository } from './books.repository';
import { BooksService } from './books.service';
import { BooksController } from './books.controller';
import { BooksAdminController } from './books-admin.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Book.name, schema: BookSchema },
      { name: Listing.name, schema: ListingSchema },
    ]),
    UploadsModule,
  ],
  controllers: [BooksController, BooksAdminController],
  providers: [BooksRepository, BooksService],
  exports: [BooksService],
})
export class BooksModule {}
