import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { ListingStatus } from '../../../common/enums';

export type ListingDocument = HydratedDocument<Listing>;

/**
 * A single seller's offer on a Book.
 *
 * Rule 10 (from the roadmap): at most ONE listing per (seller, book).
 * Enforced by a unique compound index below. If a seller tries to list
 * the same book twice, Mongo throws a duplicate-key error and we return 409.
 *
 * Rule 5/6: stock never goes negative.
 *   - The schema says `min: 0` (defense in depth at the DB level).
 *   - The OrdersService uses an atomic `$inc` to decrement, refusing
 *     if the result would be negative (we'll see this in Phase 8).
 */
@Schema({ timestamps: true, collection: 'listings' })
export class Listing {
  /** FK to Book. */
  @Prop({ type: Types.ObjectId, ref: 'Book', required: true, index: true })
  bookId: Types.ObjectId;

  /** FK to SellerProfile. */
  @Prop({
    type: Types.ObjectId,
    ref: 'SellerProfile',
    required: true,
    index: true,
  })
  sellerId: Types.ObjectId;

  /**
   * The price the SELLER is selling at.
   * min: 0.01 — must be strictly positive (a free book doesn't make sense).
   * Should also be <= mrp; that cross-field rule is enforced in Joi (Phase 5).
   */
  @Prop({ required: true, min: 0.01 })
  price: number;

  /**
   * The "Maximum Retail Price" — the publisher's printed price.
   * Used to show discounts ("37% off").
   * Stored separately so we don't lose it when the seller changes their price.
   */
  @Prop({ required: true, min: 0 })
  mrp: number;

  /**
   * Units in stock.
   * - default: 0 (seller must explicitly set this)
   * - min: 0   (Mongo refuses to save a negative stock)
   * The atomic decrement happens in OrdersService during checkout.
   */
  @Prop({ required: true, min: 0, default: 0 })
  stock: number;

  /**
   * ACTIVE   = visible to customers, can be added to cart.
   * INACTIVE = hidden, but the listing record stays (so orders keep linking to it).
   */
  @Prop({
    type: String,
    enum: ListingStatus,
    default: ListingStatus.ACTIVE,
    index: true,
  })
  status: ListingStatus;
}

export const ListingSchema = SchemaFactory.createForClass(Listing);

// ───── Indexes ─────

/**
 * RULE 10: One listing per (seller, book).
 *
 * Without this unique index, two requests at the same time could both
 * pass the "does a listing exist?" check and both insert. With it,
 * Mongo guarantees only one wins; the other gets a duplicate-key error.
 */
ListingSchema.index({ sellerId: 1, bookId: 1 }, { unique: true });

/**
 * Powers the storefront browse + price sort query:
 *   "all ACTIVE listings for this book, sorted by price ascending".
 * A compound index lets Mongo serve this with one index scan instead of
 * filtering all listings in memory.
 */
ListingSchema.index({ bookId: 1, status: 1, price: 1 });
