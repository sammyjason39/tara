import { IsNotEmpty, IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateReservationDto {
  @IsNotEmpty()
  @IsString()
  location_id: string;

  @IsNotEmpty()
  @IsString()
  skuId: string;

  @IsNotEmpty()
  @IsNumber()
  qty: number;

  @IsOptional()
  @IsNumber()
  expiryMinutes?: number;

  @IsOptional()
  @IsNumber()
  estCost?: number;

  @IsOptional()
  priceSnapshot?: any;
}
