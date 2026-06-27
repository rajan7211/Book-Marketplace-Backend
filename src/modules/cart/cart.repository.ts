import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cart, CartDocument } from './schemas/cart.schema';

@Injectable()
export class CartRepository {
  constructor(
    @InjectModel(Cart.name) private readonly model: Model<CartDocument>,
  ) {}

  async findByCustomerId(customerId: Types.ObjectId): Promise<CartDocument | null> {
    return this.model.findOne({ customerId }).exec();
  }

  async create(customerId: Types.ObjectId): Promise<CartDocument> {
    const [cart] = await this.model.create([{ customerId, items: [] }]);
    return cart;
  }

  async save(cart: CartDocument): Promise<CartDocument> {
    return cart.save();
  }

  async clear(cart: CartDocument): Promise<CartDocument> {
    cart.items = [];
    return cart.save();
  }
}