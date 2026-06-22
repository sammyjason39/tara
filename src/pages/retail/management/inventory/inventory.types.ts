import type { RetailStore } from "@/core/types/retail/retail";

// ─── Core Item View ───────────────────────────────────────────
export type ItemStatus = "ok" | "low" | "critical" | "overstock";

export type InventoryItemView = {
  id: string;
  sku: string;
  name: string;
  category: string;
  onHand: number;
  reserved: number;
  available: number;
  minBuffer: number;
  maxCapacity: number;
  status: ItemStatus;
  lastUpdated?: string;
};

// ─── Line Item (for multi-line operations) ────────────────────
export type LineItem = {
  sku: string;
  name: string;
  qty: number;
  unitPrice?: number;
  condition?: "ok" | "damaged" | "short";
  note?: string;
};

// ─── Movement Types ───────────────────────────────────────────
export type MovementType =
  | "request_po"
  | "transfer_out"
  | "receive_po"
  | "receive_transfer"
  | "receive_purchase";

export const MOVEMENT_META: Record<
  MovementType,
  { label: string; dir: "in" | "out"; color: string }
> = {
  request_po: { label: "Request Purchase Order", dir: "in", color: "blue" },
  transfer_out: { label: "Transfer to Branch", dir: "out", color: "indigo" },
  receive_po: { label: "Receive from PO", dir: "in", color: "emerald" },
  receive_transfer: { label: "Receive Transfer", dir: "in", color: "emerald" },
  receive_purchase: {
    label: "Receive from Purchase",
    dir: "in",
    color: "teal",
  },
};

// ─── Opname ───────────────────────────────────────────────────
export type OpnameEntry = {
  sku: string;
  name: string;
  expected: number;
  counted: number | "";
};

// ─── Audit ────────────────────────────────────────────────────
export type AuditStatus = "approved" | "pending" | "rejected";

export type AuditEntry = {
  id: string;
  actor: string;
  action: string;
  detail: string;
  reason: string;
  ts: string;
  status: AuditStatus;
};

// ─── Helpers ─────────────────────────────────────────────────
export const getItemStatus = (
  item: Pick<InventoryItemView, "available" | "onHand" | "minBuffer">,
): ItemStatus => {
  if (item.available <= 0) return "critical";
  if (item.available < item.minBuffer) return "low";
  if (item.onHand > item.minBuffer * 5) return "overstock";
  return "ok";
};

export const STATUS_BADGE: Record<ItemStatus, string> = {
  ok: "bg-success text-success",
  low: "bg-warning text-warning",
  critical: "bg-destructive text-destructive",
  overstock: "bg-primary text-primary",
};

export const AUDIT_STATUS_BADGE: Record<AuditStatus, string> = {
  approved: "bg-success text-success",
  pending: "bg-warning text-warning",
  rejected: "bg-destructive text-destructive",
};

// ─── Mock seed data — REMOVED ─────────────────────────────────
// Mock data was replaced with real backend fetches (Task 13.2).
// Audit entries are now fetched via GET /retail/inventory/audit endpoint.
