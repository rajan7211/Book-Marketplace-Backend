import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BookStatus } from '../../../common/enums';

export type BookDocument = HydratedDocument<Book>;

/**
 * The canonical catalog entry.
 *
 * RULE: One Book per ISBN. Sellers submit offers via Listings (1-N).
 * Reference, NEVER embed listings inside this document.
 *
 * RULE: Customers only see books with status === APPROVED.
 * PENDING_APPROVAL and REJECTED books are invisible to the storefront.
 */
@Schema({ timestamps: true, collection: 'books' })
export class Book {
  /**
   * ISBN-10 or ISBN-13.
   * - unique: no two books can share an ISBN
   * - uppercase: "978..." and "978..." are the same (ISBNs are case-insensitive)
   * - trim:  protect against "  978..." from a typo
   * - index:  login-like lookups by ISBN (duplicate-guard on seller submit)
   */
  @Prop({
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    index: true,
  })
  isbn: string;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true, trim: true })
  author: string;

  @Prop({ required: true, trim: true })
  publisher: string;

  /** Multi-line description shown on the book detail page. */
  @Prop({ required: true })
  description: string;

  /**
   * Category as a free-text string (e.g. "Self Help", "Fiction").
   * Indexed because the storefront filter "category = X" is the most
   * common query after text search.
   */
  @Prop({ required: true, trim: true, index: true })
  category: string;

  /** URL of the cover image. Empty until upload pipeline is built (Phase 5/11). */
  @Prop({ default: '' })
  coverImage: string;

  /** Lifecycle: PENDING_APPROVAL → APPROVED | REJECTED (admin drives this). */
  @Prop({
    type: String,
    enum: BookStatus,
    default: BookStatus.PENDING_APPROVAL,
    index: true,
  })
  status: BookStatus;

  /**
   * Tags used for "homepage rows" (bestseller, trending, new-releases).
   * Plain string array — we filter by exact match in BooksService.findByTag().
   */
  @Prop({ type: [String], default: [] })
  tags: string[];

  /**
   * Which seller submitted this book via "Scenario B" (seller-submitted new book).
   * Null for admin-uploaded books. Useful for "my submitted books" queries later.
   */
  @Prop({ type: Types.ObjectId, ref: 'SellerProfile', default: null })
  submittedBy: Types.ObjectId | null;

  /** Set when status becomes APPROVED. */
  @Prop({ type: Date, default: null })
  approvedAt: Date | null;

  // ───── Denormalized rating summary (Phase 9) ─────
  /**
   * WHY denormalize?
   * If we computed averageRating on every book-detail page request,
   * we'd run an expensive aggregation against the reviews collection
   * for EVERY page view. Instead, we maintain this number on the
   * Book itself and update it whenever a review is added/edited/deleted.
   *
   * This is a classic read-optimization tradeoff:
   * - Read:  O(1) — just read the field
   * - Write: extra work — every review mutation also updates this field
   */
  @Prop({ default: 0, min: 0, max: 5 })
  averageRating: number;

  @Prop({ default: 0, min: 0 })
  reviewCount: number;
}

export const BookSchema = SchemaFactory.createForClass(Book);

// ───── Indexes ─────

/**
 * Full-text search across the fields customers actually search on.
 * Weights make title matches more relevant than publisher matches.
 * Mongo's $text operator uses these weights for ranking.
 */
BookSchema.index(
  { title: 'text', author: 'text', tags: 'text', publisher: 'text' },
  {
    weights: { title: 10, author: 5, tags: 3, publisher: 1 },
    name: 'book_text_search',
  },
);

/**
 * Compound index for the most common storefront query:
 *   "all APPROVED books in category X".
 * Compound indexes are faster than two single-field indexes for this.
 */
BookSchema.index({ status: 1, category: 1 });
