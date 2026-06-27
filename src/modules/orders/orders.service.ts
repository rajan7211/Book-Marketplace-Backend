import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { OrdersRepository } from './orders.repository';
import { CartService } from '../cart/cart.service';
import { Order, OrderDocument } from './schemas/order.schema';
import { Listing, ListingDocument } from '../listings/schemas/listing.schema';
import { OrderStatus } from '../../common/enums';

@Injectable()
export class OrdersService {
  constructor(
    private readonly repo: OrdersRepository,
    private readonly cartService: CartService,
    @InjectModel(Listing.name)
    private readonly listingModel: Model<ListingDocument>,
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
  ) {}

  // ───────────────────── CHECKOUT (the hard one) ─────────────────────

  /**
   * Checkout: split cart into one order per seller, reserve stock atomically,
   * create orders, clear cart.
   *
   * On ANY stock-decrement failure, all previous decrements are rolled back
   * and NO order is created.
   */
  async checkout(
    customerId: Types.ObjectId,
    shippingAddress: string,
  ): Promise<OrderDocument[]> {
    // 1. Hydrate cart (live prices + clamped quantities)
    const cart = await this.cartService.getCart(customerId);
    if (cart.items.length === 0) {
      throw new BadRequestException('Your cart is empty');
    }

    // 2. Group items by seller (Rule 7: one order per seller)
    const itemsBySeller = new Map<string, typeof cart.items>();
    for (const item of cart.items) {
      const key = item.sellerId;
      if (!itemsBySeller.has(key)) itemsBySeller.set(key, []);
      itemsBySeller.get(key)!.push(item);
    }

    // 3. Build the orders IN MEMORY (don't save yet — wait until stock is reserved)
    type OrderDraft = {
      orderNumber: string;
      customerId: Types.ObjectId;
      sellerId: Types.ObjectId;
      sellerName: string;
      shippingAddress: { line: string };
      items: Array<{
        listingId: Types.ObjectId;
        bookId: Types.ObjectId;
        title: string;
        coverImage: string;
        price: number;
        quantity: number;
        lineTotal: number;
      }>;
      totalAmount: number;
      status: OrderStatus;
    };

    const drafts: OrderDraft[] = [];
    for (const [sellerId, items] of itemsBySeller) {
      drafts.push({
        orderNumber: this.generateOrderNumber(),
        customerId,
        sellerId: new Types.ObjectId(sellerId),
        sellerName: items[0].sellerName,
        shippingAddress: { line: shippingAddress },
        items: items.map((i) => ({
          listingId: new Types.ObjectId(i.listingId),
          bookId: new Types.ObjectId(i.bookId),
          title: i.title,
          coverImage: i.coverImage,
          price: i.price,
          quantity: i.quantity,
          lineTotal: i.lineTotal,
        })),
        totalAmount: items.reduce((sum, i) => sum + i.lineTotal, 0),
        status: OrderStatus.CREATED,
      });
    }

    // 4. Atomic stock reservation with ROLLBACK on any failure
    const decremented: Array<{ listingId: Types.ObjectId; quantity: number }> = [];
    for (const order of drafts) {
      for (const item of order.items) {
        const result = await this.listingModel.updateOne(
          { _id: item.listingId, stock: { $gte: item.quantity } },
          { $inc: { stock: -item.quantity } },
        );
        if (result.modifiedCount === 0) {
          // Stock insufficient — roll back everything so far
          for (const d of decremented) {
            await this.listingModel.updateOne(
              { _id: d.listingId },
              { $inc: { stock: d.quantity } },
            );
          }
          throw new ConflictException(
            'Insufficient stock for one or more items',
          );
        }
        decremented.push({
          listingId: item.listingId,
          quantity: item.quantity,
        });
      }
    }

    // 5. Create the orders (stock is already reserved)
    const created = await this.orderModel.create(drafts);

    // 6. Clear the cart
    await this.cartService.clear(customerId);

    return created;
  }

  // ───────────────────── READ ─────────────────────

  async getMyOrders(customerId: Types.ObjectId) {
    return this.repo.findByCustomer(customerId);
  }

  async getOrderById(
    orderId: string,
    customerId: Types.ObjectId,
  ): Promise<OrderDocument> {
    const order = await this.repo.findById(orderId);
    if (!order) throw new NotFoundException('Order not found');
    if (order.customerId.toString() !== customerId.toString()) {
      throw new ForbiddenException(
        'This order belongs to another account',
      );
    }
    return order;
  }

  // ───────────────────── CANCEL ─────────────────────

  /**
   * Customer can only cancel a CREATED order (before the seller accepts).
   * Restores stock atomically.
   */
  async cancel(
    orderId: string,
    customerId: Types.ObjectId,
  ): Promise<OrderDocument> {
    const order = await this.getOrderById(orderId, customerId);
    if (order.status !== OrderStatus.CREATED) {
      throw new BadRequestException(
        'Only CREATED orders can be cancelled. The seller has already accepted your order.',
      );
    }

    // Restore stock
    for (const item of order.items) {
      await this.listingModel.updateOne(
        { _id: item.listingId },
        { $inc: { stock: item.quantity } },
      );
    }

    order.status = OrderStatus.CANCELLED;
    order.cancelledAt = new Date();
    await order.save();
    return order;
  }

  // ───────────────────── SELLER-SIDE ─────────────────────

  async getSellerOrders(sellerId: Types.ObjectId): Promise<OrderDocument[]> {
    return this.orderModel
      .find({ sellerId })
      .sort({ createdAt: -1 })
      .lean()
      .exec() as unknown as OrderDocument[];
  }

  async getSellerOrderById(
    orderId: string,
    sellerId: Types.ObjectId,
  ): Promise<OrderDocument> {
    const order = await this.repo.findById(orderId);
    if (!order) throw new NotFoundException('Order not found');
    if (order.sellerId.toString() !== sellerId.toString()) {
      throw new ForbiddenException('This order belongs to another seller');
    }
    return order;
  }

  /**
   * Generic state-transition method.
   * All four transitions (accept / ship / deliver / cancel) share this logic —
   * only the new status and timestamp field differ.
   */
  private async transition(
    orderId: string,
    sellerId: Types.ObjectId,
    newStatus: OrderStatus,
    timestampField: 'acceptedAt' | 'shippedAt' | 'deliveredAt' | 'cancelledAt',
    restoreStock = false,
  ): Promise<OrderDocument> {
    const order = await this.getSellerOrderById(orderId, sellerId);

    // Validate transition against the state machine
    const allowed = this.allowedTransitions(order.status);
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition order from ${order.status} to ${newStatus}`,
      );
    }

    if (restoreStock) {
      for (const item of order.items) {
        await this.listingModel.updateOne(
          { _id: item.listingId },
          { $inc: { stock: item.quantity } },
        );
      }
    }

    order.status = newStatus;
    (order as unknown as Record<string, Date | null>)[timestampField] = new Date();
    await order.save();
    return order;
  }

  /**
   * Mirrors ORDER_TRANSITIONS from common/enums.
   * We keep a local copy so the service doesn't have to import the constant
   * (which is itself typed as Record<OrderStatus, OrderStatus[]>).
   */
  private allowedTransitions(current: OrderStatus): OrderStatus[] {
    switch (current) {
      case OrderStatus.CREATED:
        return [OrderStatus.ACCEPTED, OrderStatus.CANCELLED];
      case OrderStatus.ACCEPTED:
        return [OrderStatus.SHIPPED, OrderStatus.CANCELLED];
      case OrderStatus.SHIPPED:
        return [OrderStatus.DELIVERED];
      default:
        return []; // DELIVERED and CANCELLED are terminal
    }
  }

  acceptOrder(orderId: string, sellerId: Types.ObjectId) {
    return this.transition(orderId, sellerId, OrderStatus.ACCEPTED, 'acceptedAt');
  }

  shipOrder(orderId: string, sellerId: Types.ObjectId) {
    return this.transition(orderId, sellerId, OrderStatus.SHIPPED, 'shippedAt');
  }

  deliverOrder(orderId: string, sellerId: Types.ObjectId) {
    return this.transition(orderId, sellerId, OrderStatus.DELIVERED, 'deliveredAt');
  }

  cancelBySeller(orderId: string, sellerId: Types.ObjectId) {
    // Cancel restores stock — the seller (or system) gets the inventory back.
    return this.transition(
      orderId,
      sellerId,
      OrderStatus.CANCELLED,
      'cancelledAt',
      true,
    );
  }

  // ───────────────────── helpers ─────────────────────

  /**
   * Human-readable order number: ORD-20260626-A3F2
   * YYYYMMDD + random suffix. Not collision-proof but good enough for MVP.
   */
  private generateOrderNumber(): string {
    const date = new Date()
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `ORD-${date}-${random}`;
  }
}
