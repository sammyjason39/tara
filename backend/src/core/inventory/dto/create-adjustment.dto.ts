import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateAdjustmentDto {
  @IsString()
  @IsNotEmpty()
  itemId: string;

  @IsString()
  @IsNotEmpty()
  locationId: string;

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
  requestedBy?: string;
}

