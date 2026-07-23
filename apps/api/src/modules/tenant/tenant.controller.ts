import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { UpdateTenantSettingsDto } from './tenant.dto';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '@mrikipos/shared-types';

@Controller('v1/tenant')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER)
  async getTenantInfo(@TenantId() tenantId: string) {
    const data = await this.tenantService.findOne(tenantId);
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  @Put('settings')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER)
  async updateSettings(
    @TenantId() tenantId: string,
    @Body() settings: UpdateTenantSettingsDto,
    @CurrentUser('id') actorId: string,
  ) {
    const data = await this.tenantService.updateSettings(tenantId, settings, actorId);
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }
}
