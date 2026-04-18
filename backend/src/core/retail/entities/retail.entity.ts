export interface StoreOperationalConfig {
  business_hours_template?: string;
  default_shift_model?: string;
  enabled_modules?: string[];
  pos_device_limit?: number;
  self_checkout_enabled?: boolean;
  payment_methods_allowed?: string[];
  refund_policy_mode?: "strict" | "flexible" | "manager_only";
  auto_close_shift_setting?: boolean;
}

export interface StoreSupplyConfig {
  default_inbound_warehouse_id?: string;
  transfer_priority_policy?: "speed" | "cost" | "balanced";
  replenishment_rule_set?: string;
  safety_stock_policy?: string;
  auto_reorder_threshold_template?: string;
  fulfillment_fallback_routing?: string[];
}

export interface StoreInfrastructureRegistry {
  registered_device_ids?: string[];
  pos_clusters?: string[];
  scanner_pools?: string[];
  local_server_binding?: string;
  sync_interval?: number;
  offline_tolerance_threshold?: number;
}

export interface StoreChannelBinding {
  linked_ecommerce_store_id?: string;
  marketplace_integrations?: string[];
  channel_priority?: string[];
  order_routing_logic?: string;
  online_to_offline_sync_policy?: string;
}

export interface StoreGovernanceData {
  license_status: "active" | "expired" | "frozen";
  activation_date?: Date;
  activation_source: "LAN-first" | "Cloud";
  compliance_level: number;
  audit_frequency_tier: "standard" | "high" | "critical";
  data_retention_policy?: string;
  decommission_trigger?: string;
}

export interface StoreConfigVersion {
  updated_by: string;
  updated_at: Date;
  revision_number: number;
}

export class RetailStore {
  id: string;
  tenant_id: string;
  location_id: string;
  name: string;
  code: string;
  type: "flagship" | "satellite" | "warehouse";
  status: "active" | "frozen" | "archived" | "decommissioned";
  address: string;
  phone?: string;
  email?: string;
  timezone: string;
  currency: string;
  tax_zone?: string;
  manager_id?: string;
  inventory_pool_id?: string;

  // Hierarchical Config
  operational_config?: StoreOperationalConfig;
  supply_config?: StoreSupplyConfig;
  infrastructure_registry?: StoreInfrastructureRegistry;
  channel_binding?: StoreChannelBinding;
  governance?: StoreGovernanceData;

  // Versioning
  config_version?: StoreConfigVersion;

  created_at: Date;
  updated_at: Date;
}

export class InventoryPool {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  type: "shared" | "exclusive";
  stock?: InventoryPoolStock[];
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

export class InventoryPoolStock {
  id: string;
  pool_id: string;
  product_id: string;
  quantity: number;
  reserved: number;
  available: number;
  created_at: Date;
  updated_at: Date;
}

export interface SEOData {
  title: string;
  meta_description: string;
  keywords: string[];
}

export interface MultiCurrencyPrice {
  amount: number;
  currency: string;
}

export interface ProductVariant {
  id: string;
  sku_suffix: string;
  name: string;
  price_adjustment: number;
  attributes: Record<string, string>; // e.g., { "color": "red", "size": "XL" }
}

export class RetailProduct {
  id: string;
  tenant_id: string;
  sku: string;
  barcode: string;
  name: string;
  description: string;
  category_id: string;
  category_name?: string;
  base_price: number;
  currency: string;
  prices: MultiCurrencyPrice[];
  tax_rate: number;
  unit: string;
  type: "ITEM" | "SERVICE" | "RAW_MATERIAL";
  status: "active" | "discontinued" | "draft";
  variants: ProductVariant[];
  seo?: SEOData;
  metadata?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export type OrderStatus =
  | "pending"
  | "reserved"
  | "paid"
  | "shipped"
  | "completed"
  | "cancelled"
  | "refunded";

export class RetailOrder {
  id: string;
  tenant_id: string;
  location_id: string;
  store_id: string;
  terminal_id: string;
  cashier_id: string;
  customer_id?: string;
  customer_name?: string;
  status: OrderStatus;
  items: RetailOrderItem[];
  subtotal: number;
  tax_total: number;
  discount_total: number;
  grand_total: number;
  currency: string;
  payment_method: "cash" | "card" | "qr" | "wallet";
  payment_status: "unpaid" | "paid" | "partial";
  reservation_expires_at?: Date;
  metadata?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export class RetailOrderItem {
  product_id: string;
  variant_id?: string;
  sku: string;
  name: string;
  quantity: number;
  unit_price: number;
  tax_amount: number;
  discount_amount: number;
  total_price: number;
}

export class RetailShift {
  id: string;
  tenant_id: string;
  location_id: string;
  store_id: string;
  employee_id: string;
  terminal_id: string;
  start_time: Date;
  end_time?: Date;
  opening_cash: number;
  closing_cash?: number;
  expected_cash?: number;
  status: "open" | "closed" | "reconciled";
  notes?: string;
}

export class RetailGatewayNode {
  id: string;
  tenant_id: string;
  load_balancer_id?: string;
  node_name: string;
  ip_address?: string;
  port: number;
  status: "ACTIVE" | "STANDBY" | "DOWN";
  health_score: number;
  last_heartbeat?: Date;
  version?: string;
  region?: string;
  created_at: Date;
  updated_at: Date;
}

export class RetailLoadBalancer {
  id: string;
  tenant_id: string;
  name: string;
  virtual_ip?: string;
  algorithm: string;
  status: "ONLINE" | "OFFLINE";
  created_at: Date;
  updated_at: Date;
  nodes?: RetailGatewayNode[];
}

export class ProductProjection {
  id: string;
  item_master_id: string;
  tenant_id: string;
  location_id?: string;
  module_type: string;
  custom_name?: string;
  custom_description?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export class LabelConfig {
  id: string;
  tenant_id: string;
  location_id?: string;
  module_type: string;
  field_key: string;
  display_label: string;
  created_at: Date;
  updated_at: Date;
}
