import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
  IsBoolean,
  IsObject,
  IsDateString,
  Matches,
} from "class-validator";
import { Type, Transform } from "class-transformer";

/**
 * DecimalString transformer.
 * Accepts both number and string inputs at the HTTP boundary.
 * Coerces to Decimal(19,4)-safe string: e.g. 1.5 → "1.5", "2.2500" → "2.2500".
 * Validators downstream must use @Matches(DECIMAL_19_4_RE).
 */
const DECIMAL_19_4_RE = /^\d{1,15}(\.\d{1,4})?$/;
const toDecimalString = ({ value }: { value: any }): string => String(value ?? 0);


// ============================================================
// BRANCH (Physical Store) DTOs
// ============================================================

export class StoreOperationalConfigDto {
  @IsOptional()
  @IsString()
  business_hours_template?: string;

  @IsOptional()
  @IsString()
  default_shift_model?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  enabled_modules?: string[];

  @IsOptional()
  @IsNumber()
  pos_device_limit?: number;

  @IsOptional()
  @IsBoolean()
  self_checkout_enabled?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  payment_methods_allowed?: string[];

  @IsOptional()
  @IsEnum(["strict", "flexible", "manager_only"])
  refund_policy_mode?: string;

  @IsOptional()
  @IsBoolean()
  auto_close_shift_setting?: boolean;
}

export class StoreSupplyConfigDto {
  @IsOptional()
  @IsString()
  default_inbound_warehouse_id?: string;

  @IsOptional()
  @IsEnum(["speed", "cost", "balanced"])
  transfer_priority_policy?: string;

  @IsOptional()
  @IsString()
  replenishment_rule_set?: string;

  @IsOptional()
  @IsString()
  safety_stock_policy?: string;

  @IsOptional()
  @IsString()
  auto_reorder_threshold_template?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fulfillment_fallback_routing?: string[];
}

export class StoreInfrastructureRegistryDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  registered_device_ids?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  pos_clusters?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scanner_pools?: string[];

  @IsOptional()
  @IsString()
  local_server_binding?: string;

  @IsOptional()
  @IsNumber()
  sync_interval?: number;

  @IsOptional()
  @IsNumber()
  offline_tolerance_threshold?: number;
}

export class StoreChannelBindingDto {
  @IsOptional()
  @IsString()
  linked_ecommerce_store_id?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  marketplace_integrations?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  channel_priority?: string[];

  @IsOptional()
  @IsString()
  order_routing_logic?: string;

  @IsOptional()
  @IsString()
  online_to_offline_sync_policy?: string;
}

export class StoreGovernanceDataDto {
  @IsOptional()
  @IsEnum(["active", "expired", "frozen"])
  license_status?: string;

  @IsOptional()
  @IsDateString()
  activation_date?: string;

  @IsOptional()
  @IsEnum(["LAN-first", "Cloud"])
  activation_source?: string;

  @IsOptional()
  @IsNumber()
  compliance_level?: number;

  @IsOptional()
  @IsEnum(["standard", "high", "critical"])
  audit_frequency_tier?: string;

  @IsOptional()
  @IsString()
  data_retention_policy?: string;

  @IsOptional()
  @IsString()
  decommission_trigger?: string;
}

export class CreateStoreDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  location_id: string;

  @IsString()
  @IsNotEmpty()
  @IsEnum(["flagship", "satellite", "warehouse", "express", "kiosk", "pop-up"])
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
  tax_zone?: string;

  @IsOptional()
  @IsString()
  manager_id?: string;

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
  @IsNumber()
  latitude?: number;
 
  @IsOptional()
  @IsNumber()
  longitude?: number;
 
  @IsOptional()
  @IsNumber()
  geofenceRadius?: number;
 
  @IsOptional()
  @IsString()
  inventory_pool_id?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => StoreOperationalConfigDto)
  operational_config?: StoreOperationalConfigDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => StoreSupplyConfigDto)
  supply_config?: StoreSupplyConfigDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => StoreInfrastructureRegistryDto)
  infrastructure_registry?: StoreInfrastructureRegistryDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => StoreChannelBindingDto)
  channel_binding?: StoreChannelBindingDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => StoreGovernanceDataDto)
  governance?: StoreGovernanceDataDto;
}

export class UpdateStoreDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  location_id?: string;

  @IsOptional()
  @IsString()
  @IsEnum(["flagship", "satellite", "warehouse", "express", "kiosk", "pop-up"])
  type?: string;

  @IsOptional()
  @IsString()
  @IsEnum([
    "active",
    "frozen",
    "archived",
    "decommissioned",
    "inactive",
    "maintenance",
  ])
  status?: string;

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
  tax_zone?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  manager_id?: string;

  @IsOptional()
  @IsString()
  inventory_pool_id?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => StoreOperationalConfigDto)
  operational_config?: StoreOperationalConfigDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => StoreSupplyConfigDto)
  supply_config?: StoreSupplyConfigDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => StoreInfrastructureRegistryDto)
  infrastructure_registry?: StoreInfrastructureRegistryDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => StoreChannelBindingDto)
  channel_binding?: StoreChannelBindingDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => StoreGovernanceDataDto)
  governance?: StoreGovernanceDataDto;
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
  inventory_pool_id?: string; // null = private inventory

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  branch_ids?: string[]; // linked physical store IDs

  @IsOptional()
  @IsString()
  manager_id?: string;

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
  inventory_pool_id?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  manager_id?: string;

  @IsOptional()
  settings?: Record<string, any>;
}

export class LinkBranchDto {
  @IsString()
  @IsNotEmpty()
  branch_id: string;
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

export class OrderItemDto {
  @IsString()
  @IsNotEmpty()
  product_id: string;

  @IsOptional()
  @IsString()
  variant_id?: string;

  /**
   * Decimal(19,4)-safe quantity.
   * Accepts numeric inputs (e.g. 1.25 or "1.2500") from POS terminals.
   * Stored and processed as Prisma.Decimal — no float drift.
   */
  @Transform(toDecimalString)
  @Matches(DECIMAL_19_4_RE, {
    message: 'quantity must be a positive number with up to 4 decimal places (e.g. "1.2500")',
  })
  quantity: string;

  /**
   * Decimal(19,4)-safe unit price.
   * Accepts both integer and decimal inputs from POS.
   */
  @Transform(toDecimalString)
  @Matches(DECIMAL_19_4_RE, {
    message: 'unit_price must be a positive number with up to 4 decimal places',
  })
  unit_price: string;

  @IsOptional()
  @Transform(toDecimalString)
  @Matches(DECIMAL_19_4_RE)
  tax_rate?: string;

  @IsOptional()
  @Transform(toDecimalString)
  @Matches(DECIMAL_19_4_RE)
  commission_rate?: string;

  @IsOptional()
  @Transform(toDecimalString)
  @Matches(DECIMAL_19_4_RE)
  commission_amount?: string;

  @IsOptional()
  @Transform(toDecimalString)
  @Matches(DECIMAL_19_4_RE)
  discount?: string;
}

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ obj, value }) => value ?? obj.store_id, { toClassOnly: true })
  store_id: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ obj, value }) => value ?? obj.terminal_id, {
    toClassOnly: true,
  })
  terminal_id: string;

  @IsOptional()
  @IsString()
  @Transform(({ obj, value }) => value ?? obj.customer_id, {
    toClassOnly: true,
  })
  customer_id?: string;

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
  payment_method: "cash" | "card" | "qr" | "wallet";

  /**
   * Grand total — Decimal(19,4)-safe string.
   * Accepts number or string from payment gateway callbacks.
   */
  @Transform(({ obj, value }) => String(value ?? obj.grand_total ?? 0))
  @Matches(DECIMAL_19_4_RE, {
    message: 'grand_total must be a positive number with up to 4 decimal places',
  })
  grand_total: string;

  @IsOptional()
  @IsString()
  shift_id?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @Transform(toDecimalString)
  @Matches(DECIMAL_19_4_RE)
  commission_amount?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @Transform(toDecimalString)
  @Matches(DECIMAL_19_4_RE)
  cart_discount?: string;
}

// ============================================================
// SHIFT DTOs
// ============================================================

export class OpenShiftDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ obj, value }) => value ?? obj.store_id, { toClassOnly: true })
  store_id: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ obj, value }) => value ?? obj.terminal_id, {
    toClassOnly: true,
  })
  terminal_id: string;

  @IsNumber()
  @IsNotEmpty()
  @Transform(({ obj, value }) => value ?? obj.opening_cash, {
    toClassOnly: true,
  })
  opening_cash: number;
}

export class CloseShiftDto {
  @IsNumber()
  @IsNotEmpty()
  @Transform(({ obj, value }) => value ?? obj.closing_cash, {
    toClassOnly: true,
  })
  closing_cash: number;

  @IsOptional()
  @IsNumber()
  counted_cash?: number;

  @IsOptional()
  @IsNumber()
  variance?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  closing_note?: string;

  @IsOptional()
  @IsString()
  compliance_note?: string;
}

export class ReconcileShiftDto {
  @IsNumber()
  @IsNotEmpty()
  actual_amount: number;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
// ============================================================
// PRODUCT DTOs
// ============================================================

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category_id?: string;

  @IsOptional()
  @IsNumber()
  base_price?: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsOptional()
  @IsEnum(["ITEM", "SERVICE", "RAW_MATERIAL"])
  type?: "ITEM" | "SERVICE" | "RAW_MATERIAL";

  @IsOptional()
  @IsEnum(["active", "discontinued", "draft"])
  status?: "active" | "discontinued" | "draft";

  @IsOptional()
  @IsNumber()
  stock_on_hand?: number;

  @IsOptional()
  @IsNumber()
  reserved?: number;

  @IsOptional()
  @IsNumber()
  stock?: number;

  @IsOptional()
  @IsString()
  userRole?: string;

  @IsOptional()
  @IsNumber()
  location_id?: string;

  @IsOptional()
  @IsNumber()
  min_buffer?: number;
}

// ============================================================
// DEVICE / CCTV / SENSOR REGISTRATION DTOs
// ============================================================

export class RegisterBranchDeviceDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  store_id: string;

  @IsString()
  @IsNotEmpty()
  @IsEnum(["pc", "tablet", "scanner", "printer", "pos_terminal", "other"])
  type: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  serialNumber?: string;

  @IsOptional()
  @IsString()
  @IsEnum(["tcp_ip", "usb", "bluetooth", "com_port", "wifi", "other"])
  connType?: string;

  @IsOptional()
  @IsString()
  ip_address?: string;

  @IsOptional()
  @IsString()
  macAddress?: string;

  @IsOptional()
  @IsString()
  comPort?: string;

  @IsOptional()
  @IsString()
  usbPort?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  assignment?: { role?: string; employee_id?: string; shiftBound?: boolean };
}

export class RegisterCCTVCameraDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsString()
  @IsNotEmpty()
  @IsEnum(["ezviz", "dahua", "hikvision", "reolink", "axis", "custom", "other"])
  provider: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsNumber()
  resolutionMp?: number;

  @IsOptional()
  @IsBoolean()
  hasNightVision?: boolean;

  @IsOptional()
  @IsBoolean()
  hasPtz?: boolean;

  @IsOptional()
  @IsString()
  hlsUrl?: string;

  @IsOptional()
  @IsString()
  rtspUrl?: string;

  @IsOptional()
  @IsString()
  ip_address?: string;

  @IsOptional()
  @IsNumber()
  port?: number;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsString()
  verificationCode?: string;

  @IsOptional()
  @IsString()
  cloudAccountId?: string;

  @IsOptional()
  @IsString()
  streamToken?: string;

  @IsOptional()
  @IsEnum(["connected", "not_configured", "error", "pending"])
  integrationStatus?: string;
}

export class RegisterBranchSensorDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  @IsEnum([
    "temperature",
    "humidity",
    "smoke",
    "motion",
    "door",
    "power",
    "other",
  ])
  type: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  serialNumber?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsNumber()
  minThreshold?: number;

  @IsOptional()
  @IsNumber()
  maxThreshold?: number;

  @IsOptional()
  @IsString()
  location?: string;
}
export class CheckoutDto {
  @IsString()
  @IsNotEmpty()
  store_id: string;

  @IsString()
  @IsNotEmpty()
  terminal_id: string;

  @IsOptional()
  @IsString()
  customer_id?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsString()
  @IsNotEmpty()
  @IsEnum(["cash", "card", "qr", "wallet", "CASH", "EDC", "GATEWAY"])
  payment_method: string;

  @IsOptional()
  @IsString()
  external_ref?: string;

  /**
   * Decimal(19,4)-safe payment received.
   */
  @Transform(toDecimalString)
  @Matches(DECIMAL_19_4_RE)
  payment_received: string;

  /**
   * Decimal(19,4)-safe grand total.
   */
  @Transform(toDecimalString)
  @Matches(DECIMAL_19_4_RE)
  grand_total: string;

  @IsOptional()
  @IsString()
  shift_id?: string;

  @IsOptional()
  @IsString()
  payment_channel?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @Transform(toDecimalString)
  @Matches(DECIMAL_19_4_RE)
  cart_discount?: string;
}
