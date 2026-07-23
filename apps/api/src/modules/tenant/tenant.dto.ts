import { IsBoolean, IsNumber, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export class UpdateTenantSettingsDto {
  @IsOptional()
  @IsString()
  @Length(0, 100)
  store_name?: string;

  @IsOptional()
  @IsString()
  @Length(0, 30)
  store_phone?: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  store_address?: string;

  @IsOptional()
  @IsString()
  @Length(0, 100)
  receipt_header?: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  receipt_footer?: string;

  @IsOptional()
  @IsBoolean()
  receipt_show_address?: boolean;

  @IsOptional()
  @IsBoolean()
  receipt_show_phone?: boolean;

  @IsOptional()
  @IsBoolean()
  tax_enabled?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  tax_rate?: number;

  @IsOptional()
  @IsBoolean()
  tax_inclusive?: boolean;

  @IsOptional()
  @IsString()
  @Length(1, 10)
  currency?: string;

  @IsOptional()
  @IsString()
  @Length(1, 64)
  timezone?: string;
}
