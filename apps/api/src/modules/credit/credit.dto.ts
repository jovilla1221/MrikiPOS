import {
  IsUUID,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  IsDateString,
  Min,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class CreateCreditDto {
  @IsUUID()
  customer_id!: string;

  @IsNumber()
  @Min(1)
  @Type(() => Number)
  jumlah!: number;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  keterangan?: string;

  @IsOptional()
  @IsDateString()
  jatuh_tempo?: string;
}

export class PayCreditDto {
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  jumlah_bayar!: number;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  catatan?: string;
}

export class CreditQueryDto extends PaginationDto {
  @IsOptional()
  @IsUUID()
  customer_id?: string;

  @IsOptional()
  @IsIn(['UNPAID', 'PARTIAL', 'PAID', 'OVERDUE'])
  status?: string;

  @IsOptional()
  @IsDateString()
  date_from?: string;

  @IsOptional()
  @IsDateString()
  date_to?: string;
}
