import { Controller, Get, Post, Body, Put, Param, Delete, UseGuards } from '@nestjs/common';
import { CategoryService } from './category.service';
import { CreateCategoryDto, UpdateCategoryDto } from './category.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@mrikipos/shared-types';

@Controller('v1/categories')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async create(@Body() createCategoryDto: CreateCategoryDto, @CurrentUser() user: any) {
    return this.categoryService.create(createCategoryDto, user.tenant_id, user.outlet_id);
  }

  @Get()
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.KASIR, UserRole.STAFF)
  async findAll(@CurrentUser() user: any) {
    return this.categoryService.findAll(user.tenant_id, user.outlet_id);
  }

  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.categoryService.findOne(id, user.tenant_id, user.outlet_id);
  }

  @Put(':id')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
    @CurrentUser() user: any,
  ) {
    return this.categoryService.update(id, updateCategoryDto, user.tenant_id, user.outlet_id);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.categoryService.remove(id, user.tenant_id, user.outlet_id);
  }
}
