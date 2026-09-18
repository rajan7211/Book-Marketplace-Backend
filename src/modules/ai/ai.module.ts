import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Book, BookSchema } from '../books/schemas/book.schema';
import { Listing, ListingSchema } from '../listings/schemas/listing.schema';
import { SellerProfile, SellerProfileSchema } from '../sellers/schemas/seller-profile.schema';
import { Category, CategorySchema } from '../categories/schemas/category.schema';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { OpenAiService } from './openai.service';
import { AiRetrievalService } from './ai-retrieval.service';
import { ChatSession, ChatSessionSchema } from './schemas/chat-session.schema';

/**
 * Self-contained AI module. Registers only the read models it needs for RAG;
 * all providers are private to this module except `AiService`.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Book.name, schema: BookSchema },
      { name: Listing.name, schema: ListingSchema },
      { name: SellerProfile.name, schema: SellerProfileSchema },
      { name: Category.name, schema: CategorySchema },
      { name: ChatSession.name, schema: ChatSessionSchema },
    ]),
  ],
  controllers: [AiController],
  providers: [AiService, OpenAiService, AiRetrievalService],
  exports: [AiService],
})
export class AiModule {}