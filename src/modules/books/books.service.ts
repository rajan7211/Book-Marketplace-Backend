import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage, Types } from 'mongoose';
import { createHash } from 'crypto';
import { Book, BookDocument } from './schemas/book.schema';
import { CreateBookDto, BookQueryDto } from './dto';
import { BookStatus, ListingStatus, SellerStatus } from '../../common/enums';
import { MESSAGES, CacheKeys, CacheTTL } from '../../common/constants';
import { RedisService } from '../../infra/redis/redis.service';
import { resolvePagination, paginate, buildMeta } from '../../common/utils';
import { PaginatedResult } from '../../common/interfaces';

@Injectable()
export class BooksService {
  constructor(
    @InjectModel(Book.name) private readonly model: Model<BookDocument>,
    private readonly redis: RedisService,
  ) {}

  // ───────────────────── seller: submit a new book ─────────────────────

  /**
   * Scenario B: seller submits a NEW book.
   * Rule 1: duplicate ISBN rejected. Rule 2: starts PENDING_APPROVAL.
   */
  async create(dto: CreateBookDto, sellerId?: string): Promise<BookDocument> {
    const isbn = dto.isbn.toUpperCase();
    const exists = await this.model.exists({ isbn });
    if (exists) {
      throw new ConflictException(MESSAGES.BOOK.DUPLICATE_ISBN);
    }
    const book = await this.model.create({
      ...dto,
      isbn,
      status: BookStatus.PENDING_APPROVAL,
      submittedBy: sellerId ? new Types.ObjectId(sellerId) : null,
    });
    await this.bumpCatalogVersion();
    return book;
  }

  // ───────────────────── public catalog ─────────────────────

  /**
   * Paginated, searchable, sortable catalog.
   * Mirrors the frontend booksApi.getBooks + attachListings:
   *  - Rule 3: only APPROVED books
   *  - Rule 4/6/7: attach ACTIVE listings from APPROVED sellers only
   *  - compute minPrice / maxMrp
   *  - 5 sort options (price sort needs the listing join)
   * Cache-aside with a versioned key.
   */
  async findAll(query: BookQueryDto): Promise<PaginatedResult<Record<string, unknown>>> {
    const version = await this.getCatalogVersion();
    const cacheKey = CacheKeys.catalogList(version, this.hashQuery(query));
    const cached = await this.redis.get<PaginatedResult<Record<string, unknown>>>(cacheKey);
    if (cached) return cached;

    const { page, limit, skip } = resolvePagination(query);

    const match: Record<string, unknown> = { status: BookStatus.APPROVED };
    if (query.category && query.category !== 'All') match.category = query.category;
    if (query.tag) match.tags = query.tag;
    if (query.search?.trim()) {
      match.$text = { $search: query.search.trim() };
    }

    const sortStage = this.buildSort(query.sort);

    // Pipeline: match -> join active listings of approved sellers ->
    // compute minPrice/maxMrp -> sort -> paginate.
    const listingLookup: PipelineStage[] = [
      {
        $lookup: {
          from: 'listings',
          let: { bookId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$bookId', '$$bookId'] },
                status: ListingStatus.ACTIVE,
              },
            },
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
          ],
          as: 'listings',
        },
      },
      {
        $addFields: {
          minPrice: { $min: '$listings.price' },
          maxMrp: { $max: '$listings.mrp' },
        },
      },
    ];

    const pipeline: PipelineStage[] = [
      { $match: match },
      ...listingLookup,
      {
        $facet: {
          data: [{ $sort: sortStage }, { $skip: skip }, { $limit: limit }],
          totalCount: [{ $count: 'count' }],
        },
      },
    ];

    const [result] = await this.model.aggregate(pipeline).exec();
    const data = (result?.data ?? []) as Record<string, unknown>[];
    const total = (result?.totalCount?.[0]?.count ?? 0) as number;

    const payload = paginate(data, page, limit, total);
    await this.redis.set(cacheKey, payload, CacheTTL.CATALOG_LIST);
    return payload;
  }

  /** Homepage rows by tag (bestseller / trending / new-releases). */
  async findByTag(tag: string, limit = 6): Promise<Record<string, unknown>[]> {
    const result = await this.findAll({ tag, limit, page: 1, sort: 'newest' });
    return result.data;
  }

  /** Book detail + its active listings from approved sellers. */
  async findOnePublic(id: string): Promise<Record<string, unknown>> {
    const cacheKey = CacheKeys.bookDetail(id);
    const cached = await this.redis.get<Record<string, unknown>>(cacheKey);
    if (cached) return cached;

    const [book] = await this.model
      .aggregate([
        { $match: { _id: new Types.ObjectId(id), status: BookStatus.APPROVED } },
        {
          $lookup: {
            from: 'listings',
            let: { bookId: '$_id' },
            pipeline: [
              { $match: { $expr: { $eq: ['$bookId', '$$bookId'] }, status: ListingStatus.ACTIVE } },
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
              {
                $project: {
                  price: 1,
                  mrp: 1,
                  stock: 1,
                  sellerId: 1,
                  sellerName: '$seller.businessName',
                },
              },
              { $sort: { price: 1 } },
            ],
            as: 'listings',
          },
        },
        {
          $addFields: {
            minPrice: { $min: '$listings.price' },
            maxMrp: { $max: '$listings.mrp' },
          },
        },
      ])
      .exec();

    if (!book) throw new NotFoundException(MESSAGES.COMMON.NOT_FOUND);
    await this.redis.set(cacheKey, book, CacheTTL.BOOK_DETAIL);
    return book as Record<string, unknown>;
  }

  /** Distinct categories among approved books (replaces FE getCategories). */
  async getCategories(): Promise<string[]> {
    const cached = await this.redis.get<string[]>(CacheKeys.categories());
    if (cached) return cached;
    const cats = await this.model.distinct('category', { status: BookStatus.APPROVED }).exec();
    const sorted = (cats as string[]).sort((a, b) => a.localeCompare(b));
    await this.redis.set(CacheKeys.categories(), sorted, CacheTTL.CATEGORIES);
    return sorted;
  }

  /** Approved books a seller can list against (Scenario A). */
  async findApproved(): Promise<BookDocument[]> {
    return this.model
      .find({ status: BookStatus.APPROVED })
      .sort({ title: 1 })
      .lean<BookDocument[]>()
      .exec();
  }

  // admin

  async listForAdmin(query: {
    status?: BookStatus;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResult<BookDocument>> {
    const { page, limit, skip } = resolvePagination(query);
    const filter = query.status ? { status: query.status } : {};
    const [data, total] = await Promise.all([
      this.model.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean<BookDocument[]>().exec(),
      this.model.countDocuments(filter).exec(),
    ]);
    return { data, meta: buildMeta(page, limit, total) };
  }

  async approve(id: string): Promise<BookDocument> {
    const book = await this.getByIdOrThrow(id);
    if (book.status === BookStatus.APPROVED) {
      throw new BadRequestException('Book is already approved');
    }
    book.status = BookStatus.APPROVED;
    book.approvedAt = new Date();
    await book.save();
    await this.invalidateBook(id);
    return book;
  }

  async reject(id: string): Promise<BookDocument> {
    const book = await this.getByIdOrThrow(id);
    book.status = BookStatus.REJECTED;
    await book.save();
    await this.invalidateBook(id);
    return book;
  }

  async getByIdOrThrow(id: string): Promise<BookDocument> {
    const book = await this.model.findById(id).exec();
    if (!book) throw new NotFoundException(MESSAGES.COMMON.NOT_FOUND);
    return book;
  }

  async countAll(): Promise<number> {
    return this.model.countDocuments().exec();
  }

  async countByStatus(status: BookStatus): Promise<number> {
    return this.model.countDocuments({ status }).exec();
  }

  // ───────────────────── helpers ─────────────────────

  private buildSort(sort?: string): Record<string, 1 | -1> {
    switch (sort) {
      case 'title-asc':
        return { title: 1 };
      case 'title-desc':
        return { title: -1 };
      case 'price-asc':
        return { minPrice: 1, createdAt: -1 };
      case 'price-desc':
        return { minPrice: -1, createdAt: -1 };
      case 'newest':
      default:
        return { createdAt: -1 };
    }
  }

  private hashQuery(q: BookQueryDto): string {
    return createHash('sha1').update(JSON.stringify(q)).digest('hex').slice(0, 16);
  }

  private async getCatalogVersion(): Promise<number> {
    const v = await this.redis.get<number>(CacheKeys.catalogVersion());
    return v ?? 1;
  }

  private async bumpCatalogVersion(): Promise<void> {
    if (!this.redis.enabled) return;
    const v = await this.redis.incr(CacheKeys.catalogVersion());
    if (v === 0) await this.redis.set(CacheKeys.catalogVersion(), 2);
  }

  private async invalidateBook(id: string): Promise<void> {
    await this.redis.del(CacheKeys.bookDetail(id), CacheKeys.categories());
    await this.bumpCatalogVersion();
  }
}
