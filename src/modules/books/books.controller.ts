import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BooksService } from './books.service';
import { CreateBookDto, BookQueryDto } from './dto';
import {
  createBookSchema,
  bookQuerySchema,
} from './validation/book.validation';
import { JoiValidationPipe, ParseObjectIdPipe } from '../../common/pipes';
import { Public, Roles, CurrentUser } from '../../common/decorators';
import { ResponseMessage } from '../../common/interceptors';
import { Role } from '../../common/enums';
import { MESSAGES } from '../../common/constants';

/**
 * Books controller — public + seller-facing endpoints.
 * Admin endpoints live in `books-admin.controller.ts` (same module).
 */
@ApiTags('Books')
@Controller('books')
export class BooksController {
  constructor(private readonly books: BooksService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Browse approved books (search / filter / sort / paginate)' })
  findAll(@Query(new JoiValidationPipe(bookQuerySchema)) query: BookQueryDto) {
    return this.books.findAll(query);
  }

  @Public()
  @Get('categories')
  @ApiOperation({ summary: 'Distinct categories among approved books' })
  getCategories() {
    return this.books.getCategories();
  }

  @Public()
  @Get('by-tag/:tag')
  @ApiOperation({ summary: 'Homepage rows by tag (bestseller / trending / new)' })
  byTag(@Param('tag') tag: string, @Query('limit') limit?: number) {
    return this.books.findByTag(tag, limit ? Number(limit) : 6);
  }

  @Roles(Role.SELLER)
  @ApiBearerAuth()
  @Get('approved')
  @ApiOperation({ summary: 'Approved books a seller can list against (Scenario A)' })
  approvedForSeller() {
    return this.books.findApprovedForSeller();
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Book detail' })
  findOne(@Param('id', ParseObjectIdPipe) id: string) {
    return this.books.findOnePublic(id);
  }

  @Roles(Role.SELLER)
  @ApiBearerAuth()
  @Post()
  @ApiOperation({
    summary:
      'Submit a new book (Scenario B) — starts PENDING_APPROVAL until admin approves.',
  })
  @ResponseMessage(MESSAGES.BOOK.CREATED)
  create(
    @Body(new JoiValidationPipe(createBookSchema)) dto: CreateBookDto,
    @CurrentUser('sellerId') sellerId: string | undefined,
  ) {
    // sellerId is on req.user only if the JWT was issued for an APPROVED seller.
    // For PENDING sellers the token never carries sellerId — they fall through login gate.
    return this.books.create(
      dto,
      sellerId ? new (require('mongoose').Types.ObjectId)(sellerId) : null,
    );
  }
}
