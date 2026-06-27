import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { WishlistRepository } from './wishlist.repository';
import { Wishlist, WishlistDocument } from './schemas/wishlist.schema';
import { Book, BookDocument } from '../books/schemas/book.schema';
import { Listing, ListingDocument } from '../listings/schemas/listing.schema';
import { BookStatus, ListingStatus } from '../../common/enums';

interface HydratedWishlistItem {
  bookId: string;
  title: string;
  coverImage: string;
  category: string;
  minPrice: number | null; // lowest active price from any seller
  addedAt: Date;
}

interface HydratedWishlist {
  items: HydratedWishlistItem[];
  count: number;
}

@Injectable()
export class WishlistService {
  constructor(
    private readonly repo: WishlistRepository,
    @InjectModel(Book.name) private readonly bookModel: Model<BookDocument>,
    @InjectModel(Listing.name) private readonly listingModel: Model<ListingDocument>,
  ) {}

  async getWishlist(
    customerId: Types.ObjectId,
  ): Promise<HydratedWishlist> {
    const wishlist = await this.getOrCreate(customerId);
    return this.hydrate(wishlist);
  }

  /**
   * Add a book to the wishlist. Idempotent — adding a book that's already there
   * is a no-op (we don't throw, just return).
   */
  async addBook(
    customerId: Types.ObjectId,
    bookId: string,
  ): Promise<HydratedWishlist> {
    // Book must exist AND be APPROVED (else the customer can't buy it later).
    const book = await this.bookModel.findById(bookId).select('status').lean().exec();
    if (!book) {
      throw new BadRequestException('Book not found');
    }
    const bookStatus = (book as { status: string }).status;
    if (bookStatus !== BookStatus.APPROVED) {
      throw new BadRequestException('This book is not available');
    }

    const wishlist = await this.getOrCreate(customerId);

    const already = wishlist.items.some(
      (item) => item.bookId.toString() === bookId,
    );
    if (!already) {
      wishlist.items.push({
        bookId: new Types.ObjectId(bookId),
        addedAt: new Date(),
      });
      await this.repo.save(wishlist);
    }
    return this.hydrate(wishlist);
  }

  /**
   * Remove a book from the wishlist. Idempotent — removing a book that's not
   * there is a no-op.
   */
  async removeBook(
    customerId: Types.ObjectId,
    bookId: string,
  ): Promise<HydratedWishlist> {
    const wishlist = await this.getOrCreate(customerId);
    wishlist.items = wishlist.items.filter(
      (item) => item.bookId.toString() !== bookId,
    );
    await this.repo.save(wishlist);
    return this.hydrate(wishlist);
  }

  // ───────────────────── internal helpers ─────────────────────

  /** Lazy create: a customer might GET /wishlist before adding anything. */
  private async getOrCreate(
    customerId: Types.ObjectId,
  ): Promise<WishlistDocument> {
    let wishlist = await this.repo.findByCustomerId(customerId);
    if (!wishlist) wishlist = await this.repo.create(customerId);
    return wishlist;
  }

  /**
   * Hydrate with book info + lowest current price from any active listing.
   * Drops books that are no longer approved (self-healing).
   */
  private async hydrate(
    wishlist: WishlistDocument,
  ): Promise<HydratedWishlist> {
    if (wishlist.items.length === 0) {
      return { items: [], count: 0 };
    }

    const bookIds = wishlist.items.map((i) => i.bookId);

    // 1. Approved books only.
    const books = await this.bookModel
      .find({ _id: { $in: bookIds }, status: BookStatus.APPROVED })
      .lean()
      .exec() as unknown as Array<{
        _id: { toString(): string };
        title: string;
        coverImage: string;
        category: string;
      }>;
    const bookMap = new Map(books.map((b) => [b._id.toString(), b]));

    // 2. One aggregation → minimum active price per book.
    const priceRows = await this.listingModel
      .aggregate<{ _id: Types.ObjectId; minPrice: number }>([
        {
          $match: {
            bookId: { $in: bookIds },
            status: ListingStatus.ACTIVE,
          },
        },
        { $group: { _id: '$bookId', minPrice: { $min: '$price' } } },
      ])
      .exec();
    const priceMap = new Map(
      priceRows.map((r) => [r._id.toString(), r.minPrice]),
    );

    // 3. Build items in original order; drop books that aren't approved anymore.
    const items: HydratedWishlistItem[] = [];
    let staleFound = false;

    for (const ref of wishlist.items) {
      const book = bookMap.get(ref.bookId.toString());
      if (!book) {
        staleFound = true;
        continue;
      }
      items.push({
        bookId: book._id.toString(),
        title: book.title,
        coverImage: book.coverImage ?? '',
        category: book.category,
        minPrice: priceMap.get(book._id.toString()) ?? null,
        addedAt: ref.addedAt,
      });
    }

    if (staleFound) {
      wishlist.items = items.map((i) => ({
        bookId: new Types.ObjectId(i.bookId),
        addedAt: i.addedAt,
      }));
      await this.repo.save(wishlist);
    }

    return { items, count: items.length };
  }
}
