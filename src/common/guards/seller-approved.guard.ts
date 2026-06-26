import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { SellersService } from '../../modules/sellers/sellers.service';
import { SellerStatus } from '../enums';
import { MESSAGES } from '../constants';
import { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';

/**
 * Blocks seller write actions until the seller account is APPROVED.
 *
 * USAGE (later in Phase 5):
 *   @UseGuards(JwtAuthGuard, RolesGuard, SellerApprovedGuard)
 *   @Post()
 *   createListing() { ... }
 *
 * Order matters:
 *   1. JwtAuthGuard sets req.user (we need sellerId)
 *   2. RolesGuard confirms the user is a SELLER
 *   3. SellerApprovedGuard checks the seller's approval status
 */
@Injectable()
export class SellerApprovedGuard implements CanActivate {
  constructor(private readonly sellers: SellersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { user } = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest>();

    if (!user?.sellerId) {
      throw new ForbiddenException(MESSAGES.SELLER.NOT_APPROVED);
    }

    const status = await this.sellers.getStatus(user.sellerId);
    if (status !== SellerStatus.APPROVED) {
      throw new ForbiddenException(MESSAGES.SELLER.NOT_APPROVED);
    }
    return true;
  }
}

