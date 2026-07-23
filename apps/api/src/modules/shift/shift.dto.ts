import { IsNumber, IsOptional, IsString, IsUUID, Length, Min, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class OpenShiftDto {
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  modal_awal!: number;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  catatan?: string;
}

export class CloseShiftDto {
  @IsOptional()
  @IsUUID()
  shift_id?: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  kas_aktual!: number;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  catatan?: string;
}

export class ShiftQueryDto extends PaginationDto {
  @IsOptional()
  @IsUUID()
  user_id?: string;

  @IsOptional()
  @IsIn(['OPEN', 'CLOSED'])
  status?: string;
}
