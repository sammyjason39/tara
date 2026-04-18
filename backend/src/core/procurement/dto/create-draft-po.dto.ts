import { Type } from "class-transformer";
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";

export class PoLineItemDto {
  @IsString()
  @IsNotEmpty()
  productSku: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsString()
  @IsNotEmpty()
  uom: string;

  @IsNumber()
  @Min(0)
  unit_price: number;
}

export class CreateDraftPoDto {
  @IsString()
  @IsNotEmpty()
  requisitionId: string;

  @IsString()
  @IsNotEmpty()
  supplierId: string;

  @IsString()
  @IsNotEmpty()
  supplierBranchId: string;

  @IsString()
  @IsNotEmpty()
  contractType: "BLANKET" | "SPOT" | "SERVICE";

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PoLineItemDto)
  lineItems: PoLineItemDto[];

  @IsNumber()
  @IsOptional()
  quotedTotal?: number;
}
