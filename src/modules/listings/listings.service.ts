import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Listing, ListingDocument } from './schemas/listing.schema';
import { ListingStatus } from '../../common/enums';

/**
 * Phase 5 slice: read helpers used by the catalog.
 * Full seller listing CRUD (create/update/inventory) is added in Phase 11.
 */
@Injectable()
export class ListingsService {
  constructor(
    @InjectModel(Listing.name) private readonly model: Model<ListingDocument>,
  ) {}

  async existsForBook(bookId: string | Types.ObjectId): Promise<boolean> {
    const found = await this.model.exists({ bookId, status: ListingStatus.ACTIVE });
    return found !== null;
  }

  /** All ACTIVE listings for a single book (used on the book-detail page). */
  async findActiveByBook(bookId: string | Types.ObjectId): Promise<ListingDocument[]> {
    return this.model
      .find({ bookId, status: ListingStatus.ACTIVE })
      .sort({ price: 1 })
      .lean<ListingDocument[]>()
      .exec();
  }

  async countAll(): Promise<number> {
    return this.model.countDocuments().exec();
  }
}
