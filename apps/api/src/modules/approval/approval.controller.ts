import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApprovalService } from './approval.service';
import { CreateApprovalDto, ApprovalDecisionDto, ApprovalQueryDto } from './approval.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@mrikipos/shared-types';

@Controller('v1/approvals')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ApprovalController {
  constructor(private readonly approvalService: ApprovalService) {}

  @Post()
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.KASIR, UserRole.STAFF)
  async create(
    @Body() dto: CreateApprovalDto,
    @CurrentUser('tenant_id') tenantId: string,
    @CurrentUser('id') requesterId: string,
    @CurrentUser('role') requesterRole: UserRole,
    @CurrentUser('outlet_id') userOutletId: string,
  ) {
    const data = await this.approvalService.create(
      dto,
      tenantId,
      requesterId,
      requesterRole,
      userOutletId,
    );
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  @Get()
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async findAll(
    @Query() query: ApprovalQueryDto,
    @CurrentUser('tenant_id') tenantId: string,
    @CurrentUser('role') userRole: UserRole,
    @CurrentUser('outlet_id') userOutletId: string,
  ) {
    const { data, meta } = await this.approvalService.findAll(
      tenantId,
      userRole,
      userOutletId,
      query,
    );
    return {
      success: true,
      data,
      meta,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('mine')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.KASIR, UserRole.STAFF)
  async findMine(
    @Query() query: ApprovalQueryDto,
    @CurrentUser('tenant_id') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    const { data, meta } = await this.approvalService.findMine(tenantId, userId, query);
    return {
      success: true,
      data,
      meta,
      timestamp: new Date().toISOString(),
    };
  }

  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.KASIR, UserRole.STAFF)
  async findOne(
    @Param('id') id: string,
    @CurrentUser('tenant_id') tenantId: string,
    @CurrentUser('id') actorId: string,
    @CurrentUser('role') actorRole: UserRole,
    @CurrentUser('outlet_id') actorOutletId: string,
  ) {
    const data = await this.approvalService.findOne(id, tenantId, actorId, actorRole, actorOutletId);
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  @Post(':id/approve')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  async approve(
    @Param('id') id: string,
    @Body() dto: ApprovalDecisionDto,
    @CurrentUser('tenant_id') tenantId: string,
    @CurrentUser('id') approverId: string,
    @CurrentUser('role') approverRole: UserRole,
    @CurrentUser('outlet_id') approverOutletId: string,
  ) {
    const data = await this.approvalService.approve(
      id,
      dto,
      tenantId,
      approverId,
      approverRole,
      approverOutletId,
    );
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  @Post(':id/reject')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  async reject(
    @Param('id') id: string,
    @Body() dto: ApprovalDecisionDto,
    @CurrentUser('tenant_id') tenantId: string,
    @CurrentUser('id') approverId: string,
    @CurrentUser('role') approverRole: UserRole,
    @CurrentUser('outlet_id') approverOutletId: string,
  ) {
    const data = await this.approvalService.reject(
      id,
      dto,
      tenantId,
      approverId,
      approverRole,
      approverOutletId,
    );
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }
}
