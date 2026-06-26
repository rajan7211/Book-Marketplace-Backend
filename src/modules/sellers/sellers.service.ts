import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SellersRepository } from './sellers.repository';
import { SellerStatus } from '../../common/enums';
import { MESSAGES } from '../../common/constants';

@Injectable()
export class SellersService {
  constructor(private readonly repo: SellersRepository) {}

  /** Used by SellerApprovedGuard and /sellers/me/status — single source of truth. */
  async getStatus(id: string): Promise<SellerStatus> {
    const doc = await this.repo.findById(id);
    if (!doc) throw new NotFoundException(MESSAGES.COMMON.NOT_FOUND);
    return doc.status;
  }

  async getByIdOrThrow(id: string) {
    const doc = await this.repo.findById(id);
    if (!doc) throw new NotFoundException(MESSAGES.COMMON.NOT_FOUND);
    return doc;
  }

  async updateProfile(
    id: string,
    dto: { businessName?: string; contactPerson?: string; mobile?: string },
  ) {
    const updated = await this.repo.updateProfile(id, dto);
    if (!updated) throw new NotFoundException(MESSAGES.COMMON.NOT_FOUND);
    return updated;
  }

  // ───── admin ─────

  async approve(id: string, adminUserId: string) {
    const seller = await this.repo.findById(id);
    if (!seller) throw new NotFoundException(MESSAGES.COMMON.NOT_FOUND);
    if (seller.status === SellerStatus.APPROVED) {
      throw new BadRequestException('Seller is already approved');
    }
    return this.repo.approve(id, adminUserId);
  }

  async reject(id: string, adminUserId: string, reason?: string) {
    const seller = await this.repo.findById(id);
    if (!seller) throw new NotFoundException(MESSAGES.COMMON.NOT_FOUND);
    return this.repo.reject(id, adminUserId, reason ?? null);
  }

  async list(status?: SellerStatus) {
    return this.repo.listByStatus(status);
  }
}
