import { IsString, IsNotEmpty, IsNumber, IsOptional, IsEnum, IsArray, ValidateNested, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateStoreDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  @IsEnum(['flagship', 'express', 'kiosk', 'pop-up'])
  type: 'flagship' | 'express' | 'kiosk' | 'pop-up';

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsNotEmpty()
  timezone: string;

  @IsString()
  @IsNotEmpty()
  currency: string;
}

class OrderItemDto {
  @IsString()
  @IsNotEmpty()
  product_id: string;

  @IsNumber()
  @IsNotEmpty()
  quantity: number;

  @IsNumber()
  @IsNotEmpty()
  unit_price: number;
}

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  store_id: string;

  @IsString()
  @IsNotEmpty()
  terminal_id: string;

  @IsOptional()
  @IsString()
  customer_id?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsString()
  @IsNotEmpty()
  @IsEnum(['cash', 'card', 'qr', 'wallet'])
  payment_method: 'cash' | 'card' | 'qr' | 'wallet';

  @IsNumber()
  @IsNotEmpty()
  grand_total: number;
}

export class OpenShiftDto {
  @IsString()
  @IsNotEmpty()
  store_id: string;

  @IsString()
  @IsNotEmpty()
  terminal_id: string;

  @IsNumber()
  @IsNotEmpty()
  opening_cash: number;
}

export class CloseShiftDto {
  @IsNumber()
  @IsNotEmpty()
  closing_cash: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
