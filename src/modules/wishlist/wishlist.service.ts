import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Wishlist, WishlistDocument } from './schemas/wishlist.schema';
import { Book, BookDocument } from '../books/schemas/book.schema';
import { Listing, ListingDocument } from '../listings/schemas/listing.schema';
import { SellerProfile, SellerProfileDocument } from '../sellers/schemas/seller-profile.schema';
import { BookStatus, ListingStatus, SellerStatus } from '../../common/enums';
import { MESSAGES } from '../../common/constants';

/** A wishlist row as returned to the client (hydrated with live catalog data). */
interface HydratedWishlistItem {
  bookId: string;
  title: string;
  author: string;
  coverImage: string;
  category: string;
  minPrice: number | null; // lowest current price from approved sellers, or null if unavailable
  addedAt: Date;
}

interface HydratedWishlist {
  items: HydratedWishlistItem[];
  count: number;
}

@Injectable()
export class WishlistService {
  private readonly logger = new Logger(WishlistService.name);

  constructor(
    @InjectModel(Wishlist.name) private readonly wishlistModel: Model<WishlistDocument>,
    @InjectModel(Book.name) private readonly bookModel: Model<BookDocument>,
    @InjectModel(Listing.name) private readonly listingModel: Model<ListingDocument>,
    @InjectModel(SellerProfile.name)
    private readonly sellerModel: Model<SellerProfileDocument>,
  ) {}

  // ──────────────────────────────────────────────────────────
  // PUBLIC API
  // ──────────────────────────────────────────────────────────

  /** Return the customer's wishlist, hydrated with live catalog info. */
  async getWishlist(customerId: string): Promise<HydratedWishlist> {
    const wishlist = await this.getOrCreate(customerId);
    return this.hydrate(wishlist);
  }

  /**
   * Add a book to the wishlist.
   * Idempotent: adding a book that is already there is a harmless no-op
   * (we never throw "already in wishlist").
   */
  async addBook(customerId: string, bookId: string): Promise<HydratedWishlist> {
    // The book must exist and be approved to be wishlisted.
    const book = await this.bookModel.findById(bookId).select('status').lean().exec();
    if (!book) {
      throw new NotFoundException(MESSAGES.COMMON.NOT_FOUND);
    }
    if (book.status !== BookStatus.APPROVED) {
      throw new BadRequestException('This book is not available');
    }

    const wishlist = await this.getOrCreate(customerId);

    const already = wishlist.items.some((i) => i.bookId.toString() === bookId);
    if (!already) {
      wishlist.items.push({ bookId: new Types.ObjectId(bookId), addedAt: new Date() });
      await this.save(wishlist);
    }

    return this.hydrate(wishlist);
  }

  /**
   * Remove a book from the wishlist.
   * Idempotent: removing a book that isn't there simply returns the
   * (unchanged) wishlist instead of erroring.
   */
  async removeBook(customerId: string, bookId: string): Promise<HydratedWishlist> {
    const wishlist = await this.getOrCreate(customerId);
    wishlist.items = wishlist.items.filter((i) => i.bookId.toString() !== bookId);
    await this.save(wishlist);
    return this.hydrate(wishlist);
  }

  // ──────────────────────────────────────────────────────────
  // INTERNAL HELPERS
  // ──────────────────────────────────────────────────────────

  /** Fetch the customer's wishlist, creating an empty one on first use. */
  private async getOrCreate(customerId: string): Promise<WishlistDocument> {
    try {
      const existing = await this.wishlistModel.findOne({ customerId }).exec();
      if (existing) return existing;
      return await this.wishlistModel.create({ customerId, items: [] });
    } catch (error) {
      this.logger.error(`Failed to load/create wishlist for ${customerId}`, error as Error);
      throw new InternalServerErrorException(MESSAGES.COMMON.INTERNAL_ERROR);
    }
  }

  /** Persist the wishlist, wrapping DB errors in a friendly 500. */
  private async save(wishlist: WishlistDocument): Promise<void> {
    try {
      await wishlist.save();
    } catch (error) {
      this.logger.error('Failed to save wishlist', error as Error);
      throw new InternalServerErrorException(MESSAGES.COMMON.INTERNAL_ERROR);
    }
  }

  /**
   * Turn stored book references into client-ready rows with live data.
   * - Only APPROVED books are shown; books that became unapproved/deleted
   *   are dropped automatically (self-healing wishlist).
   * - minPrice = lowest price among ACTIVE listings from APPROVED sellers,
   *   or null when the book has no buyable offer right now.
   */
  private async hydrate(wishlist: WishlistDocument): Promise<HydratedWishlist> {
    if (wishlist.items.length === 0) {
      return { items: [], count: 0 };
    }

    const bookIds = wishlist.items.map((i) => i.bookId);

    // 1. Load only the approved books referenced by the wishlist.
    const books = await this.bookModel
      .find({ _id: { $in: bookIds }, status: BookStatus.APPROVED })
      .lean<BookDocument[]>()
      .exec();
    const bookMap = new Map(books.map((b) => [b._id.toString(), b]));

    // 2. Compute the minimum price per book from approved sellers' active listings.
    const minPriceMap = await this.buildMinPriceMap(books.map((b) => b._id));

    // 3. Build rows in the original (newest-added) order; drop stale ones.
    const items: HydratedWishlistItem[] = [];
    let staleFound = false;

    for (const ref of wishlist.items) {
      const book = bookMap.get(ref.bookId.toString());
      if (!book) {
        staleFound = true; // book no longer approved/exists -> drop
        continue;
      }
      items.push({
        bookId: book._id.toString(),
        title: book.title,
        author: book.author,
        coverImage: book.coverImage,
        category: book.category,
        minPrice: minPriceMap.get(book._id.toString()) ?? null,
        addedAt: ref.addedAt,
      });
    }

    // 4. If we removed stale entries, persist the cleaned wishlist.
    if (staleFound) {
      wishlist.items = items.map((i) => ({
        bookId: new Types.ObjectId(i.bookId),
        addedAt: i.addedAt,
      }));
      await this.save(wishlist);
    }

    return { items, count: items.length };
  }

  /**
   * For the given book ids, return a map of bookId -> lowest active price
   * (only counting listings whose seller is APPROVED). Uses one aggregation.
   */
  private async buildMinPriceMap(
    bookIds: Types.ObjectId[],
  ): Promise<Map<string, number>> {
    if (bookIds.length === 0) return new Map();

    const rows = await this.listingModel
      .aggregate<{ _id: Types.ObjectId; minPrice: number }>([
        { $match: { bookId: { $in: bookIds }, status: ListingStatus.ACTIVE } },
        {
          $lookup: {
            from: 'seller_profiles',
            localField: 'sellerId',
            foreignField: '_id',
            as: 'seller',
          },
        },
        { $unwind: '$seller' },
        { $match: { 'seller.status': SellerStatus.APPROVED } },
        { $group: { _id: '$bookId', minPrice: { $min: '$price' } } },
      ])
      .exec();

    return new Map(rows.map((r) => [r._id.toString(), r.minPrice]));
  }
}
