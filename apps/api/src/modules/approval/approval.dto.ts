import { IsEnum, IsUUID, IsOptional, IsString, Length, IsInt, Min, Max, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { ApprovalType, ApprovalStatus } from '@mrikipos/shared-types';

export class CreateApprovalDto {
  @IsEnum(ApprovalType, { message: 'ApprovalType tidak valid' })
  type!: ApprovalType;

  @IsUUID('4', { message: 'reference_id harus UUID valid' })
  reference_id!: string;

  @IsOptional()
  @IsUUID('4')
  outlet_id?: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  catatan?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class ApprovalDecisionDto {
  @IsOptional()
  @IsString()
  @Length(0, 255)
  catatan?: string;
}

export class ApprovalQueryDto {
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
  @IsEnum(ApprovalType)
  type?: ApprovalType;

  @IsOptional()
  @IsEnum(ApprovalStatus)
  status?: ApprovalStatus;

  @IsOptional()
  @IsUUID('4')
  requested_by?: string;

  @IsOptional()
  @IsUUID('4')
  outlet_id?: string;
}
