import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ListingsRepository } from './listings.repository';
import { Book, BookDocument } from '../books/schemas/book.schema';
import { BookStatus } from '../../common/enums';
import { CreateListingDto, UpdateListingDto } from './dto';
import { MESSAGES } from '../../common/constants';

@Injectable()
export class ListingsService {
  constructor(
    private readonly repo: ListingsRepository,
    // Direct model injection — we'll wrap in BookRepository in a future refactor.
    @InjectModel(Book.name) private readonly bookModel: Model<BookDocument>,
  ) {}

  async create(
    dto: CreateListingDto,
    sellerId: Types.ObjectId,
  ): Promise<{ listingId: string }> {
    // 1. Book must exist AND be APPROVED
    const book = await this.bookModel.findById(dto.bookId).exec();
    if (!book) throw new NotFoundException('Book not found');
    if (book.status !== BookStatus.APPROVED) {
      throw new ForbiddenException(
        'This book is not yet approved for listing',
      );
    }

    // 2. Rule 10: at most one listing per (seller, book).
    //    The unique index will throw a duplicate-key error if violated.
    //    We pre-check to give a friendly 409 instead of a raw Mongo error.
    const existing = await this.repo.findBySellerAndBook(
      sellerId,
      new Types.ObjectId(dto.bookId),
    );
    if (existing) {
      throw new ConflictException(
        'You already have a listing for this book. Update it instead.',
      );
    }

    // 3. Create the listing
    const created = await this.repo.create({
      bookId: new Types.ObjectId(dto.bookId),
      sellerId,
      price: dto.price,
      mrp: dto.mrp,
      stock: dto.stock ?? 0,
    });

    return { listingId: created._id.toString() };
  }

  async listMine(sellerId: Types.ObjectId) {
    return this.repo.listBySeller(sellerId);
  }

  async update(
    id: string,
    dto: UpdateListingDto,
    sellerId: Types.ObjectId,
  ) {
    // Ownership is enforced inside updateOwned via the sellerId filter.
    // If null, either the listing doesn't exist OR belongs to another seller.
    // We throw 404 in both cases — don't leak which.
    const updated = await this.repo.updateOwned(id, sellerId, dto);
    if (!updated) throw new NotFoundException('Listing not found');
    return updated;
  }

  async delete(id: string, sellerId: Types.ObjectId): Promise<{ deleted: true }> {
    const ok = await this.repo.deleteOwned(id, sellerId);
    if (!ok) throw new NotFoundException('Listing not found');
    return { deleted: true };
  }

  /** Public — listings for a book detail page. */
  async findByBook(bookId: string) {
    if (!Types.ObjectId.isValid(bookId)) {
      throw new NotFoundException('Book not found');
    }
    return this.repo.findActiveByBook(new Types.ObjectId(bookId));
  }
}