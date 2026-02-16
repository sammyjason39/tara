import type { HRAuditFields } from "@/core/types/hr/base";

export interface StockLevel extends HRAuditFields {
  id: string;
  tenantId: string;
  locationId: string; // Store or Warehouse
  productId: string;
  onHand: number;
  reserved: number;
  available: number;
  minBuffer: number;
  maxCapacity: number;
  lastStockTakeAt?: string;
}

export interface StockMovement extends HRAuditFields {
  id: string;
  tenantId: string;
  productId: string;
  fromLocationId: string;
  toLocationId: string;
  quantity: number;
  type: "sale" | "return" | "restock" | "adjustment" | "transfer";
  referenceId: string; // Order ID or Restock ID
  performedBy: string; // Employee ID
}

export interface InventoryBufferPolicy extends HRAuditFields {
  id: string;
  tenantId: string;
  productId: string;
  locationId: string;
  minBuffer: number;
  autoRestock: boolean;
  restockQuantity: number;
}
