import { IsBoolean, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateProcurementCategoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
