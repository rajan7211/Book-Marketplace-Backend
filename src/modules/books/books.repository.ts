import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Book, BookDocument } from './schemas/book.schema';
import { BookStatus } from '../../common/enums';
import { Listing, ListingDocument } from '../listings/schemas/listing.schema';
import { ListingStatus } from '../../common/enums';
import { SellerStatus } from '../../common/enums';

@Injectable()
export class BooksRepository {
  constructor(
    @InjectModel(Book.name) private readonly model: Model<BookDocument>,
    @InjectModel(Listing.name) private readonly listingsModel: Model<ListingDocument>,
  ) {}

  async existsByIsbn(isbn: string): Promise<boolean> {
    const found = await this.model.exists({ isbn: isbn.toUpperCase() });
    return found !== null;
  }

  async create(input: {
    isbn: string;
    title: string;
    author: string;
    publisher: string;
    description: string;
    category: string;
    tags?: string[];
    submittedBy?: Types.ObjectId | null;
  }): Promise<BookDocument> {
    const [doc] = await this.model.create([
      {
        ...input,
        isbn: input.isbn.toUpperCase(),
        status: BookStatus.PENDING_APPROVAL,
        submittedBy: input.submittedBy ?? null,
      },
    ]);
    return doc;
  }

  async findById(id: string | Types.ObjectId): Promise<BookDocument | null> {
    return this.model.findById(id).exec();
  }

  /**
   * Public catalog browse.
   * Approved books only, with optional search/filter/sort.
   *
   * We do TWO queries:
   *   1. count for pagination metadata
   *   2. find with skip/limit for the actual page
   *
   * We use `.lean()` for performance (the catalog browse is high-traffic).
   * The TS cast is the standard pattern when mixing lean with strict typing.
   */
  async findAllApproved(query: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    tag?: string;
    sort?: 'newest' | 'title-asc' | 'title-desc' | 'price-asc' | 'price-desc';
  }): Promise<{ data: Record<string, unknown>[]; total: number }> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const match: Record<string, unknown> = { status: BookStatus.APPROVED };
    if (query.category && query.category !== 'All') {
      match.category = query.category;
    }
    if (query.tag) {
      match.tags = query.tag;
    }
    if (query.search && query.search.trim()) {
      match.$text = { $search: query.search.trim() };
    }

    let sortStage: Record<string, 1 | -1>;
    switch (query.sort) {
      case 'title-asc': sortStage = { title: 1 }; break;
      case 'title-desc': sortStage = { title: -1 }; break;
      default: sortStage = { createdAt: -1 }; break; // 'newest' or undefined
    }

    const [data, total] = await Promise.all([
      this.model
        .find(match)
        .sort(sortStage)
        .skip(skip)
        .limit(limit)
        .lean()
        .exec() as unknown as Promise<Record<string, unknown>[]>,
      this.model.countDocuments(match).exec(),
    ]);

    return { data, total };
  }

  async findApprovedById(id: string): Promise<BookDocument | null> {
    return this.model
      .findOne({ _id: id, status: BookStatus.APPROVED })
      .exec();
  }

  async findApprovedForSeller(): Promise<BookDocument[]> {
    return this.model
      .find({ status: BookStatus.APPROVED })
      .sort({ title: 1 })
      .lean()
      .exec() as unknown as BookDocument[];
  }

  async findByTag(tag: string, limit = 6): Promise<BookDocument[]> {
    return this.model
      .find({ status: BookStatus.APPROVED, tags: tag })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec() as unknown as BookDocument[];
  }

  async distinctCategories(): Promise<string[]> {
    const cats = await this.model.distinct('category', {
      status: BookStatus.APPROVED,
    });
    return (cats as string[]).sort((a, b) => a.localeCompare(b));
  }

  // ───── admin ─────

  async listForAdmin(query: {
    status?: BookStatus;
    page?: number;
    limit?: number;
  }): Promise<{ data: Record<string, unknown>[]; total: number }> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
    const skip = (page - 1) * limit;
    const filter = query.status ? { status: query.status } : {};

    const [data, total] = await Promise.all([
      this.model
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec() as unknown as Promise<Record<string, unknown>[]>,
      this.model.countDocuments(filter).exec(),
    ]);

    return { data, total };
  }

  async approve(id: string): Promise<BookDocument | null> {
    return this.model
      .findByIdAndUpdate(
        id,
        { $set: { status: BookStatus.APPROVED, approvedAt: new Date() } },
        { new: true },
      )
      .exec();
  }

  async reject(id: string): Promise<BookDocument | null> {
    return this.model
      .findByIdAndUpdate(id, { $set: { status: BookStatus.REJECTED } }, { new: true })
      .exec();
  }
}
