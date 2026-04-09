import { Prisma } from "@prisma/client";

export enum SubledgerEntryStatus {
  PENDING = 'PENDING',
  VALIDATED = 'VALIDATED',
  POSTING = 'POSTING',
  POSTED = 'POSTED',
  FAILED = 'FAILED',
  VOIDED = 'VOIDED', // Only allowed before POSTED
}

export enum SubledgerEntryType {
  // AR
  AR_REVENUE = 'AR_REVENUE',
  AR_PAYMENT = 'AR_PAYMENT',
  AR_ALLOCATION = 'AR_ALLOCATION',
  AR_CREDIT_BALANCE = 'AR_CREDIT_BALANCE',
  AR_BAD_DEBT = 'AR_BAD_DEBT',
  
  // AP
  AP_EXPENSE = 'AP_EXPENSE',
  AP_PAYMENT = 'AP_PAYMENT',
  AP_ALLOCATION = 'AP_ALLOCATION',
  AP_PREPAYMENT = 'AP_PREPAYMENT',
  
  // Cash
  CASH_RECEIPT = 'CASH_RECEIPT',
  CASH_DISBURSEMENT = 'CASH_DISBURSEMENT',
  CASH_TRANSFER = 'CASH_TRANSFER',
  CASH_ADJUSTMENT = 'CASH_ADJUSTMENT',
  
  // Assets
  ASSET_ACQUISITION = 'ASSET_ACQUISITION',
  ASSET_DEPRECIATION = 'ASSET_DEPRECIATION',
  ASSET_DISPOSAL = 'ASSET_DISPOSAL',
  ASSET_REVALUATION = 'ASSET_REVALUATION',
  
  // Inventory
  INV_ISSUE = 'INV_ISSUE',
  INV_RECEIPT = 'INV_RECEIPT',
  INV_ADJUSTMENT = 'INV_ADJUSTMENT',
  CLOSING = 'CLOSING',
}

export enum AccountingDirection {
  DEBIT = 'DEBIT',
  CREDIT = 'CREDIT',
}

export class FinanceSubledgerEntry {
  id: string;
  tenantId: string;
  companyId: string;
  sourceModule: string;     // e.g., 'ACCOUNTS_PAYABLE', 'INVENTORY'
  
  // Business Reference (Standardized)
  referenceType: string;    // e.g., 'INVOICE', 'BILL', 'BANK_TX'
  referenceId: string;      // Document ID
  referenceLineId?: string; // Optional line item reference
  
  // Traceability
  sourceEventId: string;     // Original business event ID
  postingRequestId: string;  // Unique ID for UFPG idempotency
  batchId?: string;          // Batch grouping ID
  
  // Accounting Attributes
  entryType: SubledgerEntryType;
  status: SubledgerEntryStatus;
  accountingPeriodId: string;
  direction: AccountingDirection; // Explicit direction for audit safety
  effectiveDate: Date;           // Business date for reporting (Audit Hardening)
  
  // Financial Values (Locked)
  amount: Prisma.Decimal;            // Absolute value
  currency: string;
  
  // FX Support
  baseAmount: Prisma.Decimal;        // Value in functional currency
  baseCurrency: string;      // Functional currency (e.g., 'USD')
  exchangeRate: Prisma.Decimal;      // Rate used for translation
  
  // Double-Entry mapping
  debitAccountId: string;
  creditAccountId: string;
  
  // GL Traceability
  glJournalId?: string;
  postedAt?: Date;
  
  // Failure Classification
  failureType?: 'VALIDATION_ERROR' | 'SYSTEM_ERROR' | 'INTEGRATION_ERROR';
  failureMessage?: string;
  
  // Reversal Linking (Audit-safe corrections)
  reversalOfEntryId?: string; // Link to the entry being corrected
  reversedByEntryId?: string; // Link to the entry that corrected this one
  
  // Metadata
  branchId?: string;
  locationId?: string;
  departmentId?: string;
  projectId?: string;
  
  createdAt: Date;
  updatedAt: Date;
}
