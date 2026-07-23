import { Controller, Get, Post, Body, Put, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto, UpdateProductDto, ProductQueryDto } from './product.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@mrikipos/shared-types';

@Controller('v1/products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async create(@Body() createProductDto: CreateProductDto, @CurrentUser() user: any) {
    return this.productService.create(createProductDto, user.tenant_id, user.outlet_id);
  }

  @Get()
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.KASIR, UserRole.STAFF)
  async findAll(@Query() query: ProductQueryDto, @CurrentUser() user: any) {
    return this.productService.findAll(user.tenant_id, user.outlet_id, query);
  }

  @Get('search')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.KASIR, UserRole.STAFF)
  async search(@Query('q') q: string, @CurrentUser() user: any) {
    return this.productService.search(user.tenant_id, user.outlet_id, q || '');
  }

  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.KASIR, UserRole.STAFF)
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.productService.findOne(id, user.tenant_id, user.outlet_id);
  }

  @Put(':id')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @CurrentUser() user: any,
  ) {
    return this.productService.update(
      id,
      updateProductDto,
      user.tenant_id,
      user.outlet_id,
      user.id,
    );
  }

  @Post(':id/price-request')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.KASIR, UserRole.STAFF)
  async createPriceChangeRequest(
    @Param('id') id: string,
    @Body('harga_jual_baru') hargaJualBaru: number,
    @CurrentUser() user: any,
  ) {
    const data = await this.productService.createPriceChangeRequest(
      id,
      hargaJualBaru,
      user.tenant_id,
      user.outlet_id,
      user.id,
      user.role,
    );
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  @Delete(':id')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.productService.remove(id, user.tenant_id, user.outlet_id);
  }
}
