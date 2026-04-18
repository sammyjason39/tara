import { Prisma } from '@prisma/client';

/**
 * Ledger Entry Entity
 * Represents a single entry in the financial ledger
 */
export class LedgerEntry {
  id: string;
  tenant_id: string;
  location_id?: string;
  amount: Prisma.Decimal;
  type: "debit" | "credit" | "DEBIT" | "CREDIT" | any;
  description: string;
  timestamp?: Date;
  effectiveDate: Date; // Business date for reporting (Audit Hardening)
  created_at?: string;
  balance: Prisma.Decimal; // Running balance after this transaction
  category?: string;
  account?: string;
  status?: string;
  referenceId?: string; // Link to related transaction/invoice
}
