import {
  IsString,
  IsOptional,
  IsNumber,
  Min,
  IsArray,
  ValidateNested,
  IsUUID,
  IsEnum,
  IsDateString,
  ArrayMaxSize,
} from 'class-validator';

import { Type } from 'class-transformer';
import { PaymentMethod, TransactionStatus } from '@mrikipos/shared-types';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class CreateTransactionItemDto {
  @IsUUID()
  product_id!: string;

  @IsOptional()
  @IsUUID()
  variant_id?: string;

  @IsNumber()
  @Min(1)
  qty!: number;

  @IsNumber()
  @Min(0)
  harga!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  diskon_item?: number;

  @IsOptional()
  @IsString()
  catatan?: string;
}

export class CreatePaymentDto {
  @IsEnum(PaymentMethod)
  metode!: PaymentMethod;

  @IsNumber()
  @Min(0)
  jumlah!: number;
}

export class CreateTransactionDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTransactionItemDto)
  items!: CreateTransactionItemDto[];

  @IsOptional()
  @IsUUID()
  customer_id?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  diskon?: number;

  @IsOptional()
  @IsString()
  catatan?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePaymentDto)
  payments!: CreatePaymentDto[];
}

export class RefundItemDto {
  @IsUUID()
  transaction_item_id!: string;

  @IsNumber()
  @Min(1)
  qty!: number;

  @IsString()
  alasan!: string;
}

export class RefundTransactionDto {
  @IsString()
  pin!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RefundItemDto)
  items!: RefundItemDto[];
}

export class VoidTransactionDto {
  @IsString()
  pin!: string;

  @IsString()
  alasan!: string;
}

export class TransactionQueryDto extends PaginationDto {
  @IsOptional()
  @IsDateString({}, { message: 'Format tanggal dari (date_from) tidak valid' })
  date_from?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Format tanggal sampai (date_to) tidak valid' })
  date_to?: string;

  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;
}

export class CreateOfflineTransactionDto extends CreateTransactionDto {
  @IsString()
  local_id!: string;

  @IsOptional()
  @IsDateString({}, { message: 'Format tanggal created_at tidak valid' })
  created_at?: string;
}

export class SyncTransactionsDto {
  @IsArray()
  @ArrayMaxSize(50, { message: 'Maksimal 50 transaksi per batch sync' })
  @ValidateNested({ each: true })
  @Type(() => CreateOfflineTransactionDto)
  transactions!: CreateOfflineTransactionDto[];
}
