import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ReviewsRepository } from './reviews.repository';
import { Review } from './schemas/review.schema';
import { Book, BookDocument } from '../books/schemas/book.schema';
import { CreateReviewDto, UpdateReviewDto } from './dto';
import { PaginatedResult } from '../../common/interfaces';
import { resolvePagination, paginate } from '../../common/utils';

@Injectable()
export class ReviewsService {
  constructor(
    private readonly repo: ReviewsRepository,
    @InjectModel(Book.name) private readonly bookModel: Model<BookDocument>,
  ) {}

  // ───────────────────── PUBLIC ─────────────────────

  async listForBook(
    bookId: Types.ObjectId,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<Record<string, unknown>>> {
    const { skip } = resolvePagination({ page, limit });
    const [data, total] = await Promise.all([
      this.repo.findByBook(bookId, skip, limit),
      this.repo.countByBook(bookId),
    ]);
    return paginate(data as unknown as Record<string, unknown>[], page, limit, total);
  }

  // ───────────────────── CUSTOMER ACTIONS ─────────────────────

  async create(
    customerId: Types.ObjectId,
    bookId: string,
    dto: CreateReviewDto,
  ): Promise<Review> {
    // Verify the book exists
    const book = await this.bookModel.findById(bookId).exec();
    if (!book) throw new NotFoundException('Book not found');

    try {
      const review = await this.repo.create({
        bookId: new Types.ObjectId(bookId),
        customerId,
        rating: dto.rating,
        comment: dto.comment,
      });
      await this.recomputeBookStats(new Types.ObjectId(bookId));
      return review;
    } catch (err) {
      // Duplicate-key error from the unique index → already reviewed
      if ((err as { code?: number }).code === 11000) {
        throw new ConflictException('You have already reviewed this book');
      }
      throw err;
    }
  }

  async update(
    reviewId: string,
    customerId: Types.ObjectId,
    dto: UpdateReviewDto,
  ): Promise<Review> {
    const updated = await this.repo.updateOwned(reviewId, customerId, dto);
    if (!updated) {
      throw new ForbiddenException(
        'You can only edit your own reviews',
      );
    }
    await this.recomputeBookStats(updated.bookId);
    return updated;
  }

  async delete(reviewId: string, customerId: Types.ObjectId): Promise<void> {
    const review = await this.repo.findById(reviewId);
    if (!review) throw new NotFoundException('Review not found');
    const ok = await this.repo.deleteOwned(reviewId, customerId);
    if (!ok) {
      throw new ForbiddenException(
        'You can only delete your own reviews',
      );
    }
    await this.recomputeBookStats(review.bookId);
  }

  // ───────────────────── INTERNAL ─────────────────────

  /**
   * Recompute Book.averageRating and Book.reviewCount for a given book.
   * Called after every review mutation. Single aggregation query → fast.
   */
  private async recomputeBookStats(bookId: Types.ObjectId): Promise<void> {
    const { avg, count } = await this.repo.statsForBook(bookId);
    await this.bookModel.updateOne(
      { _id: bookId },
      { $set: { averageRating: avg, reviewCount: count } },
    );
  }
}