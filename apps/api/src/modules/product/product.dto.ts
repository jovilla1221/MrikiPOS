import {
  IsString,
  Length,
  IsOptional,
  IsNumber,
  Min,
  IsInt,
  Matches,
  IsUUID,
  IsArray,
  ValidateNested,
  IsBoolean,
  IsUrl,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class CreateVariantDto {
  @IsString()
  @Length(1, 50)
  nama!: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsNumber()
  @Min(0)
  harga_jual!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  stok?: number = 0;
}

export class CreateProductDto {
  @IsString()
  @Length(1, 100)
  nama!: string;

  @IsNumber()
  @Min(0)
  harga_jual!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  harga_beli?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  stok?: number = 0;

  @IsOptional()
  @IsInt()
  @Min(0)
  stok_minimum?: number = 5;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  @Length(1, 20)
  satuan?: string;

  @IsOptional()
  @IsUUID()
  category_id?: string;

  @IsOptional()
  @IsUrl({}, { message: 'URL foto harus berupa URL valid' })
  foto_url?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVariantDto)
  variants?: CreateVariantDto[];
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  nama?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  harga_jual?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  harga_beli?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  stok?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  stok_minimum?: number;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  @Length(1, 20)
  satuan?: string;

  @IsOptional()
  @IsUUID()
  category_id?: string;

  @IsOptional()
  @IsUrl({}, { message: 'URL foto harus berupa URL valid' })
  foto_url?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class ProductQueryDto extends PaginationDto {
  @IsOptional()
  @IsUUID()
  category_id?: string;

  @IsOptional()
  @Type(() => Boolean)
  is_active?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  low_stock?: boolean;
}
