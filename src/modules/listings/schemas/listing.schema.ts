import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { ListingStatus } from '../../../common/enums';

export type ListingDocument = HydratedDocument<Listing>;

/**
 * A single seller's offer on a Book.
 * Rule 10: at most one listing per (seller, book) — enforced by unique index.
 * Rule 5/6: stock never negative — schema min + atomic $inc in OrdersService.
 */
@Schema({ timestamps: true, collection: 'listings' })
export class Listing {
  @Prop({ type: Types.ObjectId, ref: 'Book', required: true, index: true })
  bookId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'SellerProfile', required: true, index: true })
  sellerId: Types.ObjectId;

  @Prop({ required: true, min: 0.01 })
  price: number;

  @Prop({ required: true, min: 0 })
  mrp: number;

  @Prop({ required: true, min: 0, default: 0 })
  stock: number;

  @Prop({ type: String, enum: ListingStatus, default: ListingStatus.ACTIVE, index: true })
  status: ListingStatus;
}

export const ListingSchema = SchemaFactory.createForClass(Listing);

// Rule 10: one listing per seller+book.
ListingSchema.index({ sellerId: 1, bookId: 1 }, { unique: true });

// Catalog browse + price sort.
ListingSchema.index({ bookId: 1, status: 1, price: 1 });
