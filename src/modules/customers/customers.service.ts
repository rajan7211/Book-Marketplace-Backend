import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';
import { CustomerProfile, CustomerProfileDocument } from './schemas/customer-profile.schema';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { MESSAGES } from '../../common/constants';
import { resolvePagination, paginate } from '../../common/utils';
import { PaginatedResult } from '../../common/interfaces';

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

  async getByIdOrThrow(id: string): Promise<CustomerProfileDocument> {
    const doc = await this.model.findById(id).exec();
    if (!doc) throw new NotFoundException(MESSAGES.COMMON.NOT_FOUND);
    return doc;
  }

  async updateProfile(id: string, dto: UpdateCustomerDto): Promise<CustomerProfileDocument> {
    const updated = await this.model
      .findByIdAndUpdate(id, { $set: dto }, { new: true, runValidators: true })
      .exec();
    if (!updated) throw new NotFoundException(MESSAGES.COMMON.NOT_FOUND);
    return updated;
  }

  async countAll(): Promise<number> {
    return this.model.countDocuments().exec();
  }

  /**
   * Admin listing: customers joined with their User email.
   * Mirrors the frontend adminApi.getCustomers() join.
   */
  async listWithEmails(query: {
    page?: number;
    limit?: number;
  }): Promise<PaginatedResult<Record<string, unknown>>> {
    const { page, limit, skip } = resolvePagination(query);
    const [rows, total] = await Promise.all([
      this.model
        .aggregate([
          { $sort: { createdAt: -1 } },
          { $skip: skip },
          { $limit: limit },
          {
            $lookup: {
              from: 'users',
              localField: 'userId',
              foreignField: '_id',
              as: 'user',
            },
          },
          { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
          {
            $project: {
              firstName: 1,
              lastName: 1,
              phone: 1,
              createdAt: 1,
              email: { $ifNull: ['$user.email', '—'] },
              isActive: { $ifNull: ['$user.isActive', true] },
            },
          },
        ])
        .exec(),
      this.model.countDocuments().exec(),
    ]);
    return paginate(rows as Record<string, unknown>[], page, limit, total);
  }
}
