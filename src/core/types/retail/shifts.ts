import type { HRAuditFields } from "@/core/types/hr/base";

export type ShiftStatus = "open" | "closed" | "audited";

export interface CashierShift extends HRAuditFields {
  id: string;
  tenantId: string;
  locationId: string;
  deviceId: string;
  cashierId: string; // Employee ID
  status: ShiftStatus;
  openedAt: string;
  closedAt?: string;
  openingCash: number;
  expectedCash: number;
  actualCash?: number;
  totalSales: number;
  totalRefunds: number;
  drawerDiscrepancy?: number;
  notes?: string;
}

export interface CashDenomination {
  value: number;
  count: number;
}

export interface ShiftReconciliation extends HRAuditFields {
  id: string;
  tenantId: string;
  shiftId: string;
  denominations: CashDenomination[];
  totalCounted: number;
  difference: number;
  authorizedBy?: string; // Manager ID
}
