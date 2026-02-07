export type LedgerStatus = "draft" | "approved" | "posted" | "locked";

export interface JournalLine {
  accountCode: string;
  description: string;
  debit: number;
  credit: number;
}

export interface JournalEntry {
  id: string;
  tenantId: string;
  ref?: string;
  description: string;
  lines: JournalLine[];
  status: LedgerStatus;
  createdAt: string;
  updatedAt: string;
}

export type LedgerEntry = {
  id: string;
  tenantId: string;
  accountId: string;
  description: string;
  debit: number;
  credit: number;
  balance?: number;
  createdAt: string;
  updatedAt: string;
};

export type LedgerBalance = {
  accountId: string;
  tenantId: string;
  balance: number;
};
