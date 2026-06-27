import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { ListingsService } from './listings.service';
import { CreateListingDto, UpdateListingDto } from './dto';
import {
  createListingSchema,
  updateListingSchema,
} from './validation/listing.validation';
import { JoiValidationPipe, ParseObjectIdPipe } from '../../common/pipes';
import { Public, Roles, CurrentUser } from '../../common/decorators';
import { ResponseMessage } from '../../common/interceptors';
import { JwtAuthGuard, RolesGuard, SellerApprovedGuard } from '../../common/guards';
import { Role } from '../../common/enums';
import { MESSAGES } from '../../common/constants';

@ApiTags('Listings')
@Controller('listings')
export class ListingsController {
  constructor(private readonly listings: ListingsService) {}

  // ───── Seller-only ─────

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard, SellerApprovedGuard)
  @Post()
  @ApiOperation({ summary: 'Create a listing (Scenario A: list an existing approved book)' })
  @ResponseMessage(MESSAGES.LISTING.CREATED)
  create(
    @Body(new JoiValidationPipe(createListingSchema)) dto: CreateListingDto,
    @CurrentUser('sellerId') sellerId: string,
  ) {
    return this.listings.create(dto, new Types.ObjectId(sellerId));
  }

  @ApiBearerAuth()
  @Roles(Role.SELLER)
  @Get('mine')
  @ApiOperation({ summary: "List my listings (the current seller's own)" })
  listMine(@CurrentUser('sellerId') sellerId: string) {
    return this.listings.listMine(new Types.ObjectId(sellerId));
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard, SellerApprovedGuard)
  @Patch(':id')
  @ApiOperation({ summary: 'Update a listing (must own)' })
  @ResponseMessage(MESSAGES.COMMON.UPDATED)
  update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body(new JoiValidationPipe(updateListingSchema)) dto: UpdateListingDto,
    @CurrentUser('sellerId') sellerId: string,
  ) {
    return this.listings.update(id, dto, new Types.ObjectId(sellerId));
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard, SellerApprovedGuard)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a listing (must own)' })
  @ResponseMessage(MESSAGES.COMMON.DELETED)
  delete(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser('sellerId') sellerId: string,
  ) {
    return this.listings.delete(id, new Types.ObjectId(sellerId));
  }

  // ───── Public ─────

  @Public()
  @Get('by-book/:bookId')
  @ApiOperation({ summary: 'Active listings for a given book (storefront)' })
  findByBook(@Param('bookId') bookId: string) {
    return this.listings.findByBook(bookId);
  }
}

