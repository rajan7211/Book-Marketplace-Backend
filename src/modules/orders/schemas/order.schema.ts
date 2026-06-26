import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { OrderStatus } from '../../../common/enums';

export type OrderDocument = HydratedDocument<Order>;

/**
 * ONE order line — an IMMUTABLE SNAPSHOT taken at checkout.
 *
 * Title, coverImage, and price are COPIED here. They never read from
 * the live Book or Listing. This is what makes historical orders stable
 * even after the seller edits their listing later.
 */
@Schema({ _id: false })
export class OrderItem {
  /** FK to Listing (kept for traceability, not for live price lookup). */
  @Prop({ type: Types.ObjectId, ref: 'Listing', required: true })
  listingId: Types.ObjectId;

  /** FK to Book (kept for traceability). */
  @Prop({ type: Types.ObjectId, ref: 'Book', required: true })
  bookId: Types.ObjectId;

  /** SNAPSHOT — title at the moment of purchase. */
  @Prop({ required: true })
  title: string;

  /** SNAPSHOT — cover image URL at the moment of purchase. */
  @Prop({ default: '' })
  coverImage: string;

  /** SNAPSHOT — price PER UNIT at the moment of purchase. */
  @Prop({ required: true, min: 0 })
  price: number;

  /** How many units the customer bought. */
  @Prop({ required: true, min: 1 })
  quantity: number;

  /** SNAPSHOT — price × quantity at the moment of purchase. */
  @Prop({ required: true, min: 0 })
  lineTotal: number;
}

export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

/**
 * Shipping address — embedded because the address at the time of order
 * matters, not the customer's current address (they might have moved).
 */
@Schema({ _id: false })
export class ShippingAddress {
  /** Free-form address line. We can add city/state/zip later. */
  @Prop({ required: true })
  line: string;
}

export const ShippingAddressSchema = SchemaFactory.createForClass(ShippingAddress);

@Schema({ timestamps: true, collection: 'orders' })
export class Order {
  /**
   * Human-readable order number, e.g. "ORD-20260626-A3F2".
   * - Shown to customers in their "My Orders" page.
   * - Indexed because support teams search by it.
   * - Unique to prevent collisions.
   */
  @Prop({ required: true, unique: true, index: true })
  orderNumber: string;

  /** FK to CustomerProfile — who placed the order. */
  @Prop({
    type: Types.ObjectId,
    ref: 'CustomerProfile',
    required: true,
    index: true,
  })
  customerId: Types.ObjectId;

  /** FK to SellerProfile — Rule 7: one order per seller. */
  @Prop({
    type: Types.ObjectId,
    ref: 'SellerProfile',
    required: true,
    index: true,
  })
  sellerId: Types.ObjectId;

  @Prop({ required: true })
  sellerName: string;

  /** Embedded shipping address. */
  @Prop({ type: ShippingAddressSchema, required: true })
  shippingAddress: ShippingAddress;

  /** Embedded array of OrderItem snapshots. */
  @Prop({ type: [OrderItemSchema], required: true })
  items: OrderItem[];

  /** Total = sum of lineTotals at purchase time. */
  @Prop({ required: true, min: 0 })
  totalAmount: number;

  /** Where the order is in the seller-driven state machine. */
  @Prop({
    type: String,
    enum: OrderStatus,
    default: OrderStatus.CREATED,
    index: true,
  })
  status: OrderStatus;

  // ───── Timestamps for each state transition (audit trail) ─────
  @Prop({ type: Date, default: null })
  acceptedAt: Date | null;

  @Prop({ type: Date, default: null })
  shippedAt: Date | null;

  @Prop({ type: Date, default: null })
  deliveredAt: Date | null;

  @Prop({ type: Date, default: null })
  cancelledAt: Date | null;

  /**
   * Optional reason the order was cancelled.
   * Set when status moves to CANCELLED.
   */
  @Prop({ type: String, default: null })
  cancellationReason: string | null;
}

export const OrderSchema = SchemaFactory.createForClass(Order);

// ───── Indexes ─────

/**
 * Seller dashboard query:
 *   "show me my orders in status ACCEPTED, newest first".
 * The compound index lets Mongo serve this with one index scan.
 */
OrderSchema.index({ sellerId: 1, status: 1, createdAt: -1 });

/**
 * Customer "My Orders" page:
 *   "show me all my orders, newest first".
 */
OrderSchema.index({ customerId: 1, createdAt: -1 });
