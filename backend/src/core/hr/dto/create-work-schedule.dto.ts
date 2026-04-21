import { IsString, IsOptional, IsDateString, IsObject, IsUUID } from "class-validator";

export class CreateWorkScheduleDto {
  @IsUUID()
  department_id: string;

  @IsString()
  name: string;

  @IsDateString()
  start_date: string;

  @IsDateString()
  end_date: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsUUID()
  @IsOptional()
  createdBy?: string;

  @IsUUID()
  @IsOptional()
  location_id?: string;

  @IsObject()
  @IsOptional()
  metadata?: any;
}
