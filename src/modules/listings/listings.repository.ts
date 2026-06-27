import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Listing, ListingDocument } from './schemas/listing.schema';
import { ListingStatus } from '../../common/enums';
@Injectable()
export class ListingsRepository {
  constructor(
    @InjectModel(Listing.name) private readonly model: Model<ListingDocument>,
  ) {}

  async findById(id: string | Types.ObjectId): Promise<ListingDocument | null> {
    return this.model.findById(id).exec();
  }

  async findBySellerAndBook(
    sellerId: Types.ObjectId,
    bookId: Types.ObjectId,
  ): Promise<ListingDocument | null> {
    return this.model.findOne({ sellerId, bookId }).exec();
  }

  /**
   * Insert a new listing. The unique compound index on (sellerId, bookId)
   * will throw a Mongo duplicate-key error if Rule 10 is violated.
   * We let that bubble up as 409 ConflictException in the service.
   */
  async create(input: {
    bookId: Types.ObjectId;
    sellerId: Types.ObjectId;
    price: number;
    mrp: number;
    stock: number;
  }): Promise<ListingDocument> {
    const [doc] = await this.model.create([
      { ...input, status: ListingStatus.ACTIVE },
    ]);
    return doc;
  }

  async listBySeller(sellerId: Types.ObjectId): Promise<ListingDocument[]> {
    return this.model
      .find({ sellerId })
      .sort({ createdAt: -1 })
      .lean()
      .exec() as unknown as ListingDocument[];
  }

  /**
   * Update with ownership enforced at the DB level.
   * If the listingId belongs to a different seller, findOneAndUpdate
   * returns null (we don't tell the caller why — prevents enumeration).
   */
  async updateOwned(
    id: string,
    sellerId: Types.ObjectId,
    update: {
      price?: number;
      mrp?: number;
      stock?: number;
      status?: ListingStatus;
    },
  ): Promise<ListingDocument | null> {
    return this.model
      .findOneAndUpdate(
        { _id: id, sellerId },
        { $set: update },
        { new: true, runValidators: true },
      )
      .exec();
  }

  /**
   * Delete with ownership filter. Returns true if something was deleted,
   * false if the listing didn't exist OR belonged to a different seller.
   */
  async deleteOwned(id: string, sellerId: Types.ObjectId): Promise<boolean> {
    const result = await this.model
      .deleteOne({ _id: id, sellerId })
      .exec();
    return result.deletedCount > 0;
  }

  /** Public — listings for a book, only ACTIVE, cheapest first. */
  async findActiveByBook(bookId: Types.ObjectId): Promise<ListingDocument[]> {
    return this.model
      .find({ bookId, status: ListingStatus.ACTIVE })
      .sort({ price: 1 })
      .lean()
      .exec() as unknown as ListingDocument[];
  }
}