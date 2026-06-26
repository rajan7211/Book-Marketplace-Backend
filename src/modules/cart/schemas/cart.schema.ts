import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type CartDocument = HydratedDocument<Cart>;

/**
 * ONE cart line, embedded inside Cart.
 *
 * Keyed by listingId — NOT bookId — because Rule 5 says:
 * "Same book from two sellers = two cart lines".
 *
 * We denormalize bookId and sellerId onto each line so the cart UI
 * can render without joining to the listings/books/sellers collections.
 *
 * The `title`, `coverImage`, `priceAtAdd` fields are DISPLAY SNAPSHOTS.
 * They're for showing the cart to the user. The authoritative price and
 * stock ALWAYS come from the live Listing at view time and at checkout.
 */
@Schema({ _id: false })
export class CartItem {
  /** FK to Listing — the unique key for this cart line. */
  @Prop({ type: Types.ObjectId, ref: 'Listing', required: true })
  listingId: Types.ObjectId;

  /** Denormalized FK to Book (copied from the listing) for fast UI rendering. */
  @Prop({ type: Types.ObjectId, ref: 'Book', required: true })
  bookId: Types.ObjectId;

  /** Denormalized FK to SellerProfile (copied from the listing). */
  @Prop({ type: Types.ObjectId, ref: 'SellerProfile', required: true })
  sellerId: Types.ObjectId;

  /** Always at least 1. Joi pipe enforces max 100 to prevent abuse. */
  @Prop({ required: true, min: 1 })
  quantity: number;

  // ───── Display snapshots (NOT authoritative) ─────
  /** Snapshot of book title at add-to-cart time. Live data wins on read. */
  @Prop({ type: String, default: null })
  title: string | null;

  /** Snapshot of book coverImage URL at add-to-cart time. */
  @Prop({ type: String, default: null })
  coverImage: string | null;

  /** Snapshot of the seller's price when this was added. */
  @Prop({ type: Number, default: null })
  priceAtAdd: number | null;
}

export const CartItemSchema = SchemaFactory.createForClass(CartItem);

/**
 * The cart itself. ONE per customer (enforced by `unique` on customerId).
 */
@Schema({ timestamps: true, collection: 'carts' })
export class Cart {
  /**
   * FK to CustomerProfile. Unique means: one cart per customer, period.
   * If two requests try to create a cart for the same customer,
   * Mongo rejects the second.
   */
  @Prop({
    type: Types.ObjectId,
    ref: 'CustomerProfile',
    required: true,
    unique: true,
    index: true,
  })
  customerId: Types.ObjectId;

  /**
   * Embedded array of CartItem. We embed (don't reference) because:
   *   - Items are owned by the cart
   *   - They're read together with the cart
   *   - There's no use-case for accessing them independently
   */
  @Prop({ type: [CartItemSchema], default: [] })
  items: CartItem[];
}

export const CartSchema = SchemaFactory.createForClass(Cart);
