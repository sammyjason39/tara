import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class EnrollBenefitDto {
  @IsString()
  @IsNotEmpty()
  employee_id: string;

  @IsString()
  @IsNotEmpty()
  planId: string;

  @IsNumber()
  @IsOptional()
  coverage_amount?: number;
}
