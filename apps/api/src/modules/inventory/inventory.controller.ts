import { Controller, Get, Post, Body, Param, UseGuards, Query } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { StockAdjustmentDto, StockHistoryQueryDto } from './inventory.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@mrikipos/shared-types';

@Controller('v1')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('products/:id/stock')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  async adjustStock(
    @Param('id') id: string,
    @Body() dto: StockAdjustmentDto,
    @CurrentUser() user: any,
  ) {
    return this.inventoryService.adjustStock(id, dto, user.tenant_id, user.outlet_id, user.id);
  }

  @Get('stock/history')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  async getHistory(@Query() query: StockHistoryQueryDto, @CurrentUser() user: any) {
    return this.inventoryService.getHistory(user.tenant_id, user.outlet_id, query);
  }

  @Get('stock/low')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async getLowStock(@CurrentUser() user: any) {
    return this.inventoryService.getLowStock(user.tenant_id, user.outlet_id);
  }
}
