import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Category, CategoryDocument } from './schemas/category.schema';

@Injectable()
export class CategoriesRepository {
  constructor(
    @InjectModel(Category.name)
    private readonly model: Model<CategoryDocument>,
  ) {}

  async listActive(): Promise<CategoryDocument[]> {
    return this.model
      .find({ isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .exec();
  }

  async listAll(): Promise<CategoryDocument[]> {
    return this.model
      .find()
      .sort({ sortOrder: 1, name: 1 })
      .exec();
  }

  async findById(
    id: string | Types.ObjectId,
  ): Promise<CategoryDocument | null> {
    return this.model.findById(id).exec();
  }

  async create(dto: {
    name: string;
    description?: string | null;
    sortOrder?: number;
  }): Promise<CategoryDocument> {
    const slug = this.slugify(dto.name);
    try {
      const cat = await this.model.create({
        name: dto.name.trim(),
        slug,
        description: dto.description ?? null,
        sortOrder: dto.sortOrder ?? 0,
        isActive: true,
      });
      return cat;
    } catch (e) {
      if ((e as { code?: number }).code === 11000) {
        // Unique-key violation → duplicate name/slug
        throw new Error('A category with this name already exists');
      }
      throw e;
    }
  }

  async update(
    id: string,
    dto: {
      name?: string;
      description?: string | null;
      sortOrder?: number;
      isActive?: boolean;
    },
  ): Promise<CategoryDocument | null> {
    const patch: Record<string, unknown> = { ...dto };
    if (dto.name) patch.slug = this.slugify(dto.name);
    try {
      return this.model
        .findByIdAndUpdate(id, { $set: patch }, { new: true, runValidators: true })
        .exec();
    } catch (e) {
      if ((e as { code?: number }).code === 11000) {
        throw new Error('A category with this name already exists');
      }
      throw e;
    }
  }

  async delete(id: string): Promise<void> {
    await this.model.deleteOne({ _id: id }).exec();
  }

  private slugify(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
