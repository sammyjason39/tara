import { IsBoolean, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class UpdateProcurementCategoryDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
