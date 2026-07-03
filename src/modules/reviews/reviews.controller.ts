import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto, UpdateReviewDto } from './dto';
import {
  createReviewSchema,
  updateReviewSchema,
} from './validation/review.validation';
import { JoiValidationPipe, ParseObjectIdPipe } from '../../common/pipes';
import { Public, Roles, CurrentUser } from '../../common/decorators';
import { ResponseMessage } from '../../common/interceptors';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { Role } from '../../common/enums';
import { MESSAGES } from '../../common/constants';

@ApiTags('Reviews')
@Controller()
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  // ───── Public ─────

  @Public()
  @Get('books/:bookId/reviews')
  @ApiOperation({ summary: 'List reviews for a book (public)' })
  listForBook(
    @Param('bookId', ParseObjectIdPipe) bookId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.reviews.listForBook(
      new Types.ObjectId(bookId),
      Number(page) || 1,
      Number(limit) || 20,
    );
  }

  // ───── Customer actions ─────

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CUSTOMER)
  @Post('books/:bookId/reviews')
  @ApiOperation({ summary: 'Submit a review (one per customer per book)' })
  @ResponseMessage(MESSAGES.REVIEW.CREATED)
  create(
    @CurrentUser('customerId') customerId: string,
    @Param('bookId', ParseObjectIdPipe) bookId: string,
    @Body(new JoiValidationPipe(createReviewSchema)) dto: CreateReviewDto,
  ) {
    return this.reviews.create(
      new Types.ObjectId(customerId),
      bookId,
      dto,
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CUSTOMER)
  @Patch('reviews/:id')
  @ApiOperation({ summary: 'Edit my own review' })
  @ResponseMessage(MESSAGES.COMMON.UPDATED)
  update(
    @CurrentUser('customerId') customerId: string,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body(new JoiValidationPipe(updateReviewSchema)) dto: UpdateReviewDto,
  ) {
    return this.reviews.update(id, new Types.ObjectId(customerId), dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CUSTOMER)
  @Delete('reviews/:id')
  @ApiOperation({ summary: 'Delete my own review' })
  @ResponseMessage(MESSAGES.COMMON.DELETED)
  async delete(
    @CurrentUser('customerId') customerId: string,
    @Param('id', ParseObjectIdPipe) id: string,
  ): Promise<null> {
    await this.reviews.delete(id, new Types.ObjectId(customerId));
    return null;
  }
}
