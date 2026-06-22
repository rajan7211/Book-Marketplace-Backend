import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';
import { SellerProfile, SellerProfileDocument } from './schemas/seller-profile.schema';
import { UpdateSellerDto } from './dto/update-seller.dto';
import { SellerStatus } from '../../common/enums';
import { MESSAGES, CacheKeys, CacheTTL } from '../../common/constants';
import { RedisService } from '../../infra/redis/redis.service';
import { resolvePagination, paginate } from '../../common/utils';
import { PaginatedResult } from '../../common/interfaces';

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
    private readonly redis: RedisService,
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

  async getByIdOrThrow(id: string): Promise<SellerProfileDocument> {
    const doc = await this.model.findById(id).exec();
    if (!doc) throw new NotFoundException(MESSAGES.COMMON.NOT_FOUND);
    return doc;
  }

  async updateProfile(id: string, dto: UpdateSellerDto): Promise<SellerProfileDocument> {
    const updated = await this.model
      .findByIdAndUpdate(id, { $set: dto }, { new: true, runValidators: true })
      .exec();
    if (!updated) throw new NotFoundException(MESSAGES.COMMON.NOT_FOUND);
    return updated;
  }

  /**
   * Cached approval-status lookup used by SellerApprovedGuard.
   * Invalidated whenever status changes.
   */
  async getStatus(id: string): Promise<SellerStatus> {
    const cached = await this.redis.get<SellerStatus>(CacheKeys.sellerStatus(id));
    if (cached) return cached;
    const doc = await this.getByIdOrThrow(id);
    await this.redis.set(CacheKeys.sellerStatus(id), doc.status, CacheTTL.SELLER_STATUS);
    return doc.status;
  }

  async approve(id: string, adminUserId: string): Promise<SellerProfileDocument> {
    const seller = await this.getByIdOrThrow(id);
    if (seller.status === SellerStatus.APPROVED) {
      throw new BadRequestException('Seller is already approved');
    }
    seller.status = SellerStatus.APPROVED;
    seller.approvedAt = new Date();
    seller.approvedBy = new Types.ObjectId(adminUserId);
    seller.rejectionReason = null;
    await seller.save();
    await this.redis.del(CacheKeys.sellerStatus(id));
    // (Phase 14) emit "seller approved" email here
    return seller;
  }

  async reject(id: string, adminUserId: string, reason?: string): Promise<SellerProfileDocument> {
    const seller = await this.getByIdOrThrow(id);
    seller.status = SellerStatus.REJECTED;
    seller.approvedBy = new Types.ObjectId(adminUserId);
    seller.rejectionReason = reason ?? null;
    await seller.save();
    await this.redis.del(CacheKeys.sellerStatus(id));
    // (Phase 14) emit "seller rejected" email here
    return seller;
  }

  async list(query: {
    status?: SellerStatus;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResult<SellerProfileDocument>> {
    const { page, limit, skip } = resolvePagination(query);
    const filter = query.status ? { status: query.status } : {};
    const [data, total] = await Promise.all([
      this.model.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean<SellerProfileDocument[]>().exec(),
      this.model.countDocuments(filter).exec(),
    ]);
    return paginate(data, page, limit, total);
  }

  async countAll(): Promise<number> {
    return this.model.countDocuments().exec();
  }

  async countByStatus(status: SellerStatus): Promise<number> {
    return this.model.countDocuments({ status }).exec();
  }
}
