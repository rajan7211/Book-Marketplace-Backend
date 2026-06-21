import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { OrderStatus } from '../../../common/enums';

export type OrderDocument = HydratedDocument<Order>;

/**
 * Embedded order line — an immutable snapshot taken at checkout.
 * Title/cover/price are copied so the historical order is unaffected by
 * later edits to the book or listing.
 */
@Schema({ _id: false })
export class OrderItem {
  @Prop({ type: Types.ObjectId, ref: 'Listing', required: true })
  listingId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Book', required: true })
  bookId: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop({ default: '' })
  coverImage: string;

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop({ required: true, min: 0 })
  lineTotal: number;
}

export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

@Schema({ _id: false })
export class ShippingAddress {
  @Prop({ required: true })
  line: string;
}

export const ShippingAddressSchema = SchemaFactory.createForClass(ShippingAddress);

/**
 * One order per seller (Rule 7). Checkout splits a multi-seller cart into
 * multiple orders, each fulfilled independently.
 */
@Schema({ timestamps: true, collection: 'orders' })
export class Order {
  @Prop({ required: true, unique: true, index: true })
  orderNumber: string;

  @Prop({ type: Types.ObjectId, ref: 'CustomerProfile', required: true, index: true })
  customerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'SellerProfile', required: true, index: true })
  sellerId: Types.ObjectId;

  /** snapshot of seller business name at purchase time */
  @Prop({ required: true })
  sellerName: string;

  @Prop({ type: ShippingAddressSchema, required: true })
  shippingAddress: ShippingAddress;

  @Prop({ type: [OrderItemSchema], required: true })
  items: OrderItem[];

  @Prop({ required: true, min: 0 })
  totalAmount: number;

  @Prop({ type: String, enum: OrderStatus, default: OrderStatus.CREATED, index: true })
  status: OrderStatus;

  @Prop({ type: Date, default: null })
  acceptedAt: Date | null;

  @Prop({ type: Date, default: null })
  shippedAt: Date | null;

  @Prop({ type: Date, default: null })
  deliveredAt: Date | null;

  @Prop({ type: Date, default: null })
  cancelledAt: Date | null;

  @Prop({ type: String, default: null })
  cancellationReason: string | null;
}

export const OrderSchema = SchemaFactory.createForClass(Order);

// Seller dashboard: their orders newest-first, filterable by status.
OrderSchema.index({ sellerId: 1, status: 1, createdAt: -1 });
// Customer "my orders".
OrderSchema.index({ customerId: 1, createdAt: -1 });
