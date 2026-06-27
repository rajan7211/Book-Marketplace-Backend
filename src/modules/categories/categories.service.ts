import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CategoriesRepository } from './categories.repository';
import { Category, CategoryDocument } from './schemas/category.schema';
import { Book, BookDocument } from '../books/schemas/book.schema';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';
import { MESSAGES } from '../../common/constants';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly repo: CategoriesRepository,
    // Direct model injection — needed for the "in use by books" check.
    // We'll wire a proper BookRepository in Phase 5B.
    @InjectModel(Book.name) private readonly bookModel: Model<BookDocument>,
  ) {}

  async listActive(): Promise<CategoryDocument[]> {
    return this.repo.listActive();
  }

  async listAll(): Promise<CategoryDocument[]> {
    return this.repo.listAll();
  }

  async create(dto: CreateCategoryDto): Promise<CategoryDocument> {
    try {
      return await this.repo.create(dto);
    } catch (e) {
      if ((e as Error).message === 'A category with this name already exists') {
        throw new BadRequestException((e as Error).message);
      }
      throw e;
    }
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<CategoryDocument> {
    try {
      const updated = await this.repo.update(id, dto);
      if (!updated) throw new NotFoundException(MESSAGES.COMMON.NOT_FOUND);
      return updated;
    } catch (e) {
      if ((e as Error).message === 'A category with this name already exists') {
        throw new BadRequestException((e as Error).message);
      }
      throw e;
    }
  }

  /**
   * Delete a category. Refuses if any book still references it by NAME
   * (because Book.category is a string, not a foreign key).
   */
  async remove(id: string): Promise<{ deleted: true }> {
    const cat = await this.repo.findById(id);
    if (!cat) throw new NotFoundException(MESSAGES.COMMON.NOT_FOUND);

    const inUse = await this.bookModel.exists({ category: cat.name });
    if (inUse) {
      throw new BadRequestException(
        'This category is in use by one or more books and cannot be deleted',
      );
    }

    await this.repo.delete(id);
    return { deleted: true };
  }
}
