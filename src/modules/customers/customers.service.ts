import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';
import { CustomerProfile, CustomerProfileDocument } from './schemas/customer-profile.schema';

interface CreateCustomerInput {
  userId: Types.ObjectId;
  firstName: string;
  lastName: string;
}

@Injectable()
export class CustomersService {
  constructor(
    @InjectModel(CustomerProfile.name)
    private readonly model: Model<CustomerProfileDocument>,
  ) {}

  async create(
    input: CreateCustomerInput,
    session?: ClientSession,
  ): Promise<CustomerProfileDocument> {
    const docs = await this.model.create([input], session ? { session } : {});
    return docs[0];
  }

  async findByUserId(userId: string | Types.ObjectId): Promise<CustomerProfileDocument | null> {
    return this.model.findOne({ userId }).exec();
  }

  async findById(id: string | Types.ObjectId): Promise<CustomerProfileDocument | null> {
    return this.model.findById(id).exec();
  }

  async countAll(): Promise<number> {
    return this.model.countDocuments().exec();
  }
}
