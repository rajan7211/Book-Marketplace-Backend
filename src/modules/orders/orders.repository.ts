import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument } from './schemas/order.schema';

@Injectable()
export class OrdersRepository {
  constructor(
    @InjectModel(Order.name) private readonly model: Model<OrderDocument>,
  ) {}

  async findById(id: string): Promise<OrderDocument | null> {
    return this.model.findById(id).exec();
  }

  async findByCustomer(customerId: Types.ObjectId): Promise<OrderDocument[]> {
    return this.model
      .find({ customerId })
      .sort({ createdAt: -1 })
      .lean()
      .exec() as unknown as OrderDocument[];
  }
}
