import { IsString, IsNotEmpty, IsOptional } from "class-validator";

export class CreateCaseDto {
  @IsString()
  @IsNotEmpty()
  employee_id: string;

  @IsString()
  @IsOptional()
  department_id?: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsString()
  @IsOptional()
  priority?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
