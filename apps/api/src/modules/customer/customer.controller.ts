import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { CustomerService } from './customer.service';
import { CreateCustomerDto, UpdateCustomerDto, CustomerQueryDto } from './customer.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '@mrikipos/shared-types';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min, Max } from 'class-validator';

@Controller('v1/customers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Get()
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.KASIR)
  async findAll(
    @Query() query: CustomerQueryDto,
    @CurrentUser('tenant_id') tenantId: string,
    @CurrentUser('outlet_id') outletId: string,
  ) {
    const { data, meta } = await this.customerService.findAll(tenantId, outletId, query);
    return { success: true, data, meta, timestamp: new Date().toISOString() };
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.KASIR)
  async create(
    @Body() dto: CreateCustomerDto,
    @CurrentUser('tenant_id') tenantId: string,
    @CurrentUser('outlet_id') outletId: string,
  ) {
    const data = await this.customerService.create(dto, tenantId, outletId);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.KASIR)
  async findOne(
    @Param('id') id: string,
    @CurrentUser('tenant_id') tenantId: string,
    @CurrentUser('outlet_id') outletId: string,
  ) {
    const data = await this.customerService.findOne(id, tenantId, outletId);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Put(':id')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.KASIR)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
    @CurrentUser('tenant_id') tenantId: string,
    @CurrentUser('outlet_id') outletId: string,
  ) {
    const data = await this.customerService.update(id, dto, tenantId, outletId);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Delete(':id')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  async remove(
    @Param('id') id: string,
    @CurrentUser('tenant_id') tenantId: string,
    @CurrentUser('outlet_id') outletId: string,
  ) {
    const data = await this.customerService.remove(id, tenantId, outletId);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Get(':id/history')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.KASIR)
  async getHistory(
    @Param('id') id: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @CurrentUser('tenant_id') tenantId: string,
    @CurrentUser('outlet_id') outletId: string,
  ) {
    const { data, meta } = await this.customerService.getHistory(
      id,
      tenantId,
      outletId,
      page ? parseInt(page, 10) : 1,
      limit ? Math.min(parseInt(limit, 10), 100) : 20,
    );
    return { success: true, data, meta, timestamp: new Date().toISOString() };
  }
}
