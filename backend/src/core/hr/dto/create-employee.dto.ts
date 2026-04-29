import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsEnum,
  IsOptional,
  IsNumber,
  Min,
  IsDateString,
} from "class-validator";

export enum EmploymentStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  TERMINATED = "terminated",
  ON_LEAVE = "on_leave",
}

export enum EmploymentType {
  FULL_TIME = "full_time",
  PART_TIME = "part_time",
  CONTRACTOR = "contractor",
  INTERN = "intern",
}

/**
 * Create Employee DTO
 * Validation for creating new employees
 */
export class CreateEmployeeDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  @IsNotEmpty()
  employee_code: string;

  @IsString()
  @IsNotEmpty()
  first_name: string;

  @IsString()
  @IsNotEmpty()
  last_name: string;

  @IsString()
  @IsOptional()
  full_name?: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsNotEmpty()
  department_id: string;

  @IsString()
  @IsOptional()
  manager_id?: string;

  @IsString()
  @IsOptional()
  position?: string;

  @IsString()
  @IsOptional()
  role_title?: string;

  @IsString()
  @IsOptional()
  location_id?: string;

  @IsEnum(EmploymentType)
  @IsOptional()
  employment_type?: EmploymentType;

  @IsEnum(EmploymentStatus)
  @IsOptional()
  status?: EmploymentStatus;

  @IsNumber()
  @Min(0)
  @IsOptional()
  base_salary?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  hourly_rate?: number;

  @IsString()
  @IsOptional()
  company_id?: string;

  @IsDateString()
  @IsNotEmpty()
  hire_date: string;
}
