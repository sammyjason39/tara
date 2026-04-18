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
} from "class-validator";
import { Type, Transform } from "class-transformer";

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
  @IsEnum(["flagship", "satellite", "warehouse"])
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

  @IsNumber()
  @IsNotEmpty()
  quantity: number;

  @IsNumber()
  @IsNotEmpty()
  unit_price: number;

  @IsOptional()
  @IsString()
  variant_id?: string;

  @IsOptional()
  @IsString()
  name?: string;
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

  @IsNumber()
  @IsNotEmpty()
  @Transform(({ obj, value }) => value ?? obj.grand_total, {
    toClassOnly: true,
  })
  grand_total: number;

  @IsOptional()
  @IsString()
  shift_id?: string;
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

  @IsOptional()
  @IsString()
  @Transform(({ obj, value }) => value ?? obj.ecommerce_id, {
    toClassOnly: true,
  })
  ecommerce_id?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  type?: string;

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
  @IsString()
  location_id?: string;
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
  @IsEnum(["pc", "tablet", "scanner", "printer", "pos_terminal", "other"])
  type: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  serial_number?: string;

  @IsOptional()
  @IsString()
  @IsEnum(["tcp_ip", "usb", "bluetooth", "com_port", "wifi", "other"])
  conn_type?: string;

  @IsOptional()
  @IsString()
  ip_address?: string;

  @IsOptional()
  @IsString()
  mac_address?: string;

  @IsOptional()
  @IsString()
  com_port?: string;

  @IsOptional()
  @IsString()
  usb_port?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  assignment?: { role?: string; employee_id?: string; shift_bound?: boolean };
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
  resolution_mp?: number;

  @IsOptional()
  @IsBoolean()
  has_night_vision?: boolean;

  @IsOptional()
  @IsBoolean()
  has_ptz?: boolean;

  @IsOptional()
  @IsString()
  hls_url?: string;

  @IsOptional()
  @IsString()
  rtsp_url?: string;

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
  verification_code?: string;

  @IsOptional()
  @IsString()
  cloud_account_id?: string;

  @IsOptional()
  @IsString()
  stream_token?: string;

  @IsOptional()
  @IsEnum(["connected", "not_configured", "error", "pending"])
  integration_status?: string;
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
  serial_number?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsNumber()
  min_threshold?: number;

  @IsOptional()
  @IsNumber()
  max_threshold?: number;

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
  @IsEnum(["cash", "card", "qr", "wallet"])
  payment_method: "cash" | "card" | "qr" | "wallet";

  @IsNumber()
  @IsNotEmpty()
  payment_received: number;

  @IsNumber()
  @IsNotEmpty()
  grand_total: number;

  @IsOptional()
  @IsString()
  shift_id?: string;

  @IsOptional()
  @IsString()
  payment_channel?: string;
}
