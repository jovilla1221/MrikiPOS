import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditQueryDto } from './audit.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@mrikipos/shared-types';

@Controller('v1/audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async findAll(@Query() query: AuditQueryDto, @CurrentUser('tenant_id') tenantId: string) {
    const { data, meta } = await this.auditService.findAll(tenantId, query);
    return {
      success: true,
      data,
      meta,
      timestamp: new Date().toISOString(),
    };
  }

  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async findOne(@Param('id') id: string, @CurrentUser('tenant_id') tenantId: string) {
    const data = await this.auditService.findOne(id, tenantId);
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }
}
