import { IsString, IsNumber, IsOptional } from 'class-validator';

export class UpdatePositionDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  grade?: string;

  @IsString()
  @IsOptional()
  status?: "open" | "filled" | "frozen" | "closed";

  @IsNumber()
  @IsOptional()
  budgetedSalary?: number;

  @IsString()
  @IsOptional()
  department_id?: string;
}
