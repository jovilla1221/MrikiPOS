import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { CreditService } from './credit.service';
import { CreateCreditDto, PayCreditDto, CreditQueryDto } from './credit.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '@mrikipos/shared-types';

@Controller('v1/credits')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CreditController {
  constructor(private readonly creditService: CreditService) {}

  @Get()
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.KASIR)
  async findAll(
    @Query() query: CreditQueryDto,
    @CurrentUser('tenant_id') tenantId: string,
    @CurrentUser('outlet_id') outletId: string,
  ) {
    const { data, meta } = await this.creditService.findAll(tenantId, outletId, query);
    return { success: true, data, meta, timestamp: new Date().toISOString() };
  }

  @Get('summary')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.KASIR)
  async getSummary(
    @CurrentUser('tenant_id') tenantId: string,
    @CurrentUser('outlet_id') outletId: string,
  ) {
    const data = await this.creditService.getSummary(tenantId, outletId);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Get('overdue')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async findOverdue(
    @CurrentUser('tenant_id') tenantId: string,
    @CurrentUser('outlet_id') outletId: string,
  ) {
    const data = await this.creditService.findOverdue(tenantId, outletId);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.KASIR)
  async create(
    @Body() dto: CreateCreditDto,
    @CurrentUser('tenant_id') tenantId: string,
    @CurrentUser('outlet_id') outletId: string,
  ) {
    const data = await this.creditService.create(dto, tenantId, outletId);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.KASIR)
  async findOne(
    @Param('id') id: string,
    @CurrentUser('tenant_id') tenantId: string,
    @CurrentUser('outlet_id') outletId: string,
  ) {
    const data = await this.creditService.findOne(id, tenantId, outletId);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Put(':id/pay')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.KASIR)
  async pay(
    @Param('id') id: string,
    @Body() dto: PayCreditDto,
    @CurrentUser('tenant_id') tenantId: string,
    @CurrentUser('outlet_id') outletId: string,
  ) {
    const data = await this.creditService.pay(id, dto, tenantId, outletId);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Post(':id/remind')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  async remind(
    @Param('id') id: string,
    @CurrentUser('tenant_id') tenantId: string,
    @CurrentUser('outlet_id') outletId: string,
  ) {
    const data = await this.creditService.sendReminder(id, tenantId, outletId);
    return { success: true, data, timestamp: new Date().toISOString() };
  }
}
