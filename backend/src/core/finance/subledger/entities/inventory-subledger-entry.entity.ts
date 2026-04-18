import { Prisma } from '@prisma/client';

export class InventorySubledgerEntry {
  id: string;
  tenant_id: string;
  
  // Traceability
  inventoryTransactionId: string; // Operational Link
  sourceEventId: string;          // Idempotency Key (Event ID)
  postingRequestId: string;       // Unique ID for UFPG calls
  
  // Accounting Attributes
  entryType: 'INVENTORY_ISSUE' | 'COGS_RECOGNITION' | 'INVENTORY_REVALUATION' | 'PROVISIONAL_ADJUSTMENT';
  status: 'PENDING' | 'COSTED' | 'POSTING' | 'POSTED' | 'FAILED';
  
  // Financial Values (Locked)
  amount: Prisma.Decimal;
  currency: string;
  qty: Prisma.Decimal;
  unitCost: Prisma.Decimal;
  
  // FX Locking
  baseAmount?: Prisma.Decimal;
  baseCurrency?: string;
  exchangeRate?: Prisma.Decimal;
  
  // Double-Entry mapping
  debitAccountId?: string;
  creditAccountId?: string;
  
  // GL Traceability
  glJournalId?: string;
  postedAt?: Date;
  
  // Period Control
  accountingPeriodId: string;
  postedPeriodId?: string;
  periodOverrideBy?: string;
  periodOverrideReason?: string;
  
  // Metadata
  skuId: string;
  location_id: string;
  isSystemGenerated: boolean;
  costVersionId?: string;
  
  // Reversal Tracking
  reversedEntryId?: string; // Only stored on the reversal entry
  
  // Failure Classification
  failureType?: 'VALIDATION_ERROR' | 'SYSTEM_ERROR' | 'INTEGRATION_ERROR';
  
  // Business Reference
  referenceType?: string;
  referenceId?: string;
  
  created_at: Date;
  updated_at: Date;
}
