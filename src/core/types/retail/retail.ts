import type { HRAuditFields } from "@/core/types/hr/base";

// ============================================================
// PHYSICAL BRANCH (Store)
// ============================================================

export type RetailStoreStatus =
  | "active"
  | "inactive"
  | "maintenance"
  | "decommissioned";
export type RetailStoreType =
  | "flagship"
  | "express"
  | "kiosk"
  | "pop-up"
  | "warehouse";

export interface RetailStore extends HRAuditFields {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  locationId: string;
  type: RetailStoreType;
  status: RetailStoreStatus;
  managerId?: string;
  phone?: string;
  email?: string;
  timezone?: string;
  address?: string;
  operatingHours?: Record<string, unknown>;
  inventoryPoolId?: string; // null = private per-location inventory
  settings?: Record<string, unknown>;
}

// ============================================================
// ECOMMERCE STORE
// ============================================================

export type EcommercePlatform =
  | "shopify"
  | "woocommerce"
  | "tokopedia"
  | "shopee"
  | "lazada"
  | "tiktok"
  | "custom";

export interface EcommerceStore extends HRAuditFields {
  id: string;
  tenantId: string;
  name: string;
  platform: EcommercePlatform;
  domain: string;
  apiKey: string;
  status: "active" | "inactive" | "suspended";
  inventoryPoolId?: string; // null = private
  managerId?: string;
  /** IDs of physical Store branches this e-commerce store serves */
  branchIds?: string[];
  settings?: Record<string, unknown>;
}

// ============================================================
// INVENTORY POOL
// ============================================================

export interface InventoryPool extends HRAuditFields {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  /** shared = multiple stores from same pool | exclusive = dedicated to one store */
  type: "shared" | "exclusive";
}

export interface InventoryPoolStock {
  poolId: string;
  productId: string;
  onHand: number;
  reserved: number;
  available: number;
}

// ============================================================
// POS DEVICE
// ============================================================

export type POSDeviceType =
  | "pos_terminal"
  | "kiosk"
  | "mobile_pos"
  | "scanner"
  | "refund_desk";

export interface POSDevice extends HRAuditFields {
  id: string;
  tenantId: string;
  storeId: string;
  name: string;
  type: POSDeviceType;
  isActive: boolean;
  macAddress?: string;
}

// ============================================================
// ORDERS
// ============================================================

export type OrderStatus =
  | "draft"
  | "pending_payment"
  | "reserved"
  | "paid"
  | "fulfilled"
  | "cancelled"
  | "refunded";

export interface RetailOrderItem {
  itemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  discount?: number;
}

export interface RetailOrder extends HRAuditFields {
  id: string;
  tenantId: string;
  storeId: string;
  deviceId: string;
  cashierId: string;
  customerName?: string;
  status: OrderStatus;
  items: RetailOrderItem[];
  subtotal: number;
  tax: number;
  totalAmount: number;
  paymentMethod?: "card" | "cash" | "qr" | "store_credit";
  paymentReference?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// LICENSE
// ============================================================

export interface RetailLicense {
  tenantId: string;
  status: "active" | "expired" | "frozen";
  maxBranches: number;
  maxEcommerceStores: number;
  expiryDate: string;
}

// ============================================================
// PROMOTIONS
// ============================================================

export type PromotionType = "percentage" | "fixed_amount" | "bogo" | "bundle";
export type PromotionStatus = "draft" | "active" | "scheduled" | "expired";

export interface RetailPromotion extends HRAuditFields {
  id: string;
  tenantId: string;
  title: string;
  type: PromotionType;
  value: number;
  startDate: string;
  endDate: string;
  status: PromotionStatus;
  target?: "all" | "category" | "specific_items";
  targetIds?: string[];
}

// ============================================================
// CHANNELS (Legacy Ecommerce Hub)
// ============================================================

export type ChannelType = "DIRECT" | "OWNED" | "MARKETPLACE";
export type ChannelStatus = "active" | "inactive" | "warning";

export interface RetailChannel extends HRAuditFields {
  id: string;
  tenantId: string;
  branchId?: string;
  name: string;
  type: ChannelType;
  status: ChannelStatus;
  syncFrequency: string;
  lastSync?: string;
  channelId?: string;
  clientId?: string;
  clientSecret?: string;
  gatewayUrl?: string;
  connector?: string;
  settings?: Record<string, unknown>;
}

// ============================================================
// SHIFTS
// ============================================================

export interface RetailShift extends HRAuditFields {
  id: string;
  tenantId: string;
  storeId: string;
  employeeId: string;
  startTime: string;
  endTime?: string;
  openingCash: number;
  closingCash?: number;
  expectedCash?: number;
  status: "open" | "closed";
  notes?: string;
}

// ============================================================
// CUSTOMERS
// ============================================================

export interface RetailCustomer extends HRAuditFields {
  id: string;
  tenantId: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  tier: "regular" | "silver" | "gold" | "platinum";
  points: number;
}

// ============================================================
// GATEWAY INFRASTRUCTURE
// ============================================================

export type GatewayNodeStatus = "ACTIVE" | "STANDBY" | "DOWN";

export interface RetailGatewayNode extends HRAuditFields {
  id: string;
  tenantId: string;
  loadBalancerId?: string;
  nodeName: string;
  ipAddress?: string;
  port: number;
  status: GatewayNodeStatus;
  healthScore: number;
  lastHeartbeat?: string;
  version?: string;
  region?: string;
}

export interface RetailLoadBalancer extends HRAuditFields {
  id: string;
  tenantId: string;
  name: string;
  virtualIp?: string;
  algorithm: string;
  status: "ONLINE" | "OFFLINE";
  nodes?: RetailGatewayNode[];
}

// ============================================================
// PRODUCTS
// ============================================================

export interface RetailProduct extends HRAuditFields {
  id: string;
  tenantId: string;
  sku: string;
  barcode: string;
  name: string;
  description: string;
  categoryId: string;
  basePrice: number;
  currency: string;
  taxRate: number;
  unit: string;
  status: "active" | "discontinued" | "draft";
  /** Convenience field for legacy components */
  price: number;
  /** Current stock level (on-hand) */
  stock?: number;
}
