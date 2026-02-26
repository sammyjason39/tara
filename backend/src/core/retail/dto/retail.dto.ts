import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
  IsBoolean,
} from "class-validator";
import { Type, Transform } from "class-transformer";

// ============================================================
// BRANCH (Physical Store) DTOs
// ============================================================

export class CreateStoreDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  locationId: string;

  @IsString()
  @IsNotEmpty()
  @IsEnum(["flagship", "express", "kiosk", "pop-up", "warehouse"])
  type: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  managerId?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  inventoryPoolId?: string; // null = private (per-location StockLevels)

  @IsOptional()
  operatingHours?: Record<string, any>;

  @IsOptional()
  settings?: Record<string, any>;
}

export class UpdateStoreDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  @IsEnum(["flagship", "express", "kiosk", "pop-up", "warehouse"])
  type?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  managerId?: string;

  @IsOptional()
  @IsString()
  inventoryPoolId?: string;

  @IsOptional()
  operatingHours?: Record<string, any>;

  @IsOptional()
  settings?: Record<string, any>;

  @IsOptional()
  @IsString()
  status?: string;
}

// ============================================================
// E-COMMERCE STORE DTOs
// ============================================================

export class CreateEcommerceStoreDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  @IsEnum([
    "shopify",
    "woocommerce",
    "tokopedia",
    "shopee",
    "lazada",
    "tiktok",
    "custom",
  ])
  platform: string;

  @IsString()
  @IsNotEmpty()
  domain: string;

  @IsOptional()
  @IsString()
  inventoryPoolId?: string; // null = private inventory

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  branchIds?: string[]; // linked physical store IDs

  @IsOptional()
  @IsString()
  managerId?: string;

  @IsOptional()
  settings?: Record<string, any>;
}

export class UpdateEcommerceStoreDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  domain?: string;

  @IsOptional()
  @IsString()
  inventoryPoolId?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  managerId?: string;

  @IsOptional()
  settings?: Record<string, any>;
}

export class LinkBranchDto {
  @IsString()
  @IsNotEmpty()
  branchId: string;
}

// ============================================================
// INVENTORY POOL DTOs
// ============================================================

export class CreateInventoryPoolDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(["shared", "exclusive"])
  type?: "shared" | "exclusive";
}

// ============================================================
// ORDER DTOs
// ============================================================

class OrderItemDto {
  @IsString()
  @IsNotEmpty()
  @Transform(
    ({ obj, value }) => value ?? obj.product_id ?? obj.itemId ?? obj.item_id,
    { toClassOnly: true },
  )
  productId: string;

  @IsNumber()
  @IsNotEmpty()
  quantity: number;

  @IsNumber()
  @IsNotEmpty()
  @Transform(({ obj, value }) => value ?? obj.unit_price, { toClassOnly: true })
  unitPrice: number;
}

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ obj, value }) => value ?? obj.store_id, { toClassOnly: true })
  storeId: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ obj, value }) => value ?? obj.terminal_id, {
    toClassOnly: true,
  })
  terminalId: string;

  @IsOptional()
  @IsString()
  @Transform(({ obj, value }) => value ?? obj.customer_id, {
    toClassOnly: true,
  })
  customerId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsString()
  @IsNotEmpty()
  @IsEnum(["cash", "card", "qr", "wallet"])
  @Transform(({ obj, value }) => value ?? obj.payment_method, {
    toClassOnly: true,
  })
  paymentMethod: "cash" | "card" | "qr" | "wallet";

  @IsNumber()
  @IsNotEmpty()
  @Transform(({ obj, value }) => value ?? obj.grand_total, {
    toClassOnly: true,
  })
  grandTotal: number;

  @IsOptional()
  @IsString()
  shiftId?: string;
}

// ============================================================
// SHIFT DTOs
// ============================================================

export class OpenShiftDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ obj, value }) => value ?? obj.store_id, { toClassOnly: true })
  storeId: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ obj, value }) => value ?? obj.terminal_id, {
    toClassOnly: true,
  })
  terminalId: string;

  @IsNumber()
  @IsNotEmpty()
  @Transform(({ obj, value }) => value ?? obj.opening_cash, {
    toClassOnly: true,
  })
  openingCash: number;
}

export class CloseShiftDto {
  @IsNumber()
  @IsNotEmpty()
  @Transform(({ obj, value }) => value ?? obj.closing_cash, {
    toClassOnly: true,
  })
  closingCash: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
