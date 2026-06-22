/**
 * Procurement Module — Zod Validation Schemas
 *
 * Provides client-side validation for all procurement domain entities:
 * - Purchase Orders (line items with quantity > 0, unit price > 0)
 * - Vendors/Suppliers (name, contact, tax ID)
 * - Goods Receipts (PO reference, received items)
 * - Requisitions (title, category, budget)
 * - Contracts (requisition + supplier linkage)
 * - Portal Messages (supplier communication)
 * - Categories (name management)
 *
 * These schemas enforce Requirements 3.1, 3.2, 3.3, 16.1.
 */

import { z } from "zod";

// ─── PO Line Item Schema ───────────────────────────────────────────────────────

export const poLineItemSchema = z.object({
  productSku: z.string().min(1, "SKU is required"),
  description: z.string().min(1, "Description is required"),
  quantity: z.number().positive("Quantity must be greater than 0"),
  uom: z.string().min(1, "Unit of measure is required"),
  unitPrice: z.number().positive("Unit price must be greater than 0"),
});

export type PoLineItemFormValues = z.infer<typeof poLineItemSchema>;

// ─── Purchase Order (Draft PO) Schema ──────────────────────────────────────────

export const draftPurchaseOrderSchema = z.object({
  requisitionId: z.string().min(1, "Requisition is required"),
  supplierId: z.string().min(1, "Supplier is required"),
  supplierBranchId: z.string().min(1, "Supplier branch is required"),
  contractType: z.enum(["BLANKET", "SPOT", "SERVICE"], {
    required_error: "Contract type is required",
  }),
  lineItems: z
    .array(poLineItemSchema)
    .min(1, "At least 1 line item is required"),
});

export type DraftPurchaseOrderFormValues = z.infer<typeof draftPurchaseOrderSchema>;

// ─── Vendor / Supplier Master Schema ───────────────────────────────────────────

export const supplierMasterSchema = z.object({
  name: z.string().min(1, "Supplier name is required").max(200, "Name must be 200 characters or fewer"),
  taxId: z.string().min(1, "Tax ID is required"),
  categories: z.string().min(1, "At least one category is required"),
  website: z.string().url("Must be a valid URL").or(z.literal("")).optional(),
  contactPerson: z.string().optional(),
  contactEmail: z.string().email("Must be a valid email").or(z.literal("")).optional(),
  contactPhone: z.string().optional(),
  address: z.string().optional(),
});

export type SupplierMasterFormValues = z.infer<typeof supplierMasterSchema>;

// ─── Supplier Branch Schema ────────────────────────────────────────────────────

export const supplierBranchSchema = z.object({
  supplierId: z.string().min(1, "Parent supplier is required"),
  branchCode: z.string().min(1, "Branch code is required").max(20, "Branch code too long"),
  branchName: z.string().optional(),
  location: z.string().min(1, "Location is required"),
  leadTimeDays: z.number().min(0, "Lead time cannot be negative"),
  fullAddress: z.string().optional(),
  contactPerson: z.string().optional(),
  contactEmail: z.string().email("Must be a valid email").or(z.literal("")).optional(),
  contactPhone: z.string().optional(),
});

export type SupplierBranchFormValues = z.infer<typeof supplierBranchSchema>;

// ─── Goods Receipt Schema ──────────────────────────────────────────────────────

export const goodsReceiptSchema = z.object({
  finalPoId: z.string().min(1, "Purchase Order reference is required"),
  deliveryOnTime: z.boolean(),
  quantityAccuracy: z.number().min(0).max(100, "Accuracy must be 0-100%"),
  qualityScore: z.number().min(0).max(100, "Quality score must be 0-100%"),
  issueCount: z.number().min(0, "Issue count cannot be negative"),
  invoiceMismatch: z.boolean(),
});

export type GoodsReceiptFormValues = z.infer<typeof goodsReceiptSchema>;

// ─── Requisition Schema ────────────────────────────────────────────────────────

export const requisitionSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must be 200 characters or fewer"),
  description: z.string().min(1, "Description is required"),
  category: z.string().min(1, "Category is required"),
  branchCode: z.string().min(1, "Branch code is required"),
  budgetClass: z.enum(["OPEX", "CAPEX", "EMERGENCY"], {
    required_error: "Budget class is required",
  }),
  amount: z.number().positive("Amount must be greater than 0"),
  contractRequired: z.boolean(),
});

export type RequisitionFormValues = z.infer<typeof requisitionSchema>;

// ─── Contract Packet Schema ────────────────────────────────────────────────────

export const contractPacketSchema = z.object({
  requisitionId: z.string().min(1, "Requisition is required"),
  supplierId: z.string().min(1, "Supplier is required"),
  notes: z.string().optional(),
  attachmentIds: z.array(z.string()).optional(),
});

export type ContractPacketFormValues = z.infer<typeof contractPacketSchema>;

// ─── Supplier Quote Confirmation Schema ────────────────────────────────────────

export const supplierQuoteSchema = z.object({
  draftPoId: z.string().min(1, "Draft PO reference is required"),
  quoteReference: z.string().min(1, "Quote reference is required"),
  quoteNotes: z.string().optional(),
});

export type SupplierQuoteFormValues = z.infer<typeof supplierQuoteSchema>;

// ─── Portal Message Schema ─────────────────────────────────────────────────────

export const portalMessageSchema = z.object({
  supplierId: z.string().min(1, "Supplier is required"),
  supplierBranchId: z.string().min(1, "Branch is required"),
  direction: z.enum(["INBOUND", "OUTBOUND"], {
    required_error: "Direction is required",
  }),
  type: z.enum(["QUOTE", "INVOICE", "DELIVERY_PROOF", "DISPUTE", "GENERAL"], {
    required_error: "Message type is required",
  }),
  content: z.string().min(1, "Message content is required"),
  attachmentName: z.string().optional(),
});

export type PortalMessageFormValues = z.infer<typeof portalMessageSchema>;

// ─── Category Schema ───────────────────────────────────────────────────────────

export const categorySchema = z.object({
  name: z.string().min(1, "Category name is required").max(100, "Name must be 100 characters or fewer"),
  description: z.string().optional(),
});

export type CategoryFormValues = z.infer<typeof categorySchema>;

// ─── PO State Transition Schema ────────────────────────────────────────────────

/**
 * PO state machine for client-side transition validation.
 * Maps to backend PO_STATES from the Business Rule Engine.
 */
export const PO_STATE_MAP: Record<string, string[]> = {
  draft: ["pending_approval"],
  pending_approval: ["approved", "draft"],
  approved: ["received"],
  received: ["closed"],
  closed: [],
};

/**
 * Validates a PO state transition on the client side.
 * Mirrors the backend `validateTransition` function.
 */
export function validatePoTransition(
  currentState: string,
  targetState: string,
): { valid: boolean; error?: string } {
  const validTargets = PO_STATE_MAP[currentState];
  if (!validTargets) {
    return { valid: false, error: `Unknown current state: ${currentState}` };
  }
  if (!validTargets.includes(targetState)) {
    return {
      valid: false,
      error: `Invalid transition from "${currentState}" to "${targetState}". Valid targets: ${validTargets.join(", ") || "none (terminal state)"}`,
    };
  }
  return { valid: true };
}
