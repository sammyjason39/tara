import { Prisma } from '@prisma/client';

/**
 * Transaction Entity
 * Represents a financial transaction
 */
export class Transaction {
  id: string;
  tenant_id: string;
  location_id?: string;
  amount: Prisma.Decimal;
  type: "debit" | "credit";
  description: string;
  category?: string;
  created_at: Date;
  createdBy?: string; // User ID who created the transaction
  status: "pending" | "approved" | "rejected";
  approvedBy?: string; // User ID who approved (for threshold gates)
  approvedAt?: Date;
}
