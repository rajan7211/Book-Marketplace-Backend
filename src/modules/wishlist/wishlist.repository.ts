import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Wishlist, WishlistDocument } from './schemas/wishlist.schema';

@Injectable()
export class WishlistRepository {
  constructor(
    @InjectModel(Wishlist.name) private readonly model: Model<WishlistDocument>,
  ) {}

  async findByCustomerId(
    customerId: Types.ObjectId,
  ): Promise<WishlistDocument | null> {
    return this.model.findOne({ customerId }).exec();
  }

  async create(customerId: Types.ObjectId): Promise<WishlistDocument> {
    const [doc] = await this.model.create([{ customerId, items: [] }]);
    return doc;
  }

  async save(wishlist: WishlistDocument): Promise<WishlistDocument> {
    return wishlist.save();
  }
}
