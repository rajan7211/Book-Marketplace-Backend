import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SellersService } from './sellers.service';
import { UpdateSellerDto } from './dto/update-seller.dto';
import { updateSellerSchema } from './validation/seller.validation';
import { JoiValidationPipe } from '../../common/pipes';
import { CurrentUser, Roles } from '../../common/decorators';
import { Role } from '../../common/enums';
import { ResponseMessage } from '../../common/interceptors/response.interceptor';
import { MESSAGES } from '../../common/constants';

@ApiTags('Sellers')
@ApiBearerAuth()
@Roles(Role.SELLER)
@Controller('sellers')
export class SellersController {
  constructor(private readonly sellers: SellersService) {}

  @Get('me')
  @ApiOperation({ summary: "Get the current seller's profile" })
  getMe(@CurrentUser('sellerId') sellerId: string) {
    return this.sellers.getByIdOrThrow(sellerId);
  }

  @Patch('me')
  @ApiOperation({ summary: "Update the current seller's profile" })
  @ResponseMessage(MESSAGES.COMMON.UPDATED)
  updateMe(
    @CurrentUser('sellerId') sellerId: string,
    @Body(new JoiValidationPipe(updateSellerSchema)) dto: UpdateSellerDto,
  ) {
    return this.sellers.updateProfile(sellerId, dto);
  }

  @Get('me/status')
  @ApiOperation({ summary: 'Get the current seller approval status (for FE gating)' })
  async getMyStatus(@CurrentUser('sellerId') sellerId: string) {
    return { status: await this.sellers.getStatus(sellerId) };
  }
}
