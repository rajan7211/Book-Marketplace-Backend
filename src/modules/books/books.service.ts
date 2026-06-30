import { BadRequestException, ConflictException, Injectable,
 Logger, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { BooksRepository } from './books.repository';
import { CreateBookDto, BookQueryDto } from './dto';
import { BookStatus } from '../../common/enums';
import { MESSAGES } from '../../common/constants';
import { PaginatedResult } from '../../common/interfaces';
import { resolvePagination, paginate } from '../../common/utils';
import { CloudinaryService } from '../uploads/cloudinary.service';

@Injectable()
export class BooksService {
  private readonly logger = new Logger(BooksService.name);

  constructor(
    private readonly repo: BooksRepository,
    private readonly cloudinaryService: CloudinaryService,
  ) {}
  
/**
 * Create a new book.
 *
 * @param dto - Book fields (validated by Joi)
 * @param imageUrl - Cloudinary URL of the uploaded cover image
 * @param submittedBy - Seller ObjectId or null for admin-uploaded books
 */

  async create(
    dto: CreateBookDto,
    imageUrl: string,
    submittedBy: Types.ObjectId | null,
  ): Promise<{ isbn: string; coverImage: string }> {
    if (await this.repo.existsByIsbn(dto.isbn)) {
      throw new ConflictException(MESSAGES.BOOK.DUPLICATE_ISBN);
    }
    await this.repo.create({
      ...dto,
      coverImage: imageUrl,
      submittedBy,
    });
    return { isbn: dto.isbn, coverImage: imageUrl };
  }

  async findAll(query: BookQueryDto): Promise<PaginatedResult<Record<string, unknown>>> {
    const { page, limit } = resolvePagination(query);
    const { data, total } = await this.repo.findAllApproved(query);
    return paginate(data, page, limit, total);
  }

  async findOnePublic(id: string): Promise<Record<string, unknown>> {
    const book = await this.repo.findApprovedById(id);
    if (!book) throw new NotFoundException(MESSAGES.COMMON.NOT_FOUND);
    return book.toObject() as unknown as Record<string, unknown>;
  }

  async findByTag(tag: string, limit = 6) {
    return this.repo.findByTag(tag, limit);
  }

  async getCategories(): Promise<string[]> {
    return this.repo.distinctCategories();
  }

  async findApprovedForSeller() {
    return this.repo.findApprovedForSeller();
  }

  // ───── admin ─────

  async listForAdmin(query: { status?: BookStatus; page?: number; limit?: number }) {
    const { page, limit } = resolvePagination(query);
    const { data, total } = await this.repo.listForAdmin(query);
    return paginate(data, page, limit, total);
  }

  async approve(id: string) {
    const book = await this.repo.findById(id);
    if (!book) throw new NotFoundException(MESSAGES.COMMON.NOT_FOUND);
    if (book.status === BookStatus.APPROVED) throw new BadRequestException('Book is already approved');
    return this.repo.approve(id);
  }

async reject(id: string) {
  const book = await this.repo.findById(id);
  if (!book) throw new NotFoundException(MESSAGES.COMMON.NOT_FOUND);
  const updated = await this.repo.reject(id);
  if (updated?.coverImage) {
    await this.cloudinaryService.deleteImage(updated.coverImage);
  }
  return updated;
}

};
