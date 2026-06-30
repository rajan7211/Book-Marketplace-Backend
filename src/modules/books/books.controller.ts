import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Types } from 'mongoose';
import { BooksService } from './books.service';
import { CreateBookDto, BookQueryDto } from './dto';
import { createBookSchema, bookQuerySchema } from './validation/book.validation';
import { JoiValidationPipe, ParseObjectIdPipe } from '../../common/pipes';
import { Public, Roles, CurrentUser } from '../../common/decorators';
import { ResponseMessage } from '../../common/interceptors';
import { Role } from '../../common/enums';
import { MESSAGES } from '../../common/constants';
import { multerConfig } from '../uploads/multer.config';

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

  /**
   * Submit a new book with a cover image
   */
  @Roles(Role.SELLER)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('image', multerConfig))
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: { type: 'string', format: 'binary' },
        isbn: { type: 'string', example: '9781847941831' },
        title: { type: 'string', example: 'Atomic Habits' },
        author: { type: 'string', example: 'James Clear' },
        publisher: { type: 'string', example: 'Random House' },
        description: { type: 'string' },
        category: { type: 'string' },
        tags: { type: 'string' },
      },
      required: ['image', 'isbn', 'title', 'author', 'publisher', 'description', 'category'],
    },
  })
  @ApiOperation({
    summary: 'Submit a new book with cover image  (starts PENDING_APPROVAL)',
  })
  @ResponseMessage(MESSAGES.BOOK.CREATED)
  async create(
   @UploadedFile() file: Express.Multer.File | undefined,
    @Body(new JoiValidationPipe(createBookSchema)) dto: CreateBookDto,
    @CurrentUser('sellerId') sellerId: string | undefined,
  ) {
    // FileInterceptor enforces type and size; we just check presence.
    if (!file) {
      throw new BadRequestException('Cover image is required');
    }

    // file.path is the Cloudinary URL set by CloudinaryStorage.
    return this.books.create(
      dto,
      file.path,
      sellerId ? new Types.ObjectId(sellerId) : null,
    );
  }
}
