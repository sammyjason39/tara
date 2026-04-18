import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  Min,
  IsDateString,
} from "class-validator";
import { EmploymentStatus, EmploymentType } from "./create-employee.dto";

/**
 * Update Employee DTO
 * Partial update for employee records
 */
export class UpdateEmployeeDto {
  @IsString()
  @IsOptional()
  first_name?: string;

  @IsString()
  @IsOptional()
  last_name?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  full_name?: string;

  @IsString()
  @IsOptional()
  department_id?: string;

  @IsString()
  @IsOptional()
  manager_id?: string;

  @IsString()
  @IsOptional()
  role_title?: string;

  @IsString()
  @IsOptional()
  location_id?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  employment_type?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  base_salary?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  hourly_rate?: number;

  @IsOptional()
  documents_metadata?: any;

  @IsDateString()
  @IsOptional()
  termination_date?: string;
}
