import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type WishlistDocument = HydratedDocument<Wishlist>;

@Schema({ _id: false })
export class WishlistItem {
  @Prop({ type: Types.ObjectId, ref: 'Book', required: true })
  bookId: Types.ObjectId;

  @Prop({ type: Date, default: Date.now })
  addedAt: Date;
}

export const WishlistItemSchema = SchemaFactory.createForClass(WishlistItem);

/** One wishlist per customer. Wishlists the Book (not a seller offer). */
@Schema({ timestamps: true, collection: 'wishlists' })
export class Wishlist {
  @Prop({ type: Types.ObjectId, ref: 'CustomerProfile', required: true, unique: true, index: true })
  customerId: Types.ObjectId;

  @Prop({ type: [WishlistItemSchema], default: [] })
  items: WishlistItem[];
}

export const WishlistSchema = SchemaFactory.createForClass(Wishlist);
