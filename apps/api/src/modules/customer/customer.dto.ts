import { IsString, IsOptional, Length, Matches, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class CreateCustomerDto {
  @IsString()
  @Length(2, 100)
  nama!: string;

  @IsOptional()
  @IsString()
  @Matches(/^08[0-9]{8,12}$/, { message: 'Format phone tidak valid (contoh: 081234567890)' })
  phone?: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  alamat?: string;
}

export class UpdateCustomerDto {
  @IsOptional()
  @IsString()
  @Length(2, 100)
  nama?: string;

  @IsOptional()
  @IsString()
  @Matches(/^08[0-9]{8,12}$/, { message: 'Format phone tidak valid (contoh: 081234567890)' })
  phone?: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  alamat?: string;
}

export class CustomerQueryDto extends PaginationDto {
  // search inherited from PaginationDto (nama or phone)
}
