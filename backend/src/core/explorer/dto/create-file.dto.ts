import { IsString, IsOptional, IsUUID } from "class-validator";

export class CreateFileDto {
  @IsOptional()
  @IsUUID()
  folder_id?: string;

  @IsOptional()
  @IsUUID()
  company_id?: string;

  @IsOptional()
  @IsUUID()
  department_id?: string;

  @IsOptional()
  @IsUUID()
  branch_id?: string;

  @IsOptional()
  @IsUUID()
  ecommerce_id?: string;

  @IsOptional()
  @IsString()
  access_level?: string;
}
