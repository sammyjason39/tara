import { Prisma } from "@prisma/client";
import { Asset } from "./domain/asset.interfaces";
export { Asset };

export interface CapexRequest {
  id: string;
  assetDescription: string;
  requestedAmount: Prisma.Decimal;
  department: string;
  projectCode: string;
  justification?: string;
  status:
    | "PENDING"
    | "PENDING_HOD_APPROVAL"
    | "PENDING_CFO_APPROVAL"
    | "APPROVED"
    | "REJECTED";
  currentApprovalStage?: "HOD" | "CFO";
  budgetMatched: boolean;
  created_at: string;
  requesterId: string;
}

export interface BankStatement {
  id: string;
  bankName: string;
  accountNumber: string;
  balance: Prisma.Decimal;
  currency: string;
  status: 'ACTIVE' | 'ARCHIVED';
}

export interface BankTransaction {
  id: string;
  date: Date;
  description: string;
  amount: Prisma.Decimal;
  reference?: string;
  status: 'UNRECONCILED' | 'AUTO_MATCHED' | 'MANUAL_MATCHED' | 'RECONCILED';
}

export interface PerformanceTreeNode {
  id: string;
  name: string;
  type: 'TENANT' | 'BRANCH' | 'STORE' | 'ECOMMERCE' | 'DEPARTMENT';
  income: Prisma.Decimal;
  expense: Prisma.Decimal;
  net: Prisma.Decimal;
  children?: PerformanceTreeNode[];
}

export interface FinanceCapexBudgetRow {
  department: string;
  allocatedBudget: Prisma.Decimal;
  committedBudget: Prisma.Decimal;
  availableBudget: Prisma.Decimal;
  fiscalYear: string;
}

export interface FinanceMoneySourceRow {
  id: string;
  name: string;
  type: string;
  currency: string;
  balance: Prisma.Decimal;
  pendingSettlement?: Prisma.Decimal;
  provider?: string | null;
  lastUpdated?: string;
}

export interface TreasuryTransfer {
  id: string;
  tenant_id: string;
  fromSourceId: string;
  toSourceId: string;
  amount: Prisma.Decimal;
  currency: string;
  status: string;
  requested_by: string;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface AssetDepreciationEntry {
  id: string;
  assetId: string;
  postingDate: string;
  amount: Prisma.Decimal;
  method: string;
  accumulatedDepreciation: Prisma.Decimal;
  carryingValue: Prisma.Decimal;
  journalEntryId: string;
  isPosted: boolean;
}

export interface AssetEvent {
  id: string;
  type: "IMPAIRMENT" | "REVALUATION" | "DISPOSAL" | "TRANSFER" | "MAINTENANCE";
  assetId: string;
  amount?: Prisma.Decimal;
  reason?: string;
  journalEntryId?: string;
  attachmentDocumentIds: string[];
  created_at: string;
  approvedBy?: string;
}

export interface AssetAuditPack {
  assetId: string;
  capexRequest?: CapexRequest;
  depreciationEntries: AssetDepreciationEntry[];
  events: AssetEvent[];
  evidence: string[]; // Document definitions/IDs
  checksum: string;
  signature: string;
}

export interface FinanceReceivableRow {
  id: string;
  customerName: string;
  invoiceNumber: string;
  amount: Prisma.Decimal;
  currency: string;
  dueDate: string;
  status: "DRAFT" | "SENT" | "OVERDUE" | "PAID" | "DISPUTED";
  agingDays: number;
  updated_at: string;
}

export interface FinancePayableRow {
  id: string;
  vendorName: string;
  billNumber: string;
  amount: Prisma.Decimal;
  currency: string;
  dueDate: string;
  status: "RECEIVED" | "APPROVED" | "SCHEDULED_FOR_PAYMENT" | "PAID";
  updated_at: string;
}

export interface FinancePaymentRow {
  id: string;
  beneficiary: string;
  amount: Prisma.Decimal;
  currency: string;
  status: "PENDING_APPROVAL" | "PROCESSING" | "COMPLETED" | "FAILED";
  method: PaymentMethod;
  scheduledDate: string;
}

export interface FinanceDocumentRow {
  id: string;
  title: string;
  type: string;
  category: "INVOICE" | "CONTRACT" | "RECEIPT" | "OTHER";
  uploadDate: string;
  status: "PENDING_REVIEW" | "APPROVED" | "REJECTED";
  url: string;
}

export interface PaymentRequest {
  id: string;
  amount: Prisma.Decimal;
  currency: string;
  beneficiary: string;
  source?: string;
  departmentId?: string;
  purpose: string;
  extraInfo?: Record<string, any>;
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "PAID" | "REJECTED";
  requested_by: string;
  requestedAt: string;
}

export interface FinancePolicyRow {
  id: string;
  name: string;
  description: string;
  status: "ACTIVE" | "DRAFT" | "ARCHIVED";
  enforced: boolean;
}

export interface AccountingPeriod {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: "OPEN" | "CLOSED" | "LOCKED" | "ADJUSTING";
}

export interface FinanceInsight {
  id: string;
  title: string;
  type: "INFO" | "WARNING" | "CRITICAL";
  message: string;
  date: string;
}

export interface FinanceAlert {
  id: string;
  message: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  created_at: string;
  read: boolean;
}

export interface PayrollEntry {
  id: string;
  tenant_id: string;
  employee_id: string;
  name?: string;
  department?: string;
  period: string; // e.g., "2026-02"
  baseSalary: Prisma.Decimal;
  bonuses?: Prisma.Decimal;
  deductions?: Prisma.Decimal;
  netSalary: Prisma.Decimal;
  status: "PENDING" | "PROCESSED" | "PAID" | "pending" | "approved" | "paid";
  paymentDate?: string;
  created_at: string;
  updated_at: string;
}

export interface PayrollEstimate {
  department: string;
  employeeCount: number;
  totalGross: Prisma.Decimal;
  totalNet: Prisma.Decimal;
}

export interface ReceivableInvoice {
  id: string;
  customer: string;
  amount: Prisma.Decimal;
  dueDate: string;
  status: "DRAFT" | "SENT" | "PAID";
}

export interface PayableBill {
  id: string;
  vendor: string;
  amount: Prisma.Decimal;
  dueDate: string;
  status: "RECEIVED" | "APPROVED" | "PAID";
}

export type PaymentMethod = "BANK_TRANSFER" | "CREDIT_CARD" | "CASH" | "CHECK";
