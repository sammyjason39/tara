import { Prisma } from "@prisma/client";

/**
 * Balance Entity
 * Represents the current financial balance for a tenant
 */
export class Balance {
  tenant_id: string;
  totalBalance: Prisma.Decimal;
  currency: string;
  lastUpdated: Date;
  totalDebits?: Prisma.Decimal;
  totalCredits?: Prisma.Decimal;
  transactionCount?: number;
}
