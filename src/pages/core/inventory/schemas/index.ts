/**
 * Zod validation schemas for the Inventory module.
 *
 * Covers: Items, Stock Adjustments, Transfers, Import Jobs, Movements, and Images.
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 16.1
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Item Schemas
// ---------------------------------------------------------------------------

export const createItemSchema = z.object({
  sku: z
    .string()
    .min(1, "SKU is required")
    .max(50, "SKU must be at most 50 characters"),
  name: z
    .string()
    .min(1, "Name is required")
    .max(200, "Name must be at most 200 characters"),
  category: z.string().min(1, "Category is required"),
  uom: z.string().min(1, "Unit of measure is required"),
  base_price: z.coerce.number().min(0, "Base price must be 0 or greater").default(0),
  description: z.string().max(1000).optional().default(""),
  minStock: z.coerce.number().min(0).optional().default(0),
  status: z.string().optional().default("active"),
});

export type CreateItemInput = z.infer<typeof createItemSchema>;

export const updateItemSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(200, "Name must be at most 200 characters")
    .optional(),
  sku: z
    .string()
    .min(1, "SKU is required")
    .max(50, "SKU must be at most 50 characters")
    .optional(),
  category: z.string().min(1, "Category is required").optional(),
  category_id: z.string().optional(),
  uom: z.string().min(1, "Unit of measure is required").optional(),
  base_price: z.coerce.number().min(0, "Base price must be 0 or greater").optional(),
  selling_price: z.coerce.number().min(0).optional(),
  discount_rate: z.coerce.number().min(0).max(100).optional(),
  description: z.string().max(1000).optional(),
  status: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type UpdateItemInput = z.infer<typeof updateItemSchema>;

// ---------------------------------------------------------------------------
// Stock Adjustment Schema
// ---------------------------------------------------------------------------

export const stockAdjustmentSchema = z.object({
  item_id: z.string().min(1, "Item is required"),
  location_id: z.string().min(1, "Location is required"),
  department_id: z.string().optional().default(""),
  requested_delta: z.coerce.number().refine((val) => val !== 0, {
    message: "Delta must be non-zero",
  }),
  reason: z
    .string()
    .min(1, "Reason is required")
    .max(500, "Reason must be at most 500 characters"),
});

export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>;

/**
 * Validates that applying a delta to the current balance won't result in a negative balance.
 * Returns an error message or null if valid.
 */
export function validateNonNegativeBalance(
  currentBalance: number,
  delta: number
): string | null {
  const newBalance = currentBalance + delta;
  if (newBalance < 0) {
    return `Insufficient stock: current balance is ${currentBalance}, adjustment of ${delta} would result in ${newBalance}`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Transfer Schema
// ---------------------------------------------------------------------------

export const createTransferSchema = z
  .object({
    item_id: z.string().min(1, "Item is required"),
    from_location_id: z.string().min(1, "Origin location is required"),
    to_location_id: z.string().min(1, "Destination location is required"),
    quantity: z.coerce.number().positive("Quantity must be greater than 0"),
    from_department_id: z.string().optional().default(""),
    to_department_id: z.string().optional().default(""),
    reason: z.string().max(500).optional().default("Stock transfer"),
  })
  .refine((data) => data.from_location_id !== data.to_location_id, {
    message: "Origin and destination must be different",
    path: ["to_location_id"],
  });

export type CreateTransferInput = z.infer<typeof createTransferSchema>;

// ---------------------------------------------------------------------------
// Import Job Schema
// ---------------------------------------------------------------------------

export const importJobSchema = z.object({
  format: z.enum(["CSV", "Excel"], {
    required_error: "Format is required",
  }),
});

export type ImportJobInput = z.infer<typeof importJobSchema>;

// ---------------------------------------------------------------------------
// Movement Schema
// ---------------------------------------------------------------------------

export const createMovementSchema = z.object({
  item_id: z.string().min(1, "Item is required"),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  type: z.enum(["IN", "OUT", "TRANSFER"], {
    required_error: "Movement type is required",
  }),
  location_id: z.string().min(1, "Location is required"),
  notes: z.string().max(500).optional().default(""),
});

export type CreateMovementInput = z.infer<typeof createMovementSchema>;

// ---------------------------------------------------------------------------
// Batch Intake Schema
// ---------------------------------------------------------------------------

export const batchIntakeRowSchema = z.object({
  item_id: z.string().min(1, "Product ID/SKU is required"),
  location_id: z.string().min(1, "Location is required"),
  department_id: z.string().optional().default(""),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  unit_cost: z.coerce.number().min(0, "Unit cost must be 0 or greater").default(0),
  reason: z.string().optional().default("Batch Intake"),
});

export const batchIntakeSchema = z.object({
  items: z
    .array(batchIntakeRowSchema)
    .min(1, "At least one item is required"),
});

export type BatchIntakeInput = z.infer<typeof batchIntakeSchema>;

// ---------------------------------------------------------------------------
// Batch Transfer Schema
// ---------------------------------------------------------------------------

export const batchTransferSchema = z.object({
  to_location_id: z.string().min(1, "Destination location is required"),
  to_department_id: z.string().optional().default(""),
  reason: z.string().max(500).optional().default("Batch Internal Transfer"),
});

export type BatchTransferInput = z.infer<typeof batchTransferSchema>;

// ---------------------------------------------------------------------------
// Receiving Schema (Procurement Receipt)
// ---------------------------------------------------------------------------

export const receivingItemSchema = z.object({
  sku: z.string().min(1, "SKU is required"),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  unit_cost: z.coerce.number().min(0, "Unit cost must be 0 or greater").default(0),
});

export const receivingSchema = z.object({
  location_id: z.string().min(1, "Location is required"),
  items: z
    .array(receivingItemSchema)
    .min(1, "At least one item is required"),
});

export type ReceivingInput = z.infer<typeof receivingSchema>;

// ---------------------------------------------------------------------------
// Audit Cycle Schema
// ---------------------------------------------------------------------------

export const startAuditCycleSchema = z.object({
  location_id: z.string().min(1, "Location is required"),
  department_id: z.string().optional().default(""),
  scope: z.enum(["LOCATION", "DEPARTMENT", "ITEM"], {
    required_error: "Scope is required",
  }),
});

export type StartAuditCycleInput = z.infer<typeof startAuditCycleSchema>;

// ---------------------------------------------------------------------------
// Courier/Integration Schema (replaces FutureIntegrationDialog stub)
// ---------------------------------------------------------------------------

export const courierDispatchSchema = z.object({
  transfer_id: z.string().min(1, "Transfer is required"),
  courier_name: z.string().min(1, "Courier name is required").max(100),
  tracking_number: z.string().max(100).optional().default(""),
  estimated_arrival: z.string().optional().default(""),
  notes: z.string().max(500).optional().default(""),
});

export type CourierDispatchInput = z.infer<typeof courierDispatchSchema>;
