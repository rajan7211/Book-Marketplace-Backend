import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Book, BookDocument } from '../books/schemas/book.schema';
import { BookStatus, ListingStatus, SellerStatus } from '../../common/enums';
import { Listing, ListingDocument } from '../listings/schemas/listing.schema';
import { SellerProfile, SellerProfileDocument } from '../sellers/schemas/seller-profile.schema';
import { Category, CategoryDocument } from '../categories/schemas/category.schema';
import { AI_RETRIEVAL_LIMIT } from './ai.constants';

export interface RetrievedContext {
  /** Plaintext block fed to the LLM as the single source of truth. */
  context: string;
  /** False when nothing relevant was found (caller should say "unavailable"). */
  hasData: boolean;
}

interface PriceSummary {
  minPrice: number;
  maxMrp: number;
  totalStock: number;
  sellers: string[];
}

/**
 * Reads live marketplace data from MongoDB to ground the LLM answers (RAG).
 *
 * Only customer-visible records are queried:
 * - Books with status APPROVED (customers never see pending/rejected)
 * - Listings with status ACTIVE (price + inventory)
 * - SellerProfiles with status APPROVED
 * - Active categories
 */
@Injectable()
export class AiRetrievalService {
  private readonly logger = new Logger(AiRetrievalService.name);

  constructor(
    @InjectModel(Book.name) private readonly bookModel: Model<BookDocument>,
    @InjectModel(Listing.name) private readonly listingModel: Model<ListingDocument>,
    @InjectModel(SellerProfile.name)
    private readonly sellerModel: Model<SellerProfileDocument>,
    @InjectModel(Category.name) private readonly categoryModel: Model<CategoryDocument>,
  ) {}

  /**
   * Build a compact plaintext context block for `query`. Returns
   * `hasData: false` when no relevant records exist so the caller can avoid
   * hallucinating an answer.
   */
  async buildMarketplaceContext(query: string): Promise<RetrievedContext> {
    const q = (query || '').trim();
    const parts: string[] = [];

    // 1) Books (primary retrieval) — uses the existing `$text` index.
    const books = await this.searchBooks(q);
    if (books.length) {
      const priceMap = await this.getBookPrices(books.map((b) => b._id));
      for (const b of books) {
        const p = priceMap.get(b._id.toString());
        const priceLine = p
          ? `Price from ₹${p.minPrice} (MRP ₹${p.maxMrp}); ${p.totalStock} in stock; sold by: ${
              p.sellers.filter(Boolean).join(', ') || 'N/A'
            }.`
          : 'No active listings right now.';
        parts.push(
          `- "${b.title}" by ${b.author} (category: ${b.category}, ISBN: ${b.isbn}). ${priceLine}`,
        );
      }
    }

    // 2) Price / cheapest queries with no direct book match → aggregate listings.
    if (!books.length && /price|cost|cheap|expensive|₹|rs\.|affordable|lowest|highest/i.test(q)) {
      const cheap = await this.getCheapestBooks(3);
      for (const c of cheap) {
        parts.push(
          `- "${c.title}" by ${c.author}: from ₹${c.minPrice} (MRP ₹${c.maxMrp}), ${c.totalStock} in stock.`,
        );
      }
    }

    // 3) Categories — when asked, or as a fallback if no books matched.
    if (/categor|genre|type of book|subject|what (do|books) you (have|sell)/i.test(q) || !books.length) {
      const categories = await this.getCategories();
      if (categories.length) parts.push(`Available categories: ${categories.join(', ')}.`);
    }

    // 4) Sellers — when asked, or as a fallback if no books matched.
    if (/seller|shop|store|vendor|who (sells|published|wrote)/i.test(q) || !books.length) {
      const sellers = await this.searchSellers(q);
      if (sellers.length) {
        parts.push(
          `Sellers on the marketplace: ${sellers
            .map((s) => `${s.businessName} (${s.email})`)
            .join('; ')}.`,
        );
      }
    }

    const context = parts.join('\n');
    return { context, hasData: context.trim().length > 0 };
  }

  private async searchBooks(q: string): Promise<BookDocument[]> {
    const filter: Record<string, unknown> = { status: BookStatus.APPROVED };
    if (q) filter.$text = { $search: q };
    return this.bookModel
      .find(filter)
      .limit(AI_RETRIEVAL_LIMIT)
      .select('title author category isbn')
      .lean() as unknown as Promise<BookDocument[]>;
  }

  /** Min price / MRP / stock / sellers per book, joined from ACTIVE listings. */
  private async getBookPrices(bookIds: Types.ObjectId[]): Promise<Map<string, PriceSummary>> {
    const map = new Map<string, PriceSummary>();
    if (!bookIds.length) return map;
    const rows = (await this.listingModel.aggregate([
      { $match: { bookId: { $in: bookIds }, status: ListingStatus.ACTIVE } },
      {
        $lookup: {
          from: 'seller_profiles',
          localField: 'sellerId',
          foreignField: '_id',
          as: 'seller',
        },
      },
      { $unwind: { path: '$seller', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$bookId',
          minPrice: { $min: '$price' },
          maxMrp: { $max: '$mrp' },
          totalStock: { $sum: '$stock' },
          sellers: { $addToSet: '$seller.businessName' },
        },
      },
    ])) as unknown as Array<{
      _id: Types.ObjectId;
      minPrice: number;
      maxMrp: number;
      totalStock: number;
      sellers: string[];
    }>;

    for (const r of rows) {
      map.set(r._id.toString(), {
        minPrice: r.minPrice,
        maxMrp: r.maxMrp,
        totalStock: r.totalStock,
        sellers: (r.sellers || []).filter(Boolean),
      });
    }
    return map;
  }

  /** Cheapest approved books (for "cheapest / lowest price" style questions). */
  private async getCheapestBooks(
    n: number,
  ): Promise<Array<{ title: string; author: string; minPrice: number; maxMrp: number; totalStock: number }>> {
    const rows = (await this.listingModel.aggregate([
      { $match: { status: ListingStatus.ACTIVE } },
      {
        $group: {
          _id: '$bookId',
          minPrice: { $min: '$price' },
          maxMrp: { $max: '$mrp' },
          totalStock: { $sum: '$stock' },
        },
      },
      { $sort: { minPrice: 1 } },
      { $limit: n },
      {
        $lookup: { from: 'books', localField: '_id', foreignField: '_id', as: 'book' },
      },
      { $unwind: { path: '$book', preserveNullAndEmptyArrays: true } },
      { $match: { 'book.status': BookStatus.APPROVED } },
      {
        $project: {
          title: '$book.title',
          author: '$book.author',
          minPrice: 1,
          maxMrp: 1,
          totalStock: 1,
        },
      },
    ])) as unknown as Array<{
      title?: string;
      author?: string;
      minPrice: number;
      maxMrp: number;
      totalStock: number;
    }>;

    return rows.filter((r) => r.title).map((r) => ({
      title: r.title!,
      author: r.author!,
      minPrice: r.minPrice,
      maxMrp: r.maxMrp,
      totalStock: r.totalStock,
    }));
  }

  private async getCategories(): Promise<string[]> {
    const docs = (await this.categoryModel
      .find({ isActive: true })
      .select('name')
      .lean()) as unknown as Array<{ name: string }>;
    return docs.map((c) => c.name).sort((a, b) => a.localeCompare(b));
  }

  private async searchSellers(q: string): Promise<SellerProfileDocument[]> {
    const filter: Record<string, unknown> = { status: SellerStatus.APPROVED };
    if (q) filter.businessName = { $regex: q, $options: 'i' };
    return this.sellerModel
      .find(filter)
      .limit(AI_RETRIEVAL_LIMIT)
      .select('businessName email')
      .lean() as unknown as Promise<SellerProfileDocument[]>;
  }
}