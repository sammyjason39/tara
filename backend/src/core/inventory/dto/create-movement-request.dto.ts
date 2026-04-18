import {
  IsString,
  IsOptional,
  IsNumber,
  Min,
} from "class-validator";

export class CreateMovementRequestDto {
  @IsString()
  product_id: string;

  @IsString()
  fromLocationId: string;

  @IsString()
  toLocationId: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsString()
  @IsOptional()
  priority?: string;
  
  @IsString()
  reason: string;
}
