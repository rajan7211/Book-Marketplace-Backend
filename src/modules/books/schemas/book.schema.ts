import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BookStatus } from '../../../common/enums';

export type BookDocument = HydratedDocument<Book>;

/**
 * Canonical, ISBN-unique catalog item. A Book is shared across sellers;
 * each seller's offer is a separate Listing (1-N). Reference, never embed.
 */
@Schema({ timestamps: true, collection: 'books' })
export class Book {
  @Prop({ required: true, unique: true, uppercase: true, trim: true, index: true })
  isbn: string;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true, trim: true })
  author: string;

  @Prop({ required: true, trim: true })
  publisher: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true, trim: true, index: true })
  category: string;

  @Prop({ default: '' })
  coverImage: string;

  @Prop({ type: String, enum: BookStatus, default: BookStatus.PENDING_APPROVAL, index: true })
  status: BookStatus;

  @Prop({ type: [String], default: [] })
  tags: string[];

  /** seller who submitted this book via Scenario B */
  @Prop({ type: Types.ObjectId, ref: 'SellerProfile', default: null })
  submittedBy: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  approvedAt: Date | null;

  // Denormalized rating summary (maintained by ReviewsService, Phase 10)
  @Prop({ default: 0, min: 0, max: 5 })
  averageRating: number;

  @Prop({ default: 0, min: 0 })
  reviewCount: number;
}

export const BookSchema = SchemaFactory.createForClass(Book);

// Weighted full-text search across the fields customers search on.
BookSchema.index(
  { title: 'text', author: 'text', tags: 'text', publisher: 'text' },
  { weights: { title: 10, author: 5, tags: 3, publisher: 1 }, name: 'book_text_search' },
);

// Common catalog filter: approved books within a category.
BookSchema.index({ status: 1, category: 1 });
