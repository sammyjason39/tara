import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';

export class PurchaseOrderLineItemDto {
  @IsString()
  @IsNotEmpty({ message: 'itemId is required for each line item' })
  itemId: string;

  @IsNumber({}, { message: 'quantity must be a number' })
  @IsPositive({ message: 'quantity must be greater than 0' })
  quantity: number;

  @IsNumber({}, { message: 'unitPrice must be a number' })
  @IsPositive({ message: 'unitPrice must be greater than 0' })
  unitPrice: number;

  @IsOptional()
  @IsString()
  description?: string;
}

/**
 * CreatePurchaseOrderDto
 *
 * Validates purchase order creation.
 *
 * Constraints:
 * - vendorId: required, non-empty string
 * - lineItems: array with at least 1 item
 * - Each line item: itemId (required), quantity (> 0), unitPrice (> 0)
 *
 * Validates: Requirements 3.2, 16.2, 17.5
 */
export class CreatePurchaseOrderDto {
  @IsString()
  @IsNotEmpty({ message: 'vendorId is required' })
  vendorId: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Purchase order must have at least 1 line item' })
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderLineItemDto)
  lineItems: PurchaseOrderLineItemDto[];

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  currency?: string;
}
