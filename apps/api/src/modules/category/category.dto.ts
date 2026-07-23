import { IsString, Length, IsOptional, IsUUID, IsInt, Min } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @Length(1, 50)
  nama!: string;

  @IsOptional()
  @IsUUID()
  parent_id?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sort_order?: number = 0;
}

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @Length(1, 50)
  nama?: string;

  @IsOptional()
  @IsUUID()
  parent_id?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sort_order?: number;
}
