import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class TransferStockDto {
  @IsString()
  @IsNotEmpty()
  itemId: string;

  @IsString()
  @IsNotEmpty()
  fromLocationId: string;

  @IsString()
  @IsOptional()
  fromDepartmentId?: string;

  @IsString()
  @IsNotEmpty()
  toLocationId: string;

  @IsString()
  @IsOptional()
  toDepartmentId?: string;

  @IsNumber()
  @Min(0.0001)
  quantity: number;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsString()
  @IsOptional()
  createdBy?: string;
}

