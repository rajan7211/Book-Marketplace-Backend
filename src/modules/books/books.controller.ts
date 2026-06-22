import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BooksService } from './books.service';
import { CreateBookDto, BookQueryDto } from './dto';
import { createBookSchema, bookQuerySchema } from './validation/book.validation';
import { JoiValidationPipe, ParseObjectIdPipe } from '../../common/pipes';
import { Public, Roles, CurrentUser } from '../../common/decorators';
import { Role } from '../../common/enums';
import { ResponseMessage } from '../../common/interceptors/response.interceptor';
import { MESSAGES } from '../../common/constants';

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
    return this.books.findApproved();
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Book detail + active listings from approved sellers' })
  findOne(@Param('id', ParseObjectIdPipe) id: string) {
    return this.books.findOnePublic(id);
  }

  @Roles(Role.SELLER)
  @ApiBearerAuth()
  @Post()
  @ApiOperation({ summary: 'Submit a new book (Scenario B) — starts PENDING_APPROVAL' })
  @ResponseMessage(MESSAGES.BOOK.CREATED)
  create(
    @Body(new JoiValidationPipe(createBookSchema)) dto: CreateBookDto,
    @CurrentUser('sellerId') sellerId: string,
  ) {
    return this.books.create(dto, sellerId);
  }
}
