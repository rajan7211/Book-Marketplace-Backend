import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';
import { SellerProfile, SellerProfileDocument } from './schemas/seller-profile.schema';
import { SellerStatus } from '../../common/enums';

interface CreateSellerInput {
  userId: Types.ObjectId;
  businessName: string;
  contactPerson: string;
  email: string;
  mobile: string;
}

@Injectable()
export class SellersService {
  constructor(
    @InjectModel(SellerProfile.name)
    private readonly model: Model<SellerProfileDocument>,
  ) {}

  async create(input: CreateSellerInput, session?: ClientSession): Promise<SellerProfileDocument> {
    const docs = await this.model.create(
      [{ ...input, status: SellerStatus.PENDING_APPROVAL }],
      session ? { session } : {},
    );
    return docs[0];
  }

  async findByUserId(userId: string | Types.ObjectId): Promise<SellerProfileDocument | null> {
    return this.model.findOne({ userId }).exec();
  }

  async findById(id: string | Types.ObjectId): Promise<SellerProfileDocument | null> {
    return this.model.findById(id).exec();
  }

  async countAll(): Promise<number> {
    return this.model.countDocuments().exec();
  }

  async countByStatus(status: SellerStatus): Promise<number> {
    return this.model.countDocuments({ status }).exec();
  }
}
