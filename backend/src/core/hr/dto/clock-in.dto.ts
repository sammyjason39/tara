import { IsString, IsNotEmpty, IsOptional } from "class-validator";

/**
 * Clock In DTO
 * Validation for employee clock-in
 */
export class ClockInDto {
  @IsString()
  @IsNotEmpty()
  employee_id: string;

  @IsString()
  @IsOptional()
  location_id?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
