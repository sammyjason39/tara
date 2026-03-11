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
  @IsNotEmpty()
  employeeCode: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsString()
  @IsOptional()
  fullName?: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsNotEmpty()
  departmentId: string;

  @IsString()
  @IsOptional()
  managerId?: string;

  @IsString()
  @IsOptional()
  roleTitle?: string;

  @IsString()
  @IsOptional()
  locationId?: string;

  @IsEnum(EmploymentType)
  @IsOptional()
  employmentType?: EmploymentType;

  @IsEnum(EmploymentStatus)
  @IsOptional()
  status?: EmploymentStatus;

  @IsNumber()
  @Min(0)
  @IsOptional()
  baseSalary?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  hourlyRate?: number;

  @IsDateString()
  @IsOptional()
  hireDate?: string;
}
