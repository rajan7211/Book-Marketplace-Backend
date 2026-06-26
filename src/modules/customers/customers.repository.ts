import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CustomerProfile, CustomerProfileDocument } from './schemas/customer-profile.schema';

/**
 * Repository for the CustomerProfile collection.
 */
@Injectable()
export class CustomersRepository {
  constructor(
    @InjectModel(CustomerProfile.name)
    private readonly model: Model<CustomerProfileDocument>,
  ) {}

  async create(input: {
    userId: Types.ObjectId;
    firstName: string;
    lastName: string;
  }): Promise<CustomerProfileDocument> {
    const [doc] = await this.model.create([input]);
    return doc;
  }

  async findByUserId(
    userId: string | Types.ObjectId,
  ): Promise<CustomerProfileDocument | null> {
    return this.model.findOne({ userId }).exec();
  }

  async findById(
    id: string | Types.ObjectId,
  ): Promise<CustomerProfileDocument | null> {
    return this.model.findById(id).exec();
  }
}
