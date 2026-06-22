import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export enum DiscountType {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
}

export class QuotationLineItemDto {
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
  @IsEnum(DiscountType, { message: 'discountType must be either percentage or fixed' })
  discountType?: DiscountType;

  @IsOptional()
  @IsNumber({}, { message: 'discountValue must be a number' })
  @Min(0, { message: 'discountValue must be >= 0' })
  discountValue?: number;

  @IsOptional()
  @IsString()
  description?: string;
}

/**
 * CreateQuotationDto
 *
 * Validates quotation creation operations.
 *
 * Constraints:
 * - lineItems: array with at least 1 item
 * - Each line item: itemId (required), quantity (> 0), unitPrice (> 0),
 *   discountType (percentage/fixed), discountValue (>= 0)
 *
 * Validates: Requirements 4.4, 16.2, 17.5
 */
export class CreateQuotationDto {
  @IsOptional()
  @IsString()
  opportunityId?: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Quotation must have at least 1 line item' })
  @ValidateNested({ each: true })
  @Type(() => QuotationLineItemDto)
  lineItems: QuotationLineItemDto[];

  @IsOptional()
  @IsNumber()
  validDays?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  currency?: string;
}
