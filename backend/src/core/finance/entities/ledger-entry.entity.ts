/**
 * Ledger Entry Entity
 * Represents a single entry in the financial ledger
 */
export class LedgerEntry {
  id: string;
  tenantId: string;
  locationId?: string;
  amount: number;
  type: "debit" | "credit" | "DEBIT" | "CREDIT" | any;
  description: string;
  timestamp?: Date;
  createdAt?: string;
  balance: number; // Running balance after this transaction
  category?: string;
  account?: string;
  status?: string;
  referenceId?: string; // Link to related transaction/invoice
}
