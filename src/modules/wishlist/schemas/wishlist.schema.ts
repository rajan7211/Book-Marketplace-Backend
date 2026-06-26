import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type WishlistDocument = HydratedDocument<Wishlist>;

/**
 * ONE wishlist entry, embedded inside Wishlist.
 *
 * Keyed by bookId (not listingId). Wishlist is book-level:
 * "I want this book" — we don't care which seller offers it.
 *
 * No quantity (you either want it or don't).
 * No price snapshot (we don't lock in a price).
 * Just bookId + addedAt for ordering ("saved 3 weeks ago").
 */
@Schema({ _id: false })
export class WishlistItem {
  /** FK to Book. The unique key for this wishlist entry. */
  @Prop({ type: Types.ObjectId, ref: 'Book', required: true })
  bookId: Types.ObjectId;

  /**
   * When the user added this book.
   * Defaults to NOW at the moment of insertion.
   * (Mongoose evaluates the default at document-creation time, not
   * at module-load time, so this is safe.)
   */
  @Prop({ type: Date, default: Date.now })
  addedAt: Date;
}

export const WishlistItemSchema = SchemaFactory.createForClass(WishlistItem);

/**
 * The wishlist itself. ONE per customer (enforced by `unique` on customerId).
 * Same pattern as Cart — embedded items, no separate collection.
 */
@Schema({ timestamps: true, collection: 'wishlists' })
export class Wishlist {
  @Prop({
    type: Types.ObjectId,
    ref: 'CustomerProfile',
    required: true,
    unique: true,
    index: true,
  })
  customerId: Types.ObjectId;

  /** Embedded array of WishlistItem. Same embed-vs-reference logic as Cart. */
  @Prop({ type: [WishlistItemSchema], default: [] })
  items: WishlistItem[];
}

export const WishlistSchema = SchemaFactory.createForClass(Wishlist);
