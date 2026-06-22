import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Book, BookSchema } from './schemas/book.schema';
import { BooksService } from './books.service';
import { BooksController } from './books.controller';
import { BooksAdminController } from './books-admin.controller';
import { ListingsModule } from '../listings/listings.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Book.name, schema: BookSchema }]),
    ListingsModule,
  ],
  controllers: [BooksController, BooksAdminController],
  providers: [BooksService],
  exports: [BooksService],
})
export class BooksModule {}
