import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';
import { SellerProfile, SellerProfileDocument } from './schemas/seller-profile.schema';
import { SellerStatus } from '../../common/enums';

/**
 * Repository for the SellerProfile collection.
 * Pure data access — no business rules, no email, no caching.
 */
@Injectable()
export class SellersRepository {
  constructor(
    @InjectModel(SellerProfile.name)
    private readonly model: Model<SellerProfileDocument>,
  ) {}

  async create(
    input: {
      userId: Types.ObjectId;
      businessName: string;
      contactPerson: string;
      email: string;
      mobile: string;
    },
    session?: ClientSession,
  ): Promise<SellerProfileDocument> {
    const docs = await this.model.create(
      [{ ...input, status: SellerStatus.PENDING_APPROVAL }],
      session ? { session } : {},
    );
    return docs[0];
  }

  async findByUserId(
    userId: string | Types.ObjectId,
  ): Promise<SellerProfileDocument | null> {
    return this.model.findOne({ userId }).exec();
  }

  async findById(
    id: string | Types.ObjectId,
  ): Promise<SellerProfileDocument | null> {
    return this.model.findById(id).exec();
  }

  async updateProfile(
    id: string,
    dto: {
      businessName?: string;
      contactPerson?: string;
      mobile?: string;
    },
  ): Promise<SellerProfileDocument | null> {
    return this.model
      .findByIdAndUpdate(id, { $set: dto }, { new: true, runValidators: true })
      .exec();
  }

  /**
   * Admin: approve a seller. Sets status, approvedAt, approvedBy, clears rejectionReason.
   */
  async approve(
    id: string,
    adminUserId: string,
  ): Promise<SellerProfileDocument | null> {
    return this.model
      .findByIdAndUpdate(
        id,
        {
          $set: {
            status: SellerStatus.APPROVED,
            approvedAt: new Date(),
            approvedBy: new Types.ObjectId(adminUserId),
            rejectionReason: null,
          },
        },
        { new: true },
      )
      .exec();
  }

  /**
   * Admin: reject a seller. Sets status + rejectionReason + approvedBy (for audit).
   */
  async reject(
    id: string,
    adminUserId: string,
    reason: string | null,
  ): Promise<SellerProfileDocument | null> {
    return this.model
      .findByIdAndUpdate(
        id,
        {
          $set: {
            status: SellerStatus.REJECTED,
            approvedBy: new Types.ObjectId(adminUserId),
            rejectionReason: reason ?? null,
          },
        },
        { new: true },
      )
      .exec();
  }

  /**
   * List sellers (admin). Optionally filter by status.
   */
  async listByStatus(
    status?: SellerStatus,
  ): Promise<SellerProfileDocument[]> {
    const filter = status ? { status } : {};
    return this.model.find(filter).sort({ createdAt: -1 }).exec();
  }
}
