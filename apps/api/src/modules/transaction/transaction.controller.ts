import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import {
  CreateTransactionDto,
  VoidTransactionDto,
  TransactionQueryDto,
  SyncTransactionsDto,
} from './transaction.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '@mrikipos/shared-types';

@Controller('v1/transactions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Post()
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.KASIR)
  async create(
    @Body() dto: CreateTransactionDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('tenant_id') tenantId: string,
    @CurrentUser('outlet_id') outletId: string,
  ) {
    const data = await this.transactionService.create(dto, userId, tenantId, outletId);
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('sync')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.KASIR)
  async sync(
    @Body() dto: SyncTransactionsDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('tenant_id') tenantId: string,
    @CurrentUser('outlet_id') outletId: string,
  ) {
    const data = await this.transactionService.syncBatch(dto, userId, tenantId, outletId);
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  @Get()
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.KASIR)
  async findAll(
    @Query() query: TransactionQueryDto,
    @CurrentUser('tenant_id') tenantId: string,
    @CurrentUser('outlet_id') outletId: string,
  ) {
    const { data, meta } = await this.transactionService.findAll(tenantId, outletId, query);
    return {
      success: true,
      data,
      meta,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('summary')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async getSummary(
    @Query('date_from') dateFrom: string,
    @Query('date_to') dateTo: string,
    @CurrentUser('tenant_id') tenantId: string,
    @CurrentUser('outlet_id') outletId: string,
  ) {
    const data = await this.transactionService.getSummary(tenantId, outletId, dateFrom, dateTo);
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.KASIR)
  async findOne(
    @Param('id') id: string,
    @CurrentUser('tenant_id') tenantId: string,
    @CurrentUser('outlet_id') outletId: string,
  ) {
    const data = await this.transactionService.findOne(id, tenantId, outletId);
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  @Post(':id/void-request')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.KASIR)
  async createVoidRequest(
    @Param('id') id: string,
    @Body('alasan') alasan: string,
    @CurrentUser('tenant_id') tenantId: string,
    @CurrentUser('outlet_id') outletId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: UserRole,
  ) {
    const data = await this.transactionService.createVoidRequest(
      id,
      tenantId,
      outletId,
      alasan || 'Permintaan void transaksi',
      userId,
      userRole,
    );
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  @Post(':id/void')
  @Roles(UserRole.OWNER)
  async voidTransaction(
    @Param('id') id: string,
    @Body() dto: VoidTransactionDto,
    @CurrentUser('tenant_id') tenantId: string,
    @CurrentUser('outlet_id') outletId: string,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.transactionService.voidTransaction(id, tenantId, outletId, dto, userId);
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }
}
