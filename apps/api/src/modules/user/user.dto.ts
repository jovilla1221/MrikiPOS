import {
  IsString,
  IsEnum,
  IsUUID,
  Matches,
  Length,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UserRole } from '@mrikipos/shared-types';

export class CreateUserDto {
  @IsString()
  @Length(2, 100, { message: 'Nama harus antara 2 hingga 100 karakter' })
  nama!: string;

  @IsString()
  @Matches(/^(\+62|62|0)8[1-9][0-9]{7,10}$/, {
    message: 'Nomor telepon harus format Indonesia valid (contoh: 08123456789)',
  })
  phone!: string;

  @IsString()
  @Matches(/^\d{6}$/, { message: 'PIN harus 6 digit angka' })
  pin!: string;

  @IsEnum(UserRole, { message: 'Role tidak valid' })
  role!: UserRole;

  @IsUUID('4', { message: 'Outlet ID harus format UUID valid' })
  outlet_id!: string;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @Length(2, 100)
  nama?: string;

  @IsOptional()
  @IsString()
  @Matches(/^(\+62|62|0)8[1-9][0-9]{7,10}$/)
  phone?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsUUID('4')
  outlet_id?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class ResetUserPinDto {
  @IsString()
  @Matches(/^\d{6}$/, { message: 'PIN baru harus 6 digit angka' })
  new_pin!: string;
}

export class UserQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsUUID('4')
  outlet_id?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  is_active?: boolean;
}
