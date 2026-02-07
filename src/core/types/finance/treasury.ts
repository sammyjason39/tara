import type { MoneySource } from "./accounts";

export interface TreasuryTransfer {
  id: string;
  tenantId: string;
  fromSourceId: string;
  toSourceId: string;
  amount: number;
  currency: MoneySource["currency"];
  status: "draft" | "pending" | "approved" | "rejected" | "completed";
  createdAt: string;
  updatedAt: string;
}

export interface SettlementRecord {
  id: string;
  tenantId: string;
  sourceId: string;
  amount: number;
  currency: MoneySource["currency"];
  status: "pending" | "reconciled";
  reference?: string;
  createdAt: string;
  updatedAt: string;
}
