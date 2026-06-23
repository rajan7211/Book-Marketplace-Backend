import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cart, CartDocument } from './schemas/cart.schema';
import { Listing, ListingDocument } from '../listings/schemas/listing.schema';
import { Book, BookDocument } from '../books/schemas/book.schema';
import { SellerProfile, SellerProfileDocument } from '../sellers/schemas/seller-profile.schema';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { BookStatus, ListingStatus, SellerStatus } from '../../common/enums';
import { MESSAGES } from '../../common/constants';

/**
 * A single cart line as returned to the client.
 * Price and stock are ALWAYS read live from the listing, never trusted
 * from a stored snapshot (those are for display only).
 */
interface HydratedCartItem {
  listingId: string;
  bookId: string;
  sellerId: string;
  sellerName: string;
  title: string;
  author: string;
  coverImage: string;
  price: number; // live
  stock: number; // live
  quantity: number;
  lineTotal: number;
}

interface HydratedCart {
  items: HydratedCartItem[];
  totalItems: number;
  totalAmount: number;
}

@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name);

  constructor(
    @InjectModel(Cart.name) private readonly cartModel: Model<CartDocument>,
    @InjectModel(Listing.name) private readonly listingModel: Model<ListingDocument>,
    @InjectModel(Book.name) private readonly bookModel: Model<BookDocument>,
    @InjectModel(SellerProfile.name)
    private readonly sellerModel: Model<SellerProfileDocument>,
  ) {}

  // ──────────────────────────────────────────────────────────
  // PUBLIC API (called by the controller)
  // ──────────────────────────────────────────────────────────

  /** Return the customer's cart, hydrated with live price/stock. */
  async getCart(customerId: string): Promise<HydratedCart> {
    const cart = await this.getOrCreateCart(customerId);
    return this.hydrate(cart);
  }

  /**
   * Add an item to the cart.
   * - Rule 5: lines are keyed by listingId (same book, different seller = new line).
   * - Rule 6: the resulting quantity can never exceed available stock.
   */
  async addItem(customerId: string, dto: AddCartItemDto): Promise<HydratedCart> {
    const quantity = dto.quantity ?? 1;

    // 1. Load the listing and make sure it is actually buyable.
    const listing = await this.getBuyableListingOrThrow(dto.listingId);

    // 2. Load the cart (creating it if the customer has none yet).
    const cart = await this.getOrCreateCart(customerId);

    // 3. Find an existing line for this exact listing.
    const existing = cart.items.find(
      (item) => item.listingId.toString() === dto.listingId,
    );

    const currentQty = existing?.quantity ?? 0;
    const newQty = currentQty + quantity;

    // 4. Rule 6 — never allow more than the seller has in stock.
    if (newQty > listing.stock) {
      throw new BadRequestException(
        `Only ${listing.stock} in stock for this seller (you already have ${currentQty} in your cart).`,
      );
    }

    // 5. Update the existing line, or push a new one.
    if (existing) {
      existing.quantity = newQty;
    } else {
      cart.items.push({
        listingId: new Types.ObjectId(dto.listingId),
        bookId: listing.bookId,
        sellerId: listing.sellerId,
        quantity,
        title: null, // display snapshots are filled lazily; live data wins on read
        coverImage: null,
        priceAtAdd: listing.price,
      });
    }

    await this.save(cart);
    return this.hydrate(cart);
  }

  /** Set the absolute quantity of an existing cart line (Rule 6 still applies). */
  async updateItem(
    customerId: string,
    listingId: string,
    quantity: number,
  ): Promise<HydratedCart> {
    const cart = await this.getOrCreateCart(customerId);
    const item = cart.items.find((i) => i.listingId.toString() === listingId);
    if (!item) {
      throw new NotFoundException('That item is not in your cart');
    }

    const listing = await this.getBuyableListingOrThrow(listingId);
    if (quantity > listing.stock) {
      throw new BadRequestException(`Only ${listing.stock} in stock for this seller.`);
    }

    item.quantity = quantity;
    await this.save(cart);
    return this.hydrate(cart);
  }

  /** Remove a single line from the cart. */
  async removeItem(customerId: string, listingId: string): Promise<HydratedCart> {
    const cart = await this.getOrCreateCart(customerId);
    const before = cart.items.length;
    cart.items = cart.items.filter((i) => i.listingId.toString() !== listingId);

    if (cart.items.length === before) {
      throw new NotFoundException('That item is not in your cart');
    }

    await this.save(cart);
    return this.hydrate(cart);
  }

  /** Empty the cart completely. */
  async clear(customerId: string): Promise<HydratedCart> {
    const cart = await this.getOrCreateCart(customerId);
    cart.items = [];
    await this.save(cart);
    return this.hydrate(cart);
  }

  // ──────────────────────────────────────────────────────────
  // INTERNAL HELPERS
  // ──────────────────────────────────────────────────────────

  /**
   * Fetch the customer's cart, creating an empty one on first use.
   * (A cart is normally created at registration, but this keeps us safe.)
   */
  private async getOrCreateCart(customerId: string): Promise<CartDocument> {
    try {
      const existing = await this.cartModel.findOne({ customerId }).exec();
      if (existing) return existing;
      return await this.cartModel.create({ customerId, items: [] });
    } catch (error) {
      this.logger.error(`Failed to load/create cart for ${customerId}`, error as Error);
      throw new InternalServerErrorException(MESSAGES.COMMON.INTERNAL_ERROR);
    }
  }

  /**
   * Load a listing and confirm it can actually be purchased:
   * the listing is ACTIVE, its book is APPROVED, and its seller is APPROVED.
   * Mirrors the catalog visibility rules (Rules 4/6/7).
   */
  private async getBuyableListingOrThrow(listingId: string): Promise<ListingDocument> {
    const listing = await this.listingModel.findById(listingId).exec();
    if (!listing || listing.status !== ListingStatus.ACTIVE) {
      throw new NotFoundException('This offer is no longer available');
    }

    const [book, seller] = await Promise.all([
      this.bookModel.findById(listing.bookId).select('status').lean().exec(),
      this.sellerModel.findById(listing.sellerId).select('status').lean().exec(),
    ]);

    if (!book || book.status !== BookStatus.APPROVED) {
      throw new BadRequestException('This book is not available for purchase');
    }
    if (!seller || seller.status !== SellerStatus.APPROVED) {
      throw new BadRequestException('This seller is not currently active');
    }

    return listing;
  }

  /** Persist the cart, wrapping DB errors in a friendly 500. */
  private async save(cart: CartDocument): Promise<void> {
    try {
      await cart.save();
    } catch (error) {
      this.logger.error('Failed to save cart', error as Error);
      throw new InternalServerErrorException(MESSAGES.COMMON.INTERNAL_ERROR);
    }
  }

  /**
   * Turn stored cart lines into client-ready items with LIVE price/stock.
   * Any line whose listing/book/seller has since become unavailable is
   * dropped automatically (self-healing cart).
   */
  private async hydrate(cart: CartDocument): Promise<HydratedCart> {
    if (cart.items.length === 0) {
      return { items: [], totalItems: 0, totalAmount: 0 };
    }

    const listingIds = cart.items.map((i) => i.listingId);

    // Load all listings + their books + sellers in as few queries as possible.
    const listings = await this.listingModel
      .find({ _id: { $in: listingIds }, status: ListingStatus.ACTIVE })
      .lean<ListingDocument[]>()
      .exec();

    const listingMap = new Map(listings.map((l) => [l._id.toString(), l]));
    const bookIds = listings.map((l) => l.bookId);
    const sellerIds = listings.map((l) => l.sellerId);

    const [books, sellers] = await Promise.all([
      this.bookModel.find({ _id: { $in: bookIds } }).lean<BookDocument[]>().exec(),
      this.sellerModel.find({ _id: { $in: sellerIds } }).lean<SellerProfileDocument[]>().exec(),
    ]);
    const bookMap = new Map(books.map((b) => [b._id.toString(), b]));
    const sellerMap = new Map(sellers.map((s) => [s._id.toString(), s]));

    const items: HydratedCartItem[] = [];
    let staleFound = false;

    for (const line of cart.items) {
      const listing = listingMap.get(line.listingId.toString());
      const book = listing ? bookMap.get(listing.bookId.toString()) : undefined;
      const seller = listing ? sellerMap.get(listing.sellerId.toString()) : undefined;

      // Drop lines that are no longer purchasable.
      if (!listing || !book || book.status !== BookStatus.APPROVED || !seller) {
        staleFound = true;
        continue;
      }

      // If a line exceeds current stock (seller reduced it), clamp it.
      const quantity = Math.min(line.quantity, listing.stock);
      if (quantity !== line.quantity) staleFound = true;
      if (quantity <= 0) {
        staleFound = true;
        continue;
      }

      items.push({
        listingId: listing._id.toString(),
        bookId: book._id.toString(),
        sellerId: seller._id.toString(),
        sellerName: seller.businessName,
        title: book.title,
        author: book.author,
        coverImage: book.coverImage,
        price: listing.price, // LIVE
        stock: listing.stock, // LIVE
        quantity,
        lineTotal: listing.price * quantity,
      });
    }

    // If we cleaned up stale/over-stock lines, persist the corrected cart.
    if (staleFound) {
      cart.items = items.map((i) => ({
        listingId: new Types.ObjectId(i.listingId),
        bookId: new Types.ObjectId(i.bookId),
        sellerId: new Types.ObjectId(i.sellerId),
        quantity: i.quantity,
        title: null,
        coverImage: null,
        priceAtAdd: i.price,
      }));
      await this.save(cart);
    }

    const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
    const totalAmount = items.reduce((sum, i) => sum + i.lineTotal, 0);
    return { items, totalItems, totalAmount };
  }
}
