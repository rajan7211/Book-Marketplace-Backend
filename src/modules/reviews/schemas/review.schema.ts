import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ReviewDocument = HydratedDocument<Review>;

/**
 * A customer's review of a Book.
 *
 * Rule: ONE review per (customer, book). Enforced by a unique
 * compound index below. If a customer tries to review the same book
 * twice, Mongo throws a duplicate-key error → we return 409.
 *
 * ReviewsService is responsible for keeping Book.averageRating and
 * Book.reviewCount in sync whenever a review is added/updated/deleted.
 *
 * Optional stricter rule (recommended for production):
 * Only customers with a DELIVERED order for this book may review.
 * We'll enforce that in the service layer, not at the schema level.
 */
@Schema({ timestamps: true, collection: 'reviews' })
export class Review {
  /** FK to Book being reviewed. */
  @Prop({ type: Types.ObjectId, ref: 'Book', required: true, index: true })
  bookId: Types.ObjectId;

  /** FK to CustomerProfile who wrote the review. */
  @Prop({
    type: Types.ObjectId,
    ref: 'CustomerProfile',
    required: true,
    index: true,
  })
  customerId: Types.ObjectId;

  /** 1 to 5 stars. min/max enforced at the schema level. */
  @Prop({ required: true, min: 1, max: 5 })
  rating: number;

  /** Review text. Trimmed to strip accidental whitespace. */
  @Prop({ required: true, trim: true })
  comment: string;

  /**
   * Soft-delete flag. Admin can set false to hide inappropriate reviews
   * WITHOUT deleting the document (so averageRating history is preserved).
   * Default true = visible by default.
   */
  @Prop({ default: true })
  isVisible: boolean;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);

// ───── Indexes ─────

/**
 * THE rule enforcer: one review per (customer, book).
 *
 * Without this, two concurrent requests could both pass the
 * "does this customer already have a review for this book?" check
 * and both insert. With it, Mongo guarantees only one wins.
 */
ReviewSchema.index({ bookId: 1, customerId: 1 }, { unique: true });

/**
 * Powers "show me all reviews for this book, newest first".
 * Common query on the book detail page.
 */
ReviewSchema.index({ bookId: 1, createdAt: -1 });
