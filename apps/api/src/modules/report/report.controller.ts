import { Controller, Get, Query, Res, UseGuards, StreamableFile } from '@nestjs/common';
import { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { ReportService } from './report.service';
import { ReportQueryDto, ExportQueryDto } from './report.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '@mrikipos/shared-types';

/**
 * ReportController — Sprint 5
 * D1: Module terpisah, tidak campur TransactionModule.
 * S2: Role access OWNER + MANAGER only (kecuali disebutkan).
 */
@Controller('v1/reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  /**
   * GET /v1/reports/sales
   * Laporan penjualan agregat per hari/minggu/bulan.
   */
  @Get('sales')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async getSales(
    @Query() query: ReportQueryDto,
    @CurrentUser('tenant_id') tenantId: string,
    @CurrentUser('outlet_id') outletId: string,
  ) {
    const data = await this.reportService.getSales(tenantId, outletId, query);
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * GET /v1/reports/profit-loss
   * Laba rugi kotor periode.
   */
  @Get('profit-loss')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async getProfitLoss(
    @Query() query: ReportQueryDto,
    @CurrentUser('tenant_id') tenantId: string,
    @CurrentUser('outlet_id') outletId: string,
  ) {
    const data = await this.reportService.getProfitLoss(tenantId, outletId, query);
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * GET /v1/reports/products/top
   * 10 produk terlaris.
   */
  @Get('products/top')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async getTopProducts(
    @Query() query: ReportQueryDto,
    @CurrentUser('tenant_id') tenantId: string,
    @CurrentUser('outlet_id') outletId: string,
  ) {
    const data = await this.reportService.getTopProducts(tenantId, outletId, query);
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * GET /v1/reports/cashier
   * Rekap per kasir per periode.
   */
  @Get('cashier')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async getCashierSummary(
    @Query() query: ReportQueryDto,
    @CurrentUser('tenant_id') tenantId: string,
    @CurrentUser('outlet_id') outletId: string,
  ) {
    const data = await this.reportService.getCashierSummary(tenantId, outletId, query);
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * GET /v1/reports/export
   * Download report CSV / XLSX.
   * S3: Set Content-Disposition: attachment.
   * S6: File tidak disimpan di server — generate → stream → discard.
   * G2: Throttle khusus export — maksimal 10 request/menit per user.
   */
  @Get('export')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async exportReport(
    @Query() query: ExportQueryDto,
    @CurrentUser('tenant_id') tenantId: string,
    @CurrentUser('outlet_id') outletId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { buffer, contentType, filename } = await this.reportService.exportReport(
      query,
      tenantId,
      outletId,
    );

    // S3: Set Content-Disposition: attachment
    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'X-Content-Type-Options': 'nosniff',
    });

    return new StreamableFile(buffer);
  }
}
