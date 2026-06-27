import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CartRepository } from './cart.repository';
import { Cart, CartDocument } from './schemas/cart.schema';
import { Listing, ListingDocument } from '../listings/schemas/listing.schema';
import { ListingStatus } from '../../common/enums';
import { Book, BookDocument } from '../books/schemas/book.schema';
import { BookStatus } from '../../common/enums';
import {
  SellerProfile,
  SellerProfileDocument,
} from '../sellers/schemas/seller-profile.schema';
import { SellerStatus } from '../../common/enums';

interface HydratedCartItem {
  listingId: string;
  bookId: string;
  sellerId: string;
  sellerName: string;
  title: string;
  coverImage: string;
  price: number;
  stock: number;
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
  constructor(
    private readonly repo: CartRepository,
    @InjectModel(Listing.name)
    private readonly listingModel: Model<ListingDocument>,
    @InjectModel(Book.name)
    private readonly bookModel: Model<BookDocument>,
    @InjectModel(SellerProfile.name)
    private readonly sellerModel: Model<SellerProfileDocument>,
  ) {}

  // ───────────────────── PUBLIC API ─────────────────────

  async getCart(customerId: Types.ObjectId): Promise<HydratedCart> {
    const cart = await this.getOrCreateCart(customerId);
    return this.hydrate(cart);
  }

  async addItem(
    customerId: Types.ObjectId,
    listingId: string,
    quantity: number,
  ): Promise<HydratedCart> {
    const listing = await this.getBuyableListingOrThrow(listingId);
    const cart = await this.getOrCreateCart(customerId);

    const existing = cart.items.find(
      (item) => item.listingId.toString() === listingId,
    );

    const currentQty = existing?.quantity ?? 0;
    const newQty = currentQty + quantity;

    if (newQty > listing.stock) {
      throw new BadRequestException(
        `Only ${listing.stock} in stock for this seller (you already have ${currentQty} in your cart).`,
      );
    }

    if (existing) {
      existing.quantity = newQty;
    } else {
      cart.items.push({
        listingId: new Types.ObjectId(listingId),
        bookId: listing.bookId,
        sellerId: listing.sellerId,
        quantity,
        title: null,
        coverImage: null,
        priceAtAdd: listing.price,
      });
    }

    await this.repo.save(cart);
    return this.hydrate(cart);
  }

  async updateItem(
    customerId: Types.ObjectId,
    listingId: string,
    quantity: number,
  ): Promise<HydratedCart> {
    const cart = await this.getOrCreateCart(customerId);
    const item = cart.items.find(
      (i) => i.listingId.toString() === listingId,
    );
    if (!item) {
      throw new NotFoundException('That item is not in your cart');
    }

    const listing = await this.getBuyableListingOrThrow(listingId);
    if (quantity > listing.stock) {
      throw new BadRequestException(
        `Only ${listing.stock} in stock for this seller.`,
      );
    }

    item.quantity = quantity;
    await this.repo.save(cart);
    return this.hydrate(cart);
  }

  async removeItem(
    customerId: Types.ObjectId,
    listingId: string,
  ): Promise<HydratedCart> {
    const cart = await this.getOrCreateCart(customerId);
    const before = cart.items.length;
    cart.items = cart.items.filter(
      (i) => i.listingId.toString() !== listingId,
    );
    if (cart.items.length === before) {
      throw new NotFoundException('That item is not in your cart');
    }
    await this.repo.save(cart);
    return this.hydrate(cart);
  }

  async clear(customerId: Types.ObjectId): Promise<HydratedCart> {
    const cart = await this.getOrCreateCart(customerId);
    await this.repo.clear(cart);
    return this.hydrate(cart);
  }

  // ───────────────────── INTERNAL HELPERS ─────────────────────

  /**
   * Lazy create: a customer might GET /cart before ever adding an item.
   * Always return a valid cart document.
   */
  private async getOrCreateCart(
    customerId: Types.ObjectId,
  ): Promise<CartDocument> {
    let cart = await this.repo.findByCustomerId(customerId);
    if (!cart) cart = await this.repo.create(customerId);
    return cart;
  }

  /**
   * Verifies a listing can be purchased right now:
   *   - listing.status === ACTIVE
   *   - book.status === APPROVED
   *   - seller.status === APPROVED
   * Throws 400/404 if any condition fails.
   */
  private async getBuyableListingOrThrow(
    listingId: string,
  ): Promise<ListingDocument> {
    const listing = await this.listingModel.findById(listingId).exec();
    if (!listing || listing.status !== ListingStatus.ACTIVE) {
      throw new NotFoundException('This offer is no longer available');
    }

    const [book, seller] = await Promise.all([
      this.bookModel
        .findById(listing.bookId)
        .select('status')
        .lean()
        .exec() as unknown as { status: string } | null,
      this.sellerModel
        .findById(listing.sellerId)
        .select('status')
        .lean()
        .exec() as unknown as { status: string } | null,
    ]);

    if (!book || book.status !== BookStatus.APPROVED) {
      throw new BadRequestException(
        'This book is not available for purchase',
      );
    }
    if (!seller || seller.status !== SellerStatus.APPROVED) {
      throw new BadRequestException(
        'This seller is not currently active',
      );
    }

    return listing;
  }

  /**
   * Hydrate the cart with LIVE data from listings/books/sellers.
   *   - Drops stale lines (listing INACTIVE, book not APPROVED, etc.)
   *   - Clamps quantity if it exceeds current stock
   *   - Persists corrections back to the DB
   *
   * This runs on EVERY cart GET so the customer always sees truth.
   */
  private async hydrate(cart: CartDocument): Promise<HydratedCart> {
    if (cart.items.length === 0) {
      return { items: [], totalItems: 0, totalAmount: 0 };
    }

    const listingIds = cart.items.map((i) => i.listingId);

    // Fetch ACTIVE listings matching our cart lines, plus their books and sellers.
    const listings = await this.listingModel
      .find({ _id: { $in: listingIds }, status: ListingStatus.ACTIVE })
      .lean()
      .exec() as unknown as Array<{
        _id: { toString(): string };
        bookId: { toString(): string };
        sellerId: { toString(): string };
        price: number;
        stock: number;
      }>;

    const listingMap = new Map(
      listings.map((l) => [l._id.toString(), l]),
    );

    const bookIds = listings.map((l) => l.bookId);
    const sellerIds = listings.map((l) => l.sellerId);

    const [books, sellers] = await Promise.all([
      this.bookModel
        .find({ _id: { $in: bookIds } })
        .lean()
        .exec() as unknown as Promise<Array<{
          _id: { toString(): string };
          title: string;
          coverImage: string;
          status: string;
        }>>,
      this.sellerModel
        .find({ _id: { $in: sellerIds } })
        .lean()
        .exec() as unknown as Promise<Array<{
          _id: { toString(): string };
          businessName: string;
          status: string;
        }>>,
    ]);

    const bookMap = new Map(books.map((b) => [b._id.toString(), b]));
    const sellerMap = new Map(sellers.map((s) => [s._id.toString(), s]));

    const items: HydratedCartItem[] = [];
    let staleFound = false;

    for (const line of cart.items) {
      const listing = listingMap.get(line.listingId.toString());
      const book = listing
        ? bookMap.get(listing.bookId.toString())
        : undefined;
      const seller = listing
        ? sellerMap.get(listing.sellerId.toString())
        : undefined;

      // Drop the line if anything along the chain is no longer valid.
      if (
        !listing ||
        !book || book.status !== BookStatus.APPROVED ||
        !seller || seller.status !== SellerStatus.APPROVED
      ) {
        staleFound = true;
        continue;
      }

      // Clamp quantity to current stock.
      const stock = listing.stock;
      const quantity = Math.min(line.quantity, stock);
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
        coverImage: book.coverImage ?? '',
        price: listing.price,
        stock,
        quantity,
        lineTotal: listing.price * quantity,
      });
    }

    // If we dropped or clamped anything, persist the corrected cart.
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
      await this.repo.save(cart);
    }

    const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
    const totalAmount = items.reduce((sum, i) => sum + i.lineTotal, 0);
    return { items, totalItems, totalAmount };
  }
}
