import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsIn,
  IsOptional,
  IsUUID,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class StockAdjustmentDto {
  @IsIn(['in', 'out', 'adjustment'])
  type!: 'in' | 'out' | 'adjustment';

  @IsInt()
  @Type(() => Number)
  qty!: number;

  @IsString()
  @IsNotEmpty()
  keterangan!: string;
}

export class StockHistoryQueryDto extends PaginationDto {
  @IsOptional()
  @IsUUID()
  product_id?: string;

  @IsOptional()
  @IsIn(['IN', 'OUT', 'ADJUSTMENT'])
  type?: 'IN' | 'OUT' | 'ADJUSTMENT';

  @IsOptional()
  @IsDateString()
  date_from?: string;

  @IsOptional()
  @IsDateString()
  date_to?: string;
}
