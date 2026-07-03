import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Review, ReviewDocument } from './schemas/review.schema';

@Injectable()
export class ReviewsRepository {
  constructor(
    @InjectModel(Review.name) private readonly model: Model<ReviewDocument>,
  ) {}

  async findById(id: string): Promise<ReviewDocument | null> {
    return this.model.findById(id).exec();
  }

  async findByBook(
    bookId: Types.ObjectId,
    skip = 0,
    limit = 20,
  ): Promise<ReviewDocument[]> {
    return this.model
      .find({ bookId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec() as unknown as ReviewDocument[];
  }

  async countByBook(bookId: Types.ObjectId): Promise<number> {
    return this.model.countDocuments({ bookId }).exec();
  }

  async create(input: {
    bookId: Types.ObjectId;
    customerId: Types.ObjectId;
    rating: number;
    comment: string;
  }): Promise<ReviewDocument> {
    const [doc] = await this.model.create([input]);
    return doc;
  }

  async updateOwned(
    id: string,
    customerId: Types.ObjectId,
    update: { rating?: number; comment?: string },
  ): Promise<ReviewDocument | null> {
    return this.model
      .findOneAndUpdate(
        { _id: id, customerId },
        { $set: update },
        { new: true },
      )
      .exec();
  }

  async deleteOwned(id: string, customerId: Types.ObjectId): Promise<boolean> {
    const result = await this.model
      .deleteOne({ _id: id, customerId })
      .exec();
    return result.deletedCount > 0;
  }

  async deleteByIdAdmin(id: string): Promise<boolean> {
    const result = await this.model.deleteOne({ _id: id }).exec();
    return result.deletedCount > 0;
  }

  /**
   * Aggregate: average rating + count for a book.
   * Returns { avg, count } — both default to 0 if no reviews.
   */
  async statsForBook(bookId: Types.ObjectId): Promise<{ avg: number; count: number }> {
    const result = await this.model
      .aggregate<{ _id: null; avg: number; count: number }>([
        { $match: { bookId, isVisible: true } },
        { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
      ])
      .exec();
    if (!result[0]) return { avg: 0, count: 0 };
    return { avg: result[0].avg, count: result[0].count };
  }
}