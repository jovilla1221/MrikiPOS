import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { UpdateTenantSettingsDto } from './tenant.dto';

@Injectable()
export class TenantService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findOne(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { outlets: true },
    });

    if (!tenant) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Tenant tidak ditemukan',
        },
        timestamp: new Date().toISOString(),
      });
    }

    return tenant;
  }

  async updateSettings(tenantId: string, settings: UpdateTenantSettingsDto, actorId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException('Tenant tidak ditemukan');
    }

    const currentSettings = (tenant.settings as Record<string, any>) || {};
    const updatedSettings = { ...currentSettings, ...settings };

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.tenant.update({
        where: { id: tenantId },
        data: { settings: updatedSettings },
      });

      await this.auditService.log(
        {
          tenantId,
          userId: actorId,
          action: 'TENANT_SETTINGS_UPDATED',
          entityType: 'Tenant',
          entityId: tenantId,
          oldValues: currentSettings,
          newValues: updatedSettings,
        },
        tx,
      );

      return updated;
    });
  }
}
