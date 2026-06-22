import {
  IsOptional,
  IsString,
  IsNumber,
  IsBoolean,
  MaxLength,
} from 'class-validator';

/**
 * UpdateItemDto
 *
 * Validates partial updates to inventory items.
 * All fields are optional since this is used with PATCH.
 *
 * Constraints:
 * - name: max 200 characters
 * - sku: max 50 characters
 * - description: optional free-form string
 * - unit/unitOfMeasure: free-form string
 * - category: free-form string
 *
 * Validates: Requirements 7.2, 7.3, 10.6, 16.2
 */
export class UpdateItemDto {
  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'name must be at most 200 characters' })
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'sku must be at most 50 characters' })
  sku?: string;

  @IsOptional()
  @IsString()
  unitOfMeasure?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  category_id?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsOptional()
  @IsNumber()
  base_price?: number;

  @IsOptional()
  @IsNumber()
  selling_price?: number;

  @IsOptional()
  @IsNumber()
  discount_rate?: number;

  @IsOptional()
  @IsString()
  discount_type?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  department_id?: string;

  @IsOptional()
  @IsBoolean()
  is_anomaly?: boolean;

  @IsOptional()
  metadata?: any;

  @IsOptional()
  pricing_tiers?: any;
}
