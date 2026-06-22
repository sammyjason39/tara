import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export enum PosPaymentMethod {
  CASH = 'cash',
  ELECTRONIC = 'electronic',
}

export enum PosDiscountType {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
}

export class PosTransactionLineItemDto {
  @IsString()
  @IsNotEmpty({ message: 'itemId or sku is required' })
  itemId: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsNumber({}, { message: 'quantity must be a number' })
  @Min(1, { message: 'quantity must be at least 1' })
  @Max(9999, { message: 'quantity must be at most 9999' })
  quantity: number;

  @IsOptional()
  @IsEnum(PosDiscountType, { message: 'discountType must be percentage or fixed' })
  discountType?: PosDiscountType;

  @IsOptional()
  @IsNumber({}, { message: 'discountValue must be a number' })
  @Min(0, { message: 'discountValue must be >= 0' })
  @Max(100, { message: 'discountValue must be at most 100 for percentage discounts' })
  discountValue?: number;

  @IsOptional()
  @IsNumber()
  unitPrice?: number;
}

/**
 * CreatePosTransactionDto
 *
 * Validates POS transaction creation.
 *
 * Constraints:
 * - lineItems: array with at least 1 item
 * - Each line item: itemId/sku (required), quantity (1-9999),
 *   discount (0-100% or fixed), paymentMethod (cash/electronic)
 * - paymentMethod: required, cash or electronic
 *
 * Validates: Requirements 8.2, 16.2, 17.5
 */
export class CreatePosTransactionDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'Transaction must have at least 1 line item' })
  @ValidateNested({ each: true })
  @Type(() => PosTransactionLineItemDto)
  lineItems: PosTransactionLineItemDto[];

  @IsEnum(PosPaymentMethod, {
    message: 'paymentMethod must be cash or electronic',
  })
  paymentMethod: PosPaymentMethod;

  @IsOptional()
  @IsString()
  storeId?: string;

  @IsOptional()
  @IsString()
  terminalId?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  shiftId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
