import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { updateCustomerSchema } from './validation/customer.validation';
import { JoiValidationPipe } from '../../common/pipes';
import { CurrentUser, Roles } from '../../common/decorators';
import { Role } from '../../common/enums';
import { ResponseMessage } from '../../common/interceptors/response.interceptor';
import { MESSAGES } from '../../common/constants';

@ApiTags('Customers')
@ApiBearerAuth()
@Roles(Role.CUSTOMER)
@Controller('customers')
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get('me')
  @ApiOperation({ summary: "Get the current customer's profile" })
  getMe(@CurrentUser('customerId') customerId: string) {
    return this.customers.getByIdOrThrow(customerId);
  }

  @Patch('me')
  @ApiOperation({ summary: "Update the current customer's profile" })
  @ResponseMessage(MESSAGES.COMMON.UPDATED)
  updateMe(
    @CurrentUser('customerId') customerId: string,
    @Body(new JoiValidationPipe(updateCustomerSchema)) dto: UpdateCustomerDto,
  ) {
    return this.customers.updateProfile(customerId, dto);
  }
}
