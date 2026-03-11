export type PaymentMethod = "BANK_TRANSFER" | "CREDIT_CARD" | "CASH" | "CHECK";

export interface Asset {
  id: string;
  description: string;
  assetClass: string;
  location: string;
  department: string;
  acquisitionCost: number;
  acquisitionDate: string;
  usefulLifeYears: number;
  residualValue: number;
  depreciationMethod:
    | "STRAIGHT_LINE"
    | "DECLINING_BALANCE"
    | "UNITS_OF_PRODUCTION";
  accumulatedDepreciation: number;
  carryingValue: number;
  revaluationReserve: number;
  status:
    | "DRAFT"
    | "PENDING_APPROVAL"
    | "APPROVED_FOR_CAPITALIZATION"
    | "ACTIVE"
    | "DISPOSED"
    | "WRITTEN_OFF";
  serialNumber?: string;
  vendor?: string;
  warrantyExpiry?: string;
}

export interface CapexRequest {
  id: string;
  assetDescription: string;
  requestedAmount: number;
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
  createdAt: string;
  requesterId: string;
}

export interface FinanceCapexBudgetRow {
  department: string;
  allocatedBudget: number;
  committedBudget: number;
  availableBudget: number;
  fiscalYear: string;
}

export interface FinanceMoneySourceRow {
  id: string;
  name: string;
  type: string;
  currency: string;
  balance: number;
  pendingSettlement?: number;
  provider?: string | null;
  lastUpdated?: string;
}

export interface TreasuryTransfer {
  id: string;
  tenantId: string;
  fromSourceId: string;
  toSourceId: string;
  amount: number;
  currency: string;
  status: string;
  requestedBy: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface AssetDepreciationEntry {
  id: string;
  assetId: string;
  postingDate: string;
  amount: number;
  method: string;
  accumulatedDepreciation: number;
  carryingValue: number;
  journalEntryId: string;
  isPosted: boolean;
}

export interface AssetEvent {
  id: string;
  type: "IMPAIRMENT" | "REVALUATION" | "DISPOSAL" | "TRANSFER" | "MAINTENANCE";
  assetId: string;
  amount?: number;
  reason?: string;
  journalEntryId?: string;
  attachmentDocumentIds: string[];
  createdAt: string;
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
  amount: number;
  currency: string;
  dueDate: string;
  status: "DRAFT" | "SENT" | "OVERDUE" | "PAID" | "DISPUTED";
  agingDays: number;
  updatedAt: string;
}

export interface FinancePayableRow {
  id: string;
  vendorName: string;
  billNumber: string;
  amount: number;
  currency: string;
  dueDate: string;
  status: "RECEIVED" | "APPROVED" | "SCHEDULED_FOR_PAYMENT" | "PAID";
  updatedAt: string;
}

export interface FinancePaymentRow {
  id: string;
  beneficiary: string;
  amount: number;
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
  amount: number;
  currency: string;
  beneficiary: string;
  source?: string;
  departmentId?: string;
  purpose: string;
  extraInfo?: Record<string, any>;
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "PAID" | "REJECTED";
  requestedBy: string;
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
  startDate: string;
  endDate: string;
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
  createdAt: string;
  read: boolean;
}

export interface PayrollEntry {
  id: string;
  tenantId: string;
  employeeId: string;
  name?: string;
  department?: string;
  period: string; // e.g., "2026-02"
  baseSalary: number;
  bonuses?: number;
  deductions?: number;
  netSalary: number;
  status: "PENDING" | "PROCESSED" | "PAID" | "pending" | "approved" | "paid";
  paymentDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PayrollEstimate {
  department: string;
  employeeCount: number;
  totalGross: number;
  totalNet: number;
}

export interface ReceivableInvoice {
  id: string;
  customer: string;
  amount: number;
  dueDate: string;
  status: "DRAFT" | "SENT" | "PAID";
}

export interface PayableBill {
  id: string;
  vendor: string;
  amount: number;
  dueDate: string;
  status: "RECEIVED" | "APPROVED" | "PAID";
}
