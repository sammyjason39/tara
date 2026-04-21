import { IsString, IsOptional, IsDateString, IsObject, IsUUID } from "class-validator";

export class CreateWorkShiftDto {
  @IsUUID()
  scheduleId: string;

  @IsUUID()
  employee_id: string;

  @IsDateString()
  start_time: string;

  @IsDateString()
  end_time: string;

  @IsString()
  @IsOptional()
  roleId?: string;

  @IsUUID()
  @IsOptional()
  location_id?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsObject()
  @IsOptional()
  metadata?: any;
}
