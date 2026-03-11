import { apiRequest } from "@/core/api/apiClient";
import type { SessionContext } from "@/core/security/session";
import type {
  AssetCapexInput,
  FinanceCapexBudgetRow,
  FinanceDocumentRow,
  FinanceReceivableRow,
  FinancePayableRow,
  FinanceInvoiceRow,
  FinanceJournalRow,
  FinancePaymentRow,
  FinancePolicyRow,
  FinanceInsight,
  AccountingPeriod,
  FinanceAlert,
  CapexBudgetPayload,
  DepreciationRunPayload,
  PostDepreciationPayload,
  AssetImpairmentPayload,
  AssetRevaluationPayload,
  AssetDisposalPayload,
  ReceivablePayload,
  PayablePayload,
  InvoiceCapturePayload,
  JournalPayload,
  PaymentRequestPayload,
  TreasuryTransferPayload,
  PolicyPayload,
  ScheduledDepreciationRunResult,
} from "@/core/services/finance/financeService";
import type {
  FixedAsset,
  CapexRequest,
  AssetDepreciationEntry,
  AssetEvent,
  AssetAuditPack,
} from "@/core/types/finance/assets";
import type { JournalEntry } from "@/core/types/finance/ledger";
import type { PaymentRequest } from "@/core/types/finance/payments";
import { PaymentMethod } from "@/core/types/finance/payments";
import type { PayableBill } from "@/core/types/finance/payables";
import type { ReceivableInvoice } from "@/core/types/finance/receivables";
import type { PayrollEntry, PayrollEstimate } from "@/core/types/finance/payrollTypes";
import type { WorkflowRequest } from "@/core/tools/workflows/workflowTypes";
import type { MoneySource } from "@/core/types/finance/accounts";
import type { TreasuryTransfer } from "@/core/types/finance/treasury";

export const financeApiClient = {
  // Assets & Capex
  listAssets: (tenantId: string, session: SessionContext) =>
    apiRequest<FixedAsset[]>("/finance/assets", "GET", session),

  listCapexRequests: (tenantId: string, session: SessionContext) =>
    apiRequest<CapexRequest[]>("/finance/capex/requests", "GET", session),

  listCapexBudgets: (tenantId: string, session: SessionContext) =>
    apiRequest<FinanceCapexBudgetRow[]>(
      "/finance/capex/budgets",
      "GET",
      session,
    ),

  setCapexBudget: (
    tenantId: string,
    session: SessionContext,
    payload: CapexBudgetPayload,
  ) => apiRequest<void>("/finance/capex/budgets", "POST", session, payload),

  createCapexRequest: (
    tenantId: string,
    session: SessionContext,
    payload: AssetCapexInput,
  ) =>
    apiRequest<CapexRequest>(
      "/finance/capex/requests",
      "POST",
      session,
      payload,
    ),

  approveCapexRequest: (
    tenantId: string,
    session: SessionContext,
    requestId: string,
  ) =>
    apiRequest<CapexRequest>(
      `/finance/capex/requests/${requestId}/approve`,
      "POST",
      session,
    ),

  rejectCapexRequest: (
    tenantId: string,
    session: SessionContext,
    requestId: string,
    reason: string,
  ) =>
    apiRequest<CapexRequest>(
      `/finance/capex/requests/${requestId}/reject`,
      "POST",
      session,
      { reason },
    ),

  capitalizeAsset: (
    tenantId: string,
    session: SessionContext,
    assetId: string,
    capitalizationDate: string,
  ) =>
    apiRequest<FixedAsset>(
      `/finance/assets/${assetId}/capitalize`,
      "POST",
      session,
      { capitalizationDate },
    ),

  listAssetDepreciationEntries: (
    tenantId: string,
    session: SessionContext,
    assetId?: string,
  ) => {
    const query = assetId ? `?assetId=${assetId}` : "";
    return apiRequest<AssetDepreciationEntry[]>(
      `/finance/assets/depreciation${query}`,
      "GET",
      session,
    );
  },

  runScheduledPeriodDepreciation: (
    tenantId: string,
    session: SessionContext,
    payload: DepreciationRunPayload,
  ) =>
    apiRequest<ScheduledDepreciationRunResult>(
      "/finance/assets/depreciation/schedule-run",
      "POST",
      session,
      payload,
    ),

  postDepreciation: (
    tenantId: string,
    session: SessionContext,
    payload: PostDepreciationPayload,
  ) =>
    apiRequest<AssetDepreciationEntry & { journalEntryId: string }>(
      `/finance/assets/${payload.assetId}/depreciation`,
      "POST",
      session,
      payload,
    ),

  recordAssetImpairment: (
    tenantId: string,
    session: SessionContext,
    payload: AssetImpairmentPayload,
  ) =>
    apiRequest<AssetEvent>(
      `/finance/assets/${payload.assetId}/impairment`,
      "POST",
      session,
      payload,
    ),

  recordAssetRevaluation: (
    tenantId: string,
    session: SessionContext,
    payload: AssetRevaluationPayload,
  ) =>
    apiRequest<AssetEvent>(
      `/finance/assets/${payload.assetId}/revaluation`,
      "POST",
      session,
      payload,
    ),

  disposeAsset: (
    tenantId: string,
    session: SessionContext,
    payload: AssetDisposalPayload,
  ) =>
    apiRequest<AssetEvent>(
      `/finance/assets/${payload.assetId}/disposal`,
      "POST",
      session,
      payload,
    ),

  listAssetEvents: (
    tenantId: string,
    session: SessionContext,
    assetId?: string,
  ) => {
    const query = assetId ? `?assetId=${assetId}` : "";
    return apiRequest<AssetEvent[]>(
      `/finance/assets/events${query}`,
      "GET",
      session,
    );
  },

  updateAssetStatus: (
    tenantId: string,
    session: SessionContext,
    id: string,
    status: string,
  ) =>
    apiRequest<FixedAsset | null>(
      `/finance/assets/${id}/status`,
      "POST",
      session,
      { status },
    ),

  generateAssetAuditPack: (
    tenantId: string,
    session: SessionContext,
    assetId: string,
  ) =>
    apiRequest<AssetAuditPack>(
      `/finance/assets/${assetId}/audit-pack`,
      "GET",
      session,
    ),

  // Receivables
  listReceivables: (tenantId: string, session: SessionContext) =>
    apiRequest<FinanceReceivableRow[]>("/finance/receivables", "GET", session),

  createReceivable: (
    tenantId: string,
    session: SessionContext,
    payload: ReceivablePayload,
  ) =>
    apiRequest<ReceivableInvoice>(
      "/finance/receivables",
      "POST",
      session,
      payload,
    ),

  markReceived: (tenantId: string, session: SessionContext, id: string) =>
    apiRequest<void>(
      `/finance/receivables/${id}/mark-received`,
      "POST",
      session,
    ),

  sendReceivableReminder: (
    tenantId: string,
    session: SessionContext,
    id: string,
  ) => apiRequest<void>(`/finance/receivables/${id}/remind`, "POST", session),

  // Payables
  listPayables: (tenantId: string, session: SessionContext) =>
    apiRequest<FinancePayableRow[]>("/finance/payables", "GET", session),

  createPayable: (
    tenantId: string,
    session: SessionContext,
    payload: PayablePayload,
  ) => apiRequest<PayableBill>("/finance/payables", "POST", session, payload),

  approvePayable: (tenantId: string, session: SessionContext, id: string) =>
    apiRequest<PayableBill | null>(
      `/finance/payables/${id}/approve`,
      "POST",
      session,
    ),

  markPaid: (tenantId: string, session: SessionContext, id: string) =>
    apiRequest<void>(`/finance/payables/${id}/mark-paid`, "POST", session),

  // Invoices (Aggregated)
  listInvoices: (tenantId: string, session: SessionContext) =>
    apiRequest<FinanceInvoiceRow[]>("/finance/invoices", "GET", session),

  captureInvoice: (
    tenantId: string,
    session: SessionContext,
    payload: ReceivablePayload,
  ) =>
    apiRequest<ReceivableInvoice>(
      "/finance/receivables",
      "POST",
      session,
      payload,
    ),

  capturePayableInvoice: (
    tenantId: string,
    session: SessionContext,
    payload: InvoiceCapturePayload,
  ) =>
    apiRequest<PayableBill>(
      "/finance/payables",
      "POST",
      session,
      payload,
    ),

  // Journals
  listJournals: (tenantId: string, session: SessionContext) =>
    apiRequest<FinanceJournalRow[]>("/finance/ledger", "GET", session),

  createJournal: (
    tenantId: string,
    session: SessionContext,
    payload: JournalPayload,
  ) => apiRequest<JournalEntry>("/finance/ledger", "POST", session, payload),

  // Payments
  listPayments: (tenantId: string, session: SessionContext) =>
    apiRequest<FinancePaymentRow[]>("/finance/payments", "GET", session),

  createPayment: (
    tenantId: string,
    session: SessionContext,
    payload: PaymentRequestPayload,
  ) =>
    apiRequest<PaymentRequest>("/finance/payments", "POST", session, payload),

  createPaymentRequest: (
    tenantId: string,
    session: SessionContext,
    payload: PaymentRequestPayload,
  ) =>
    apiRequest<PaymentRequest>(
      "/finance/payment-requests",
      "POST",
      session,
      payload,
    ),

  updatePaymentStatus: (
    tenantId: string,
    session: SessionContext,
    id: string,
    status: string,
  ) =>
    apiRequest<void>(`/finance/payments/${id}/status`, "POST", session, {
      status,
    }),

  // Documents
  listDocuments: (tenantId: string, session: SessionContext) =>
    apiRequest<FinanceDocumentRow[]>("/finance/documents", "GET", session),

  // Treasury
  listSources: (tenantId: string, session: SessionContext) =>
    apiRequest<MoneySource[]>("/finance/treasury/sources", "GET", session),

  listTransfers: (tenantId: string, session: SessionContext) =>
    apiRequest<TreasuryTransfer[]>(
      "/finance/treasury/transfers",
      "GET",
      session,
    ),

  createTransfer: (
    tenantId: string,
    session: SessionContext,
    payload: TreasuryTransferPayload,
  ) =>
    apiRequest<TreasuryTransfer>(
      "/finance/treasury/transfers",
      "POST",
      session,
      payload,
    ),

  reconcileSettlement: (
    tenantId: string,
    session: SessionContext,
    sourceId: string,
    amount: number,
  ) =>
    apiRequest<void>("/finance/treasury/reconcile", "POST", session, {
      sourceId,
      amount,
    }),

  uploadDocumentForApproval: (
    tenantId: string,
    session: SessionContext,
    payload: {
      title: string;
      type: string;
      description: string;
      file: File | Blob | null; // Improved from any
    },
  ) =>
    apiRequest<FinanceDocumentRow>(
      "/finance/documents/upload",
      "POST",
      session,
      payload,
    ),

  updateDocumentStatus: (
    tenantId: string,
    session: SessionContext,
    id: string,
    status: string,
  ) =>
    apiRequest<void>(`/finance/documents/${id}/status`, "POST", session, {
      status,
    }),

  // Policies
  listPolicies: (tenantId: string, session: SessionContext) =>
    apiRequest<FinancePolicyRow[]>("/finance/policies", "GET", session),

  createPolicy: (
    tenantId: string,
    session: SessionContext,
    payload: PolicyPayload,
  ) =>
    apiRequest<FinancePolicyRow>("/finance/policies", "POST", session, payload),

  togglePolicy: (tenantId: string, session: SessionContext, id: string) =>
    apiRequest<void>(`/finance/policies/${id}/toggle`, "POST", session),

  // Periods
  listPeriods: (tenantId: string, session: SessionContext) =>
    apiRequest<AccountingPeriod[]>("/finance/periods", "GET", session),

  lockPeriod: (tenantId: string, session: SessionContext, id: string) =>
    apiRequest<void>(`/finance/periods/${id}/lock`, "POST", session),

  approvePeriodClose: (tenantId: string, session: SessionContext, id: string) =>
    apiRequest<void>(`/finance/periods/${id}/approve-close`, "POST", session),

  markPeriodFailed: (tenantId: string, session: SessionContext, id: string) =>
    apiRequest<void>(`/finance/periods/${id}/fail`, "POST", session),

  reopenPeriod: (tenantId: string, session: SessionContext, id: string) =>
    apiRequest<void>(`/finance/periods/${id}/reopen`, "POST", session),

  forceClosePeriod: (tenantId: string, session: SessionContext, id: string) =>
    apiRequest<void>(`/finance/periods/${id}/force-close`, "POST", session),

  // Insights & Alerts
  getFinanceInsights: (tenantId: string, session: SessionContext) =>
    apiRequest<FinanceInsight[]>("/finance/insights", "GET", session),

  getInbox: (tenantId: string, session: SessionContext) =>
    apiRequest<WorkflowRequest[]>("/finance/inbox", "GET", session),

  getAlerts: (tenantId: string, session: SessionContext) =>
    apiRequest<FinanceAlert[]>("/finance/alerts", "GET", session),

  // Payroll
  getPayrollEntries: (
    tenantId: string,
    session: SessionContext,
    period?: string,
  ) => {
    const query = period ? `?period=${period}` : "";
    return apiRequest<PayrollEntry[]>(
      `/finance/payroll/entries${query}`,
      "GET",
      session,
    );
  },

  createPayrollEntry: (
    tenantId: string,
    session: SessionContext,
    payload: Partial<PayrollEntry>,
  ) =>
    apiRequest<PayrollEntry>(
      "/finance/payroll/entries",
      "POST",
      session,
      payload,
    ),

  updatePayrollEntry: (
    tenantId: string,
    session: SessionContext,
    entryId: string,
    updates: Partial<PayrollEntry>,
  ) =>
    apiRequest<PayrollEntry>(
      `/finance/payroll/entries/${entryId}`,
      "PATCH",
      session,
      updates,
    ),

  estimatePayroll: (
    tenantId: string,
    session: SessionContext,
    period: string,
  ) =>
    apiRequest<PayrollEstimate[]>(
      `/finance/payroll/estimate?period=${period}`,
      "GET",
      session,
    ),

  runPayroll: (tenantId: string, session: SessionContext, period: string) =>
    apiRequest<boolean>("/finance/payroll/run", "POST", session, { period }),
};
