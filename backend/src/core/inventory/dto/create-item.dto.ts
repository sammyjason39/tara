import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum InventoryCategory {
  RAW_MATERIAL = 'raw_material',
  FINISHED_GOOD = 'finished_good',
  CONSUMABLE = 'consumable',
  ASSET = 'asset',
  SPARE_PART = 'spare_part',
}

export class CreateItemDto {
  @IsString()
  @IsNotEmpty()
  sku: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(InventoryCategory)
  category: InventoryCategory;

  @IsString()
  @IsNotEmpty()
  uom: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

