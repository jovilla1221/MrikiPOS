import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ShiftService } from './shift.service';
import { OpenShiftDto, CloseShiftDto, ShiftQueryDto } from './shift.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '@mrikipos/shared-types';

@Controller('v1/shifts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ShiftController {
  constructor(private readonly shiftService: ShiftService) {}

  @Post('open')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.KASIR)
  async open(
    @Body() dto: OpenShiftDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('tenant_id') tenantId: string,
    @CurrentUser('outlet_id') outletId: string,
  ) {
    const data = await this.shiftService.open(dto, userId, tenantId, outletId);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Post('close')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.KASIR)
  @HttpCode(HttpStatus.OK)
  async close(
    @Body() dto: CloseShiftDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
    @CurrentUser('tenant_id') tenantId: string,
    @CurrentUser('outlet_id') outletId: string,
  ) {
    const data = await this.shiftService.close(dto, userId, userRole, tenantId, outletId);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Get('current')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.KASIR)
  async getCurrent(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenant_id') tenantId: string,
    @CurrentUser('outlet_id') outletId: string,
  ) {
    const data = await this.shiftService.getCurrent(userId, tenantId, outletId);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Get()
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async findAll(
    @Query() query: ShiftQueryDto,
    @CurrentUser('tenant_id') tenantId: string,
    @CurrentUser('outlet_id') outletId: string,
  ) {
    const { data, meta } = await this.shiftService.findAll(tenantId, outletId, query);
    return { success: true, data, meta, timestamp: new Date().toISOString() };
  }

  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.KASIR)
  async findOne(
    @Param('id') id: string,
    @CurrentUser('tenant_id') tenantId: string,
    @CurrentUser('outlet_id') outletId: string,
  ) {
    const data = await this.shiftService.findOne(id, tenantId, outletId);
    return { success: true, data, timestamp: new Date().toISOString() };
  }
}
