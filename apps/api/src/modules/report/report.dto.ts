import { IsOptional, IsDateString, IsIn, IsUUID, IsInt, Min, Max, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ExportFormat, ReportPeriod } from '@mrikipos/shared-types';

export class ReportQueryDto {
  @IsOptional()
  @IsDateString({}, { message: 'Format tanggal dari (date_from) tidak valid' })
  date_from?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Format tanggal sampai (date_to) tidak valid' })
  date_to?: string;

  @IsOptional()
  @IsIn(['daily', 'weekly', 'monthly', 'custom'])
  period?: ReportPeriod;

  @IsOptional()
  @IsUUID()
  kasir_id?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}

export class ExportQueryDto extends ReportQueryDto {
  @IsIn(['csv', 'xlsx', 'pdf'])
  format!: ExportFormat;

  /**
   * Jenis report yang akan diekspor: sales | profit-loss | top-products | cashier
   */
  @IsIn(['sales', 'profit-loss', 'top-products', 'cashier'])
  report_type!: 'sales' | 'profit-loss' | 'top-products' | 'cashier';
}
