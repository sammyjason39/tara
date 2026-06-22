/**
 * Retail Module — Zod Validation Schemas
 *
 * Provides client-side validation for all Retail domain entities:
 * - POS Transactions (line items with quantity 1-9999, discount % or fixed, payment method)
 * - Pricing Rules (product/category-based discount, date range)
 * - Shift Control (open/close with cash reconciliation)
 * - Channels (physical/online management with sync config)
 * - Promotions (percentage, fixed, BOGO, bundle)
 * - Products (SKU, pricing, category)
 * - Stores (registration, profile update)
 * - Devices (branch device, CCTV, sensor registration)
 * - Inventory (stock edit, movement, product detail)
 * - Orders (fulfillment, detail)
 * - Customers (create/edit)
 * - Staff (role modification)
 * - Refunds/Returns
 * - Cash Movements
 *
 * These schemas enforce Requirements 8.1, 8.2, 8.5, 8.6, 16.1.
 */

import { z } from "zod";

// ═══════════════════════════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════════════════════════

export const POS_PAYMENT_METHODS = ["cash", "electronic"] as const;
export const POS_DISCOUNT_TYPES = ["percentage", "fixed"] as const;
export const CHANNEL_TYPES = ["DIRECT", "OWNED", "MARKETPLACE"] as const;
export const CHANNEL_STATUSES = ["active", "inactive", "warning"] as const;
export const PROMOTION_TYPES = ["percentage", "fixed_amount", "bogo", "bundle"] as const;
export const PROMOTION_STATUSES = ["draft", "active", "scheduled", "expired"] as const;
export const STORE_TYPES = ["flagship", "satellite", "warehouse", "ecommerce", "express", "kiosk", "pop-up"] as const;
export const STORE_STATUSES = ["active", "frozen", "archived", "decommissioned"] as const;
export const DEVICE_TYPES = ["pc", "tablet", "scanner", "printer", "pos_terminal", "other"] as const;
export const CCTV_PROVIDERS = ["ezviz", "dahua", "hikvision", "reolink", "axis", "custom", "other"] as const;
export const SENSOR_TYPES = ["temperature", "humidity", "smoke", "motion", "door", "power", "other"] as const;
export const ORDER_STATUSES = ["draft", "pending_payment", "reserved", "paid", "processing", "ready_for_pickup", "shipped", "complete", "cancelled", "refunded"] as const;
export const PRODUCT_STATUSES = ["active", "discontinued", "draft"] as const;

// ═══════════════════════════════════════════════════════════════════════════════
// POS TRANSACTION SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

export const posLineItemSchema = z.object({
  itemId: z.string().min(1, "Item ID or SKU is required"),
  sku: z.string().optional().default(""),
  itemName: z.string().optional().default(""),
  quantity: z.coerce
    .number()
    .int("Quantity must be a whole number")
    .min(1, "Quantity must be at least 1")
    .max(9999, "Quantity must be at most 9999"),
  unitPrice: z.coerce.number().min(0, "Unit price must be non-negative").optional(),
  discountType: z.enum(POS_DISCOUNT_TYPES).optional(),
  discountValue: z.coerce
    .number()
    .min(0, "Discount value must be non-negative")
    .max(100, "Discount value must be at most 100")
    .optional()
    .default(0),
});

export type PosLineItemInput = z.infer<typeof posLineItemSchema>;

export const createPosTransactionSchema = z.object({
  lineItems: z
    .array(posLineItemSchema)
    .min(1, "Transaction must have at least 1 line item"),
  paymentMethod: z.enum(POS_PAYMENT_METHODS, {
    required_error: "Payment method is required",
  }),
  storeId: z.string().optional().default(""),
  terminalId: z.string().optional().default(""),
  customerId: z.string().optional().default(""),
  shiftId: z.string().optional().default(""),
  notes: z.string().optional().default(""),
});

export type CreatePosTransactionInput = z.infer<typeof createPosTransactionSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// PRICING RULE SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

export const createPricingRuleSchema = z.object({
  name: z.string().min(1, "Pricing rule name is required").max(200, "Name must be at most 200 characters"),
  productId: z.string().optional().default(""),
  categoryId: z.string().optional().default(""),
  discountType: z.enum(POS_DISCOUNT_TYPES, {
    required_error: "Discount type is required",
  }),
  discountValue: z.coerce
    .number()
    .min(0, "Discount value must be non-negative")
    .max(100, "Discount value must be at most 100"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  priority: z.coerce.number().int().min(0).optional().default(0),
  isActive: z.boolean().optional().default(true),
}).refine(
  (data) => !data.startDate || !data.endDate || new Date(data.endDate) >= new Date(data.startDate),
  { message: "End date must be equal to or later than start date", path: ["endDate"] }
);

export type CreatePricingRuleInput = z.infer<typeof createPricingRuleSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// SHIFT CONTROL SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

export const openShiftSchema = z.object({
  storeId: z.string().min(1, "Store is required"),
  terminalId: z.string().min(1, "Terminal is required"),
  openingCash: z.coerce.number().min(0, "Opening cash must be non-negative"),
});

export type OpenShiftInput = z.infer<typeof openShiftSchema>;

export const closeShiftSchema = z.object({
  closingCash: z.coerce.number().min(0, "Closing cash must be non-negative"),
  countedCash: z.coerce.number().min(0, "Counted cash must be non-negative").optional(),
  variance: z.coerce.number().optional(),
  notes: z.string().max(500, "Notes must be at most 500 characters").optional().default(""),
  closingNote: z.string().max(500).optional().default(""),
});

export type CloseShiftInput = z.infer<typeof closeShiftSchema>;

export const editShiftSchema = z.object({
  storeId: z.string().min(1, "Store is required"),
  terminalId: z.string().min(1, "Terminal is required"),
  employeeId: z.string().min(1, "Operator is required"),
  openingCash: z.coerce.number().min(0, "Opening cash must be non-negative"),
  closingCash: z.coerce.number().min(0).optional(),
  notes: z.string().max(500).optional().default(""),
});

export type EditShiftInput = z.infer<typeof editShiftSchema>;

export const shiftGovernanceSchema = z.object({
  policyName: z.string().min(1, "Policy name is required").max(100),
  maxShiftDurationHours: z.coerce.number().min(1, "Must be at least 1 hour").max(24, "Cannot exceed 24 hours"),
  autoCloseEnabled: z.boolean().default(false),
  reconciliationRequired: z.boolean().default(true),
  varianceThreshold: z.coerce.number().min(0, "Threshold must be non-negative").optional().default(0),
});

export type ShiftGovernanceInput = z.infer<typeof shiftGovernanceSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// CHANNEL MANAGEMENT SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

export const createChannelSchema = z.object({
  name: z.string().min(1, "Channel name is required").max(200, "Name must be at most 200 characters"),
  type: z.enum(CHANNEL_TYPES, { required_error: "Channel type is required" }),
  status: z.enum(CHANNEL_STATUSES).optional().default("active"),
  syncFrequency: z.string().min(1, "Sync frequency is required").default("hourly"),
  connector: z.string().optional().default(""),
  gatewayUrl: z.string().url("Must be a valid URL").or(z.literal("")).optional().default(""),
  clientId: z.string().optional().default(""),
  clientSecret: z.string().optional().default(""),
  settings: z.record(z.unknown()).optional(),
});

export type CreateChannelInput = z.infer<typeof createChannelSchema>;

export const manageConnectorSchema = z.object({
  channelId: z.string().min(1, "Channel is required"),
  connector: z.string().min(1, "Connector type is required"),
  gatewayUrl: z.string().url("Must be a valid URL").or(z.literal("")),
  clientId: z.string().optional().default(""),
  clientSecret: z.string().optional().default(""),
  syncFrequency: z.string().optional().default("hourly"),
});

export type ManageConnectorInput = z.infer<typeof manageConnectorSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// PROMOTION SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

export const createPromotionSchema = z.object({
  title: z.string().min(1, "Promotion title is required").max(200),
  type: z.enum(PROMOTION_TYPES, { required_error: "Promotion type is required" }),
  value: z.coerce.number().min(0, "Value must be non-negative"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  target: z.enum(["all", "category", "specific_items"]).optional().default("all"),
  targetIds: z.array(z.string()).optional().default([]),
  conditions: z.string().optional().default(""),
}).refine(
  (data) => new Date(data.endDate) >= new Date(data.startDate),
  { message: "End date must be equal to or later than start date", path: ["endDate"] }
);

export type CreatePromotionInput = z.infer<typeof createPromotionSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// STORE MANAGEMENT SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

export const createStoreSchema = z.object({
  name: z.string().min(1, "Store name is required").max(200),
  code: z.string().min(1, "Store code is required").max(20),
  locationId: z.string().min(1, "Location is required"),
  type: z.enum(STORE_TYPES, { required_error: "Store type is required" }),
  address: z.string().optional().default(""),
  phone: z.string().optional().default(""),
  email: z.string().email("Must be a valid email").or(z.literal("")).optional().default(""),
  timezone: z.string().optional().default(""),
  currency: z.string().optional().default(""),
  managerId: z.string().optional().default(""),
});

export type CreateStoreInput = z.infer<typeof createStoreSchema>;

export const registerEcommerceBranchSchema = z.object({
  name: z.string().min(1, "Store name is required").max(200),
  code: z.string().optional().default(""),
  locationId: z.string().min(1, "Location is required"),
  platform: z.enum(["shopify", "woocommerce", "tokopedia", "shopee", "lazada", "tiktok", "custom"]).optional(),
  domain: z.string().optional().default(""),
  inventoryPoolId: z.string().optional().default(""),
  managerId: z.string().optional().default(""),
  channelName: z.string().optional().default(""),
  channelType: z.string().optional().default(""),
  syncFrequency: z.string().optional().default("hourly"),
});

export type RegisterEcommerceBranchInput = z.infer<typeof registerEcommerceBranchSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCT / INVENTORY SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

export const editProductSchema = z.object({
  name: z.string().min(1, "Product name is required").max(200),
  sku: z.string().min(1, "SKU is required").max(50),
  barcode: z.string().optional().default(""),
  description: z.string().optional().default(""),
  categoryId: z.string().min(1, "Category is required"),
  basePrice: z.coerce.number().min(0, "Price must be non-negative"),
  unit: z.string().min(1, "Unit is required"),
  status: z.enum(PRODUCT_STATUSES).optional().default("active"),
});

export type EditProductInput = z.infer<typeof editProductSchema>;

export const stockEditSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  quantity: z.coerce.number().int("Quantity must be a whole number"),
  reason: z.string().min(1, "Reason is required").max(500, "Reason must be at most 500 characters"),
});

export type StockEditInput = z.infer<typeof stockEditSchema>;

export const inventoryMovementSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  fromLocationId: z.string().min(1, "Source location is required"),
  toLocationId: z.string().min(1, "Destination location is required"),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1"),
  reason: z.string().optional().default(""),
});

export type InventoryMovementInput = z.infer<typeof inventoryMovementSchema>;

export const reportFilterSchema = z.object({
  startDate: z.string().optional().default(""),
  endDate: z.string().optional().default(""),
  categoryId: z.string().optional().default(""),
  storeId: z.string().optional().default(""),
  status: z.string().optional().default(""),
});

export type ReportFilterInput = z.infer<typeof reportFilterSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// DEVICE / CCTV / SENSOR SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

export const registerDeviceSchema = z.object({
  name: z.string().min(1, "Device name is required").max(100),
  storeId: z.string().min(1, "Store is required"),
  type: z.enum(DEVICE_TYPES, { required_error: "Device type is required" }),
  model: z.string().optional().default(""),
  serialNumber: z.string().optional().default(""),
  ipAddress: z.string().optional().default(""),
  macAddress: z.string().optional().default(""),
  notes: z.string().max(500).optional().default(""),
});

export type RegisterDeviceInput = z.infer<typeof registerDeviceSchema>;

export const registerCctvSchema = z.object({
  name: z.string().min(1, "Camera name is required").max(100),
  provider: z.enum(CCTV_PROVIDERS, { required_error: "Provider is required" }),
  model: z.string().optional().default(""),
  location: z.string().optional().default(""),
  hlsUrl: z.string().url("Must be a valid URL").or(z.literal("")).optional().default(""),
  rtspUrl: z.string().optional().default(""),
  ipAddress: z.string().optional().default(""),
  port: z.coerce.number().int().min(0).max(65535).optional(),
  username: z.string().optional().default(""),
  password: z.string().optional().default(""),
  resolutionMp: z.coerce.number().min(0).optional(),
  hasNightVision: z.boolean().optional().default(false),
  hasPtz: z.boolean().optional().default(false),
});

export type RegisterCctvInput = z.infer<typeof registerCctvSchema>;

export const registerSensorSchema = z.object({
  name: z.string().min(1, "Sensor name is required").max(100),
  type: z.enum(SENSOR_TYPES, { required_error: "Sensor type is required" }),
  model: z.string().optional().default(""),
  serialNumber: z.string().optional().default(""),
  unit: z.string().optional().default(""),
  minThreshold: z.coerce.number().optional(),
  maxThreshold: z.coerce.number().optional(),
  location: z.string().optional().default(""),
});

export type RegisterSensorInput = z.infer<typeof registerSensorSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// ORDER / FULFILLMENT SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

export const updateOrderStatusSchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
  status: z.enum(ORDER_STATUSES, { required_error: "Status is required" }),
  notes: z.string().optional().default(""),
});

export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// CUSTOMER SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

export const createCustomerSchema = z.object({
  name: z.string().min(1, "Customer name is required").max(200),
  email: z.string().email("Must be a valid email").or(z.literal("")).optional().default(""),
  phone: z.string().optional().default(""),
  address: z.string().optional().default(""),
  tier: z.enum(["regular", "silver", "gold", "platinum"]).optional().default("regular"),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// STAFF SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

export const roleModificationSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  role: z.string().min(1, "Role is required"),
  effectiveDate: z.string().optional().default(""),
  notes: z.string().max(500).optional().default(""),
});

export type RoleModificationInput = z.infer<typeof roleModificationSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// REFUND / RETURN SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

export const createRefundSchema = z.object({
  transactionId: z.string().min(1, "Transaction reference is required"),
  reason: z.string().min(1, "Reason is required").max(500),
  items: z.array(z.object({
    itemId: z.string().min(1),
    quantity: z.coerce.number().int().min(1, "Quantity must be at least 1"),
  })).min(1, "At least 1 item must be selected for refund"),
  refundMethod: z.enum(["cash", "original_payment", "store_credit"], {
    required_error: "Refund method is required",
  }),
});

export type CreateRefundInput = z.infer<typeof createRefundSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// CASH MOVEMENT SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

export const cashMovementSchema = z.object({
  type: z.enum(["deposit", "withdrawal", "petty_cash"], {
    required_error: "Movement type is required",
  }),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  reason: z.string().min(1, "Reason is required").max(500),
  shiftId: z.string().optional().default(""),
});

export type CashMovementInput = z.infer<typeof cashMovementSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIT TRAIL SCHEMA (read-only filter)
// ═══════════════════════════════════════════════════════════════════════════════

export const auditTrailFilterSchema = z.object({
  entityType: z.string().optional().default(""),
  action: z.string().optional().default(""),
  startDate: z.string().optional().default(""),
  endDate: z.string().optional().default(""),
  userId: z.string().optional().default(""),
});

export type AuditTrailFilterInput = z.infer<typeof auditTrailFilterSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// RECEIVING TERMINAL SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

export const receivingSchema = z.object({
  purchaseOrderId: z.string().min(1, "PO reference is required"),
  items: z.array(z.object({
    productId: z.string().min(1, "Product is required"),
    expectedQty: z.coerce.number().int().min(0),
    receivedQty: z.coerce.number().int().min(0, "Received quantity cannot be negative"),
    condition: z.enum(["good", "damaged", "missing"]).default("good"),
  })).min(1, "At least 1 item must be received"),
  notes: z.string().max(500).optional().default(""),
});

export type ReceivingInput = z.infer<typeof receivingSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// STOCK OPNAME (Physical Count) SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

export const stockOpnameSchema = z.object({
  locationId: z.string().min(1, "Location is required"),
  items: z.array(z.object({
    productId: z.string().min(1, "Product is required"),
    systemQty: z.coerce.number().int().min(0),
    countedQty: z.coerce.number().int().min(0, "Counted quantity cannot be negative"),
  })).min(1, "At least 1 item must be counted"),
  notes: z.string().max(500).optional().default(""),
});

export type StockOpnameInput = z.infer<typeof stockOpnameSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// LINE ITEM ARITHMETIC (shared utility for POS & Quotations)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculates line item total based on discount type.
 * Mirrors backend business rule engine `calculateLineTotal`.
 */
export function calculateLineTotal(
  quantity: number,
  unitPrice: number,
  discountType?: "percentage" | "fixed",
  discountValue?: number
): number {
  const subtotal = quantity * unitPrice;
  if (!discountType || !discountValue || discountValue <= 0) return subtotal;
  if (discountType === "percentage") {
    return subtotal * (1 - discountValue / 100);
  }
  return Math.max(0, subtotal - discountValue);
}

/**
 * Calculates the grand total of all line items.
 */
export function calculateGrandTotal(
  items: Array<{
    quantity: number;
    unitPrice: number;
    discountType?: "percentage" | "fixed";
    discountValue?: number;
  }>
): number {
  return items.reduce(
    (sum, item) =>
      sum +
      calculateLineTotal(item.quantity, item.unitPrice, item.discountType, item.discountValue),
    0
  );
}
