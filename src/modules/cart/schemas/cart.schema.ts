import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type CartDocument = HydratedDocument<Cart>;

/**
 * Embedded cart line. Keyed by listingId (Rule 5: the same book from two
 * sellers is two separate lines). Snapshots are display-only — money/stock
 * are always re-read live from the listing at view & checkout.
 */
@Schema({ _id: false })
export class CartItem {
  @Prop({ type: Types.ObjectId, ref: 'Listing', required: true })
  listingId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Book', required: true })
  bookId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'SellerProfile', required: true })
  sellerId: Types.ObjectId;

  @Prop({ required: true, min: 1 })
  quantity: number;

  // display snapshots (not authoritative)
  @Prop({ type: String, default: null })
  title: string | null;

  @Prop({ type: String, default: null })
  coverImage: string | null;

  @Prop({ type: Number, default: null })
  priceAtAdd: number | null;
}

export const CartItemSchema = SchemaFactory.createForClass(CartItem);

@Schema({ timestamps: true, collection: 'carts' })
export class Cart {
  @Prop({ type: Types.ObjectId, ref: 'CustomerProfile', required: true, unique: true, index: true })
  customerId: Types.ObjectId;

  @Prop({ type: [CartItemSchema], default: [] })
  items: CartItem[];
}

export const CartSchema = SchemaFactory.createForClass(Cart);
