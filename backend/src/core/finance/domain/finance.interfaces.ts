import { Prisma } from '@prisma/client';
export * from './finance.constants';
import { 
  JournalStatus, 
  JournalType, 
  PostingSide 
} from './finance.constants';

// --- Core Ledger ---

export interface JournalEntry {
  id: string;
  tenant_id: string;
  company_id: string;
  fiscalPeriodId: string;
  ledgerSequence: number;
  postingDate: Date;
  effectiveDate: Date;
  status: JournalStatus;
  journalType: JournalType;
  ref: string;
  sourceEventId?: string;
  description?: string;
  memo?: string; // Legacy Compatibility
  previousHash?: string; // Audit Chaining
  entryHash?: string;   // Audit Chaining
  created_at: Date;
  updated_at: Date;
  metadata?: Record<string, any>;
}

export interface JournalLine {
  id: string;
  journalEntryId: string;
  accountId: string;
  accountCode: string; // Compatibility
  side: PostingSide | string;
  amount: Prisma.Decimal;
  currency: string;
  branch_id?: string;
  location_id?: string;
  dimensionBranchId?: string;
  dimensionChannelId?: string;
  dimensionCostCenterId?: string;
  dimensionDepartmentId?: string;
  dimensionProjectId?: string;
  departmentId?: string; // Compatibility
  costCenterId?: string; // Compatibility
  projectId?: string; // Compatibility
  description?: string;
  created_at: Date;
}

export interface JournalPostedEvent {
  tenant_id: string;
  company_id: string;
  journalId: string;
  fiscalPeriodId: string;
  ledgerSequence: number;
  postingDate?: Date; // Added for projection worker
}

export interface JournalValidationResult {
  valid: boolean;
  isValid: boolean; // Compatibility
  errors: string[];
}

// --- Account Balances & Snapshots ---

export interface AccountBalance {
  id: string;
  tenant_id: string;
  company_id: string;
  accountId: string;
  currency: string;
  fiscalPeriodId: string;
  debitTotal: Prisma.Decimal;
  creditTotal: Prisma.Decimal;
  netBalance: Prisma.Decimal;
  branch_id: string;
  location_id: string;
  departmentId?: string;
  costCenterId?: string;
  projectId?: string;
  version: number; // Optimistic Concurrency
  lastUpdatedAt: Date;
  updated_at?: Date; // Compatibility
}

export interface AccountBalanceSnapshot {
  id: string;
  tenant_id: string;
  company_id: string;
  accountId: string;
  currency: string;
  periodId: string;
  fiscalPeriodId?: string; // Compatibility
  openingBalance: Prisma.Decimal; 
  debitTotal: Prisma.Decimal;
  creditTotal: Prisma.Decimal;
  closingBalance: Prisma.Decimal;
  snapshotSequence: number;
  snapshotDate: Date;
  snapshotType?: string; // Compatibility
  balancesData?: any; // Compatibility
  lastUpdatedAt: Date;
  integrityHash?: string;
}

export interface SnapshotApplicationLog {
  id?: string;
  snapshotId?: string;
  ledgerEntryId: string;
  accountId: string;
  periodId: string;
  appliedAt: Date;
}

// --- Projections ---

export interface TrialBalanceProjection {
  id: string;
  tenant_id: string;
  company_id: string;
  accountId: string;
  account_name: string;
  accountCode?: string; // Compatibility
  fiscalPeriodId: string;
  accountCategory: string;
  debitTotal: Prisma.Decimal;
  creditTotal: Prisma.Decimal;
  debit?: Prisma.Decimal; // Compatibility
  credit?: Prisma.Decimal; // Compatibility
  balance?: Prisma.Decimal; // Compatibility
  snapshotSequence: number;
  lastUpdatedAt: Date;
  updated_at?: Date; // Compatibility
}

export interface GeneralLedgerProjection {
  id: string;
  tenant_id: string;
  company_id: string;
  accountId: string;
  journalId: string;
  ledgerSequence: number;
  debit: Prisma.Decimal;
  credit: Prisma.Decimal;
  balance: Prisma.Decimal;
  runningBalance?: Prisma.Decimal; // Compatibility
  dimensionBranchId?: string;
  dimensionChannelId?: string;
  dimensionCostCenterId?: string;
  dimensionDepartmentId?: string;
  dimensionProjectId?: string;
  created_at: Date;
}

export interface AccountStatementProjection {
  id: string;
  tenant_id: string;
  company_id: string;
  accountId: string;
  ledgerSequence: number;
  journalId: string;
  description: string;
  debit: Prisma.Decimal;
  credit: Prisma.Decimal;
  balance: Prisma.Decimal;
  signedAmount?: Prisma.Decimal; // Compatibility
  dimensionBranchId?: string;
  dimensionChannelId?: string;
  dimensionCostCenterId?: string;
  dimensionDepartmentId?: string;
  dimensionProjectId?: string;
  created_at: Date;
}

// --- Reports & Snapshots ---

export interface FinancialReportSnapshot {
  id: string;
  tenant_id: string;
  company_id: string;
  fiscalPeriodId: string;
  snapshotSequence: number;
  projectionCheckpointSequence?: number; // Compatibility
  reportType: string;
  reportVersion?: number; // Compatibility
  generatedAt?: Date; // Compatibility
  reportParametersHash?: string; // Compatibility
  reportDataHash?: string; // Compatibility
  compressedReportData: string;
  compressedData?: string; // Compatibility
  integrityHash: string;
  created_at: Date;
}

export interface FinancialSnapshot {
  id: string;
  tenant_id: string;
  company_id: string;
  fiscalPeriodId: string;
  periodId?: string; // Compatibility
  snapshotSequence: number;
  snapshotDate?: Date; // Compatibility
  trialBalanceStateHash?: string; // Legacy check
  compressedTrialBalanceState: string;
  integrityHash: string;
  created_at: Date;
}

// --- Period Closing ---

export interface PeriodClosingRecord {
  id: string;
  tenant_id: string;
  company_id: string;
  periodId: string;
  status: string;
  snapshotSequence: number;
  integrityHash: string;
  fxAdjustmentJournalId?: string;
  reversalJournalId?: string;
  netIncomeBase: Prisma.Decimal;
  closedBy: string;
  closedAt: Date;
  metadata?: Record<string, any>;
}

export interface ClosingExecutionLock {
  id: string;
  periodId: string;
  closingRequestId: string;
  lockedBy: string;
  expiresAt: Date;
  startedAt?: Date; // Compatibility
  status?: string; 
  updated_at?: Date; 
}

export interface ClosingJournalLine {
  accountId: string;
  amount: Prisma.Decimal;
  side: PostingSide | string;
  direction?: PostingSide | string; // Compatibility
}

export interface ReversalBatch {
  id?: string;
  periodId?: string; // Compatibility
  totalEntries?: number; // Compatibility
  originalJournalIds: string[];
  reversalReason: string;
}

// --- Audit & Merkle ---

export interface LedgerMerkleCheckpoint {
  id: string;
  tenant_id: string;
  company_id: string;
  ledgerSequence: number;
  fromSequence?: number; // Compatibility
  toSequence?: number; // Compatibility
  journalCount?: number; // Compatibility
  previousCheckpointId?: string; // Compatibility
  merkleRoot: string;
  created_at: Date;
}

export interface CheckpointChainResult {
  isValid: boolean;
  checkpointCount?: number;
  violations: string[];
}

export interface LedgerProjectionCheckpoint {
  id: string;
  tenant_id: string;
  company_id: string;
  projectionType: string;
  lastSequence: number;
  lastJournalSequence?: number; // Compatibility
  updated_at: Date;
}

// --- Errors ---

export class FiscalPeriodLockedError extends Error {
  constructor(periodId: string) {
    super(`Fiscal period ${periodId} is locked.`);
    this.name = 'FiscalPeriodLockedError';
  }
}

// --- Shared Groups & Eliminations ---

export interface CompanyGroupMember {
  id: string;
  groupId: string;
  company_id: string;
  ownershipPercentage: number;
  joinedAt: Date;
  companyGroupId?: string; // Compatibility
}

export interface ConsolidatedFinancialSnapshot {
  id: string;
  tenant_id: string;
  groupId: string;
  fiscalPeriodId: string;
  reportParametersHash: string;
  compressedData: string;
  projectionCheckpointSequence: number;
  created_at: Date;
}

// --- ALIASES (Compatibility Layer) ---

export type CoaAccount = any;
export type FinanceChartOfAccount = any;
export type CompanyGroup = any;
export type FinanceFiscalYear = any;
export type FinanceFiscalPeriod = any;
export type JournalReversal = any;
export type LedgerEventLogArchive = any;
export type LedgerEventLog = any;
export type LedgerHashAnchor = any;
export type LedgerPosting = any;
export type LedgerPostingLine = any;
export type LedgerIdempotency = any;
export type FinancePostingRule = any;
export type PayrollEntry = any;
export type MerkleInclusionResult = any;

// --- Remaining Shared Types ---

export interface PayrollRecord {
  id: string;
  tenant_id: string;
  company_id: string;
  employee_id: string;
  periodId: string;
  baseSalary: Prisma.Decimal;
  netSalary: Prisma.Decimal;
  status: string;
}

export interface IntercompanyEliminationRule {
  id: string;
  tenant_id: string;
  companyA: string;
  companyB: string;
  accountMapping: Record<string, string>;
  isActive: boolean;
  updated_at?: Date;
}
