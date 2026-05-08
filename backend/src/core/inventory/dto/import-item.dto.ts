import {
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  IsEnum,
} from "class-validator";
import { Type } from "class-transformer";
import { InventoryCategory } from "./create-item.dto";

export class ImportItemDto {
  @IsString()
  sku: string;

  @IsString()
  name: string;

  @IsString()
  category: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  base_price?: number;

  @IsOptional()
  taxRate?: number;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  moduleTags?: string[];

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  active?: boolean;

  @IsOptional()
  selling_price?: number;

  @IsOptional()
  discount_rate?: number;

  @IsString()
  @IsOptional()
  discount_type?: string;

  @IsOptional()
  pricing_tiers?: any;

  @IsOptional()
  metadata?: any;

  @IsOptional()
  quantity?: number;

  @IsOptional()
  @IsString()
  location?: string;

}
