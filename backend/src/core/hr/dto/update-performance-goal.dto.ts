import { IsString, IsNotEmpty, IsOptional, IsNumber, IsDateString, IsEnum } from 'class-validator';

export class UpdatePerformanceGoalDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  @IsNotEmpty()
  employee_id: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsNotEmpty()
  targetDate: string;

  @IsNumber()
  @IsOptional()
  progress?: number;

  @IsEnum(['IN_PROGRESS', 'COMPLETED', 'OVERDUE', 'CANCELLED'])
  @IsOptional()
  status?: string;
}
