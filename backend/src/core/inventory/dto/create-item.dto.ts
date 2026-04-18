import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from "class-validator";

export enum InventoryCategory {
  ITEM = "ITEM",
  RAW_MATERIAL = "RAW_MATERIAL",
  FINISHED_GOOD = "FINISHED_GOOD",
  SERVICE = "SERVICE",
  CONSUMABLE = "CONSUMABLE",
  ASSET = "ASSET",
  SPARE_PART = "SPARE_PART",
  // Legacy lowercase values for compatibility
  raw_material = "raw_material",
  finished_good = "finished_good",
  consumable = "consumable",
  asset = "asset",
  spare_part = "spare_part",
}

export class CreateItemDto {
  @IsString()
  @IsNotEmpty()
  sku: string;

  @IsString()
  @IsOptional()
  barcode?: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  category: string;  // Free-form to accept any category name


  @IsString()
  @IsNotEmpty()
  uom: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsOptional()
  base_price?: number;

  @IsOptional()
  taxRate?: number;

  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @IsString({ each: true })
  @IsOptional()
  moduleTags?: string[];

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  departmentId?: string;
}
