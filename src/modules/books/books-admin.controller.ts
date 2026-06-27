import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BooksService } from './books.service';
import { RejectBookDto } from './dto';
import { rejectBookSchema } from './validation/book.validation';
import { JoiValidationPipe, ParseObjectIdPipe } from '../../common/pipes';
import { Roles } from '../../common/decorators';
import { ResponseMessage } from '../../common/interceptors';
import { Role, BookStatus } from '../../common/enums';
import { MESSAGES } from '../../common/constants';

@ApiTags('Admin')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin/books')
export class BooksAdminController {
  constructor(private readonly books: BooksService) {}

  @Get()
  @ApiOperation({ summary: 'List all books (optionally filter by status)' })
  list(@Query('status') status?: BookStatus, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.books.listForAdmin({ status, page, limit });
  }

  @Patch(':id/approve')
  @ApiOperation({ summary: 'Approve a book' })
  @ResponseMessage(MESSAGES.BOOK.APPROVED)
  approve(@Param('id', ParseObjectIdPipe) id: string) {
    return this.books.approve(id);
  }

  @Patch(':id/reject')
  @ApiOperation({ summary: 'Reject a book' })
  @ResponseMessage(MESSAGES.BOOK.REJECTED)
  reject(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body(new JoiValidationPipe(rejectBookSchema)) _dto: RejectBookDto,
  ) {
    return this.books.reject(id);
  }
}
