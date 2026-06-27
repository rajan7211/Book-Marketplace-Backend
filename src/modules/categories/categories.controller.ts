import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';
import {
  createCategorySchema,
  updateCategorySchema,
} from './validation/category.validation';
import { JoiValidationPipe, ParseObjectIdPipe } from '../../common/pipes';
import { Public, Roles } from '../../common/decorators';
import { ResponseMessage } from '../../common/interceptors';
import { Role } from '../../common/enums';
import { MESSAGES } from '../../common/constants';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List active categories (storefront)' })
  listActive() {
    return this.categories.listActive();
  }

  // ── admin ──
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @Get('all')
  @ApiOperation({ summary: 'List ALL categories incl. inactive (admin)' })
  listAll() {
    return this.categories.listAll();
  }

  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @Post()
  @ApiOperation({ summary: 'Create a category' })
  @ResponseMessage(MESSAGES.COMMON.CREATED)
  create(@Body(new JoiValidationPipe(createCategorySchema)) dto: CreateCategoryDto) {
    return this.categories.create(dto);
  }

  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @Patch(':id')
  @ApiOperation({ summary: 'Update a category' })
  @ResponseMessage(MESSAGES.COMMON.UPDATED)
  update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body(new JoiValidationPipe(updateCategorySchema)) dto: UpdateCategoryDto,
  ) {
    return this.categories.update(id, dto);
  }

  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a category (blocked if used by books)' })
  @ResponseMessage(MESSAGES.COMMON.DELETED)
  remove(@Param('id', ParseObjectIdPipe) id: string) {
    return this.categories.remove(id);
  }
}
