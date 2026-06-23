import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category, CategoryDocument } from './schemas/category.schema';
import { Book, BookDocument } from '../books/schemas/book.schema';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { MESSAGES, CacheKeys, CacheTTL } from '../../common/constants';
import { RedisService } from '../../infra/redis/redis.service';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name) private readonly model: Model<CategoryDocument>,
    @InjectModel(Book.name) private readonly bookModel: Model<BookDocument>,
    private readonly redis: RedisService,
  ) {}

  // ── public ──
  /** Active categories for storefront filters (sorted). */
  async listActive(): Promise<CategoryDocument[]> {
    const cached = await this.redis.get<CategoryDocument[]>(CacheKeys.managedCategories());
    if (cached) return cached;
    const cats = await this.model
      .find({ isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .lean<CategoryDocument[]>()
      .exec();
    await this.redis.set(CacheKeys.managedCategories(), cats, CacheTTL.CATEGORIES);
    return cats;
  }

  // ── admin ──
  async listAll(): Promise<CategoryDocument[]> {
    return this.model.find().sort({ sortOrder: 1, name: 1 }).lean<CategoryDocument[]>().exec();
  }

  async create(dto: CreateCategoryDto): Promise<CategoryDocument> {
    const slug = this.slugify(dto.name);
    try {
      const cat = await this.model.create({
        name: dto.name.trim(),
        slug,
        description: dto.description ?? null,
        sortOrder: dto.sortOrder ?? 0,
      });
      await this.invalidate();
      return cat;
    } catch (e) {
      if ((e as { code?: number }).code === 11000) {
        throw new ConflictException('A category with this name already exists');
      }
      throw e;
    }
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<CategoryDocument> {
    const patch: Record<string, unknown> = { ...dto };
    if (dto.name) patch.slug = this.slugify(dto.name);
    try {
      const updated = await this.model
        .findByIdAndUpdate(id, { $set: patch }, { new: true, runValidators: true })
        .exec();
      if (!updated) throw new NotFoundException(MESSAGES.COMMON.NOT_FOUND);
      await this.invalidate();
      return updated;
    } catch (e) {
      if ((e as { code?: number }).code === 11000) {
        throw new ConflictException('A category with this name already exists');
      }
      throw e;
    }
  }

  /**
   * Delete a category. Guard: refuse if any book still references it by name,
   * to avoid orphaning catalog entries (the FE stores category as a string).
   */
  async remove(id: string): Promise<{ deleted: true }> {
    const cat = await this.model.findById(id).exec();
    if (!cat) throw new NotFoundException(MESSAGES.COMMON.NOT_FOUND);
    const inUse = await this.bookModel.exists({ category: cat.name });
    if (inUse) {
      throw new BadRequestException(
        'This category is in use by one or more books and cannot be deleted',
      );
    }
    await this.model.deleteOne({ _id: id }).exec();
    await this.invalidate();
    return { deleted: true };
  }

  async countAll(): Promise<number> {
    return this.model.countDocuments().exec();
  }

  // ── helpers ──
  private slugify(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private async invalidate(): Promise<void> {
    await this.redis.del(CacheKeys.managedCategories());
  }
}
