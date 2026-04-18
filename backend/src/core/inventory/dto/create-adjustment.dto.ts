import { IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export class CreateAdjustmentDto {
  @IsString()
  @IsNotEmpty()
  item_id: string;

  @IsString()
  @IsNotEmpty()
  location_id: string;

  @IsString()
  @IsOptional()
  departmentId?: string;

  @IsNumber()
  requestedDelta: number;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsString()
  @IsOptional()
  requested_by?: string;
}
