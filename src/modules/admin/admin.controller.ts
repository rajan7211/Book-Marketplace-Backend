import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SellersService } from '../sellers/sellers.service';
import { RejectSellerDto } from '../sellers/dto';
import { rejectSellerSchema } from '../sellers/validation/seller.validation';
import { JoiValidationPipe, ParseObjectIdPipe } from '../../common/pipes';
import { CurrentUser, Roles } from '../../common/decorators';
import { ResponseMessage } from '../../common/interceptors';
import { Role, SellerStatus } from '../../common/enums';
import { MESSAGES } from '../../common/constants';

@ApiTags('Admin')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly sellers: SellersService) {}

  @Get('sellers')
  @ApiOperation({ summary: 'List sellers (optionally filter by status)' })
  listSellers(@Query('status') status?: SellerStatus) {
    return this.sellers.list(status);
  }

  @Patch('sellers/:id/approve')
  @ApiOperation({ summary: 'Approve a seller (PENDING_APPROVAL → APPROVED)' })
  @ResponseMessage(MESSAGES.SELLER.APPROVED)
  approveSeller(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser('userId') adminUserId: string,
  ) {
    return this.sellers.approve(id, adminUserId);
  }

  @Patch('sellers/:id/reject')
  @ApiOperation({ summary: 'Reject a seller (optionally with a reason)' })
  @ResponseMessage(MESSAGES.SELLER.REJECTED)
  rejectSeller(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser('userId') adminUserId: string,
    @Body(new JoiValidationPipe(rejectSellerSchema)) dto: RejectSellerDto,
  ) {
    return this.sellers.reject(id, adminUserId, dto.reason);
  }
}
