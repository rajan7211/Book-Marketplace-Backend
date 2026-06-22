import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { SellersService } from '../sellers/sellers.service';
import { CustomersService } from '../customers/customers.service';
import { RejectSellerDto } from '../sellers/dto/reject-seller.dto';
import { rejectSellerSchema } from '../sellers/validation/seller.validation';
import { JoiValidationPipe, ParseObjectIdPipe } from '../../common/pipes';
import { CurrentUser, Roles } from '../../common/decorators';
import { Role, SellerStatus } from '../../common/enums';
import { ResponseMessage } from '../../common/interceptors/response.interceptor';
import { MESSAGES } from '../../common/constants';

/**
 * Phase 4 slice of the Admin module: user & seller management.
 * Dashboard analytics / reports are added in Phase 12.
 */
@ApiTags('Admin')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly sellers: SellersService,
    private readonly customers: CustomersService,
  ) {}

  // ── Sellers ──────────────────────────────────────
  @Get('sellers')
  @ApiOperation({ summary: 'List sellers (optionally filter by status)' })
  @ApiQuery({ name: 'status', enum: SellerStatus, required: false })
  listSellers(
    @Query('status') status?: SellerStatus,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.sellers.list({ status, page, limit });
  }

  @Patch('sellers/:id/approve')
  @ApiOperation({ summary: 'Approve a seller' })
  @ResponseMessage(MESSAGES.SELLER.APPROVED)
  approveSeller(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser('userId') adminUserId: string,
  ) {
    return this.sellers.approve(id, adminUserId);
  }

  @Patch('sellers/:id/reject')
  @ApiOperation({ summary: 'Reject a seller' })
  @ResponseMessage(MESSAGES.SELLER.REJECTED)
  rejectSeller(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser('userId') adminUserId: string,
    @Body(new JoiValidationPipe(rejectSellerSchema)) dto: RejectSellerDto,
  ) {
    return this.sellers.reject(id, adminUserId, dto.reason);
  }

  // ── Customers ────────────────────────────────────
  @Get('customers')
  @ApiOperation({ summary: 'List customers (joined with their user email)' })
  listCustomers(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.customers.listWithEmails({ page, limit });
  }
}
