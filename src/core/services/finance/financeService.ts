import { apiRequest } from "@/core/api/apiClient";
import type { SessionContext } from "@/core/security/session";
import type { WorkflowRequest } from "@/core/tools/workflows/workflowTypes";
import type {
  Asset,
  AssetAuditPack,
  AssetAuditPackArtifact,
  AssetCapexInput,
  AssetDepreciationEntry,
  AssetEvent,
  CapexRequest,
  DepreciationMethod,
  DisposalType,
  FinanceCapexBudgetRow,
  ScheduledDepreciationRunResult,
  FinanceAlert,
} from "@/core/types/finance/assets";
import type {
  PaymentMethod,
  PaymentRequest,
  FinancePaymentRow,
} from "@/core/types/finance/payments";
import type {
  ReceivableInvoice,
  FinanceReceivableRow,
} from "@/core/types/finance/receivables";
import type {
  PayableBill,
  FinancePayableRow,
} from "@/core/types/finance/payables";

export type {
  Asset,
  AssetAuditPack,
  AssetAuditPackArtifact,
  AssetCapexInput,
  AssetDepreciationEntry,
  AssetEvent,
  CapexRequest,
  DepreciationMethod,
  DisposalType,
  FinanceCapexBudgetRow,
  ScheduledDepreciationRunResult,
  FinanceAlert,
  PaymentRequest,
  FinancePaymentRow,
  ReceivableInvoice,
  FinanceReceivableRow,
  PayableBill,
  FinancePayableRow,
};

export interface FinanceInvoiceRow {
  id: string;
  kind: "PAYABLE" | "RECEIVABLE";
  vendor: string;
  amount: number;
  invoiceDate: string;
  dueDate: string;
  status: "PENDING" | "APPROVED" | "PAID" | "OVERDUE";
}

export interface FinanceJournalRow {
  id: string;
  account: string;
  type: "DEBIT" | "CREDIT";
  amount: number;
  description: string;
  status: string;
  createdAt: string;
  lines?: JournalLineInput[];
}

export interface AccountingPeriod {
  id: string;
  startDate: string;
  endDate: string;
  status: "OPEN" | "CLOSING" | "CLOSED" | "FAILED";
  lockedBy?: string;
  approvalLevel?: number;
}

export interface FinanceInsight {
  id: string;
  title: string;
  category: "PAYMENTS" | "CASHFLOW" | "APPROVALS" | "PERIODS";
  value: string;
  trend: "UP" | "DOWN" | "NEUTRAL";
}

export interface FinanceDocumentRow {
  id: string;
  title: string;
  type: string;
  description: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  uploadedAt: string;
  uploadedBy: string;
}

export interface FinancePolicyRow {
  id: string;
  title: string;
  type: string;
  description: string;
  threshold: number;
  active: boolean;
}

export interface CapexBudgetPayload {
  department: string;
  totalBudget: number;
  notes?: string;
  accountCode?: string;
}

export interface DepreciationRunPayload {
  periodStart: string;
  periodEnd: string;
  postingDate?: string;
  cfoSignoff?: boolean;
}

export interface PostDepreciationPayload {
  assetId: string;
  postingDate: string;
  method?: DepreciationMethod;
  unitsProduced?: number;
  cfoSignoff?: boolean;
}

export interface AssetImpairmentPayload {
  assetId: string;
  impairmentAmount: number;
  reason: string;
  attachmentDocumentIds: string[];
}

export interface AssetRevaluationPayload {
  assetId: string;
  revaluedAmount: number;
  reason: string;
  attachmentDocumentIds: string[];
}

export interface AssetDisposalPayload {
  assetId: string;
  disposalType: DisposalType;
  proceeds: number;
  attachmentDocumentIds: string[];
}

export interface ReceivablePayload {
  customer: string;
  amount: number;
  dueDate: string;
  invoiceDate?: string;
  currency?: "IDR" | "USD";
}

export interface PayablePayload {
  vendor: string;
  amount: number;
  dueDate: string;
  currency?: string;
}

export interface InvoiceCapturePayload {
  vendor: string;
  amount: number;
  invoiceDate: string;
  dueDate: string;
}

export interface JournalLineInput {
  accountCode: string;
  description: string;
  debit: number;
  credit: number;
}

export interface JournalPayload {
  ref?: string;
  description: string;
  status?: string;
  lines: JournalLineInput[];
}

export interface PaymentRequestPayload {
  amount: number;
  currency?: string;
  method?:
    | "QRIS"
    | "GOPAY"
    | "OVO"
    | "DANA"
    | "SHOPEEPAY"
    | "BANK_TRANSFER"
    | "CARD";
  source?: string;
  beneficiary: string;
  departmentId?: string;
  purpose?: string;
  extraInfo?: Record<string, unknown>;
}

export interface TreasuryTransferPayload {
  sourceId: string;
  destinationId: string;
  amount: number;
  description: string;
}

export interface PolicyPayload {
  title: string;
  type: string;
  description: string;
  threshold: number;
}

export const financeService = {
  async getInbox(
    tenantId: string,
    session: SessionContext,
  ): Promise<WorkflowRequest[]> {
    return apiRequest<WorkflowRequest[]>("/finance/inbox", "GET", session);
  },

  async getMoneySources(
    tenantId: string,
    session: SessionContext,
  ): Promise<
    Array<{
      id: string;
      name: string;
      type: string;
      currency: string;
      balance: number;
      provider?: string | null;
    }>
  > {
    return apiRequest<
      Array<{
        id: string;
        name: string;
        type: string;
        currency: string;
        balance: number;
        provider?: string | null;
      }>
    >("/finance/money-sources", "GET", session);
  },

  async getAlerts(
    tenantId: string,
    session: SessionContext,
  ): Promise<FinanceAlert[]> {
    return apiRequest<FinanceAlert[]>("/finance/alerts", "GET", session);
  },

  async createPaymentRequest(
    tenantId: string,
    session: SessionContext,
    payload: {
      amount: number;
      currency?: string;
      method?: PaymentMethod;
      source?: string;
      beneficiary: string;
      departmentId?: string;
      purpose?: string;
      extraInfo?: Record<string, unknown>;
    },
  ): Promise<PaymentRequest> {
    return apiRequest<PaymentRequest>(
      "/finance/payment-requests",
      "POST",
      session,
      payload,
    );
  },

  async updatePaymentStatus(
    tenantId: string,
    id: string,
    status: string,
    session: SessionContext,
  ): Promise<void> {
    return apiRequest<void>(`/finance/payments/${id}/status`, "PUT", session, {
      status,
    });
  },

  async listAssets(
    tenantId: string,
    session: SessionContext,
  ): Promise<Asset[]> {
    return apiRequest<Asset[]>("/finance/assets", "GET", session);
  },

  async listPayments(
    tenantId: string,
    session: SessionContext,
  ): Promise<FinancePaymentRow[]> {
    return apiRequest<FinancePaymentRow[]>("/finance/payments", "GET", session);
  },

  async listCapexRequests(
    tenantId: string,
    session: SessionContext,
  ): Promise<CapexRequest[]> {
    return apiRequest<CapexRequest[]>(
      "/finance/capex/requests",
      "GET",
      session,
    );
  },

  async listCapexBudgets(
    tenantId: string,
    session: SessionContext,
  ): Promise<FinanceCapexBudgetRow[]> {
    return apiRequest<FinanceCapexBudgetRow[]>(
      "/finance/capex/budgets",
      "GET",
      session,
    );
  },

  async setCapexBudget(
    tenantId: string,
    session: SessionContext,
    payload: CapexBudgetPayload,
  ): Promise<FinanceCapexBudgetRow> {
    return apiRequest<FinanceCapexBudgetRow>(
      "/finance/capex/budgets",
      "POST",
      session,
      payload,
    );
  },

  async createCapexRequest(
    tenantId: string,
    session: SessionContext,
    input: AssetCapexInput,
  ): Promise<{ asset: Asset; capex: CapexRequest }> {
    return apiRequest<{ asset: Asset; capex: CapexRequest }>(
      "/finance/capex/requests",
      "POST",
      session,
      input,
    );
  },

  async createAsset(
    tenantId: string,
    session: SessionContext,
    input: AssetCapexInput,
  ): Promise<Asset> {
    // Helper that just delegates to createCapexRequest as per original logic,
    // or we can invoke the API if there is a specific endpoint.
    // The original logic wrapped createCapexRequest.
    // For API efficiency, we can keep this wrapper if reuse is needed, or just call the API.
    // However, the original returned just the asset.
    const { asset } = await this.createCapexRequest(tenantId, session, input);
    return asset;
  },

  async approveCapexRequest(
    tenantId: string,
    session: SessionContext,
    requestId: string,
  ): Promise<CapexRequest | null> {
    return apiRequest<CapexRequest>(
      `/finance/capex/requests/${requestId}/approve`,
      "POST",
      session,
    );
  },

  async rejectCapexRequest(
    tenantId: string,
    session: SessionContext,
    requestId: string,
    notes?: string,
  ): Promise<CapexRequest | null> {
    return apiRequest<CapexRequest>(
      `/finance/capex/requests/${requestId}/reject`,
      "POST",
      session,
      { notes },
    );
  },

  async capitalizeAsset(
    tenantId: string,
    session: SessionContext,
    assetId: string,
    capitalizationDate: string,
  ): Promise<Asset | null> {
    return apiRequest<Asset>(
      `/finance/assets/${assetId}/capitalize`,
      "POST",
      session,
      { capitalizationDate },
    );
  },

  async listAssetDepreciationEntries(
    tenantId: string,
    session: SessionContext,
    assetId?: string,
  ): Promise<AssetDepreciationEntry[]> {
    const query = assetId ? `?assetId=${assetId}` : "";
    return apiRequest<AssetDepreciationEntry[]>(
      `/finance/assets/depreciation${query}`,
      "GET",
      session,
    );
  },

  async postDepreciation(
    tenantId: string,
    session: SessionContext,
    params: PostDepreciationPayload,
  ): Promise<AssetDepreciationEntry & { journalEntryId: string }> {
    return apiRequest<AssetDepreciationEntry & { journalEntryId: string }>(
      `/finance/assets/${params.assetId}/depreciation`,
      "POST",
      session,
      params,
    );
  },

  async runScheduledPeriodDepreciation(
    tenantId: string,
    session: SessionContext,
    params: DepreciationRunPayload,
  ): Promise<ScheduledDepreciationRunResult> {
    return apiRequest<ScheduledDepreciationRunResult>(
      "/finance/assets/depreciation/schedule-run",
      "POST",
      session,
      params,
    );
  },

  async recordAssetImpairment(
    tenantId: string,
    session: SessionContext,
    params: AssetImpairmentPayload,
  ): Promise<AssetEvent> {
    return apiRequest<AssetEvent>(
      `/finance/assets/${params.assetId}/impairment`,
      "POST",
      session,
      params,
    );
  },

  async recordAssetRevaluation(
    tenantId: string,
    session: SessionContext,
    params: AssetRevaluationPayload,
  ): Promise<AssetEvent> {
    return apiRequest<AssetEvent>(
      `/finance/assets/${params.assetId}/revaluation`,
      "POST",
      session,
      params,
    );
  },

  async disposeAsset(
    tenantId: string,
    session: SessionContext,
    params: AssetDisposalPayload,
  ): Promise<AssetEvent> {
    return apiRequest<AssetEvent>(
      `/finance/assets/${params.assetId}/disposal`,
      "POST",
      session,
      params,
    );
  },

  async listAssetEvents(
    tenantId: string,
    session: SessionContext,
    assetId?: string,
  ): Promise<AssetEvent[]> {
    const query = assetId ? `?assetId=${assetId}` : "";
    return apiRequest<AssetEvent[]>(
      `/finance/assets/events${query}`,
      "GET",
      session,
    );
  },

  async generateAssetAuditPack(
    tenantId: string,
    session: SessionContext,
    assetId: string,
  ): Promise<AssetAuditPack> {
    return apiRequest<AssetAuditPack>(
      `/finance/assets/${assetId}/audit-pack`,
      "GET",
      session,
    );
  },

  async downloadAssetAuditPack(
    tenantId: string,
    session: SessionContext,
    assetId: string,
    format: "JSON" | "PDF",
  ): Promise<AssetAuditPackArtifact> {
    return apiRequest<AssetAuditPackArtifact>(
      `/finance/assets/${assetId}/audit-pack/download?format=${format}`,
      "GET",
      session,
    );
  },

  async verifyAssetAuditPack(
    tenantId: string,
    session: SessionContext,
    pack: AssetAuditPack,
  ): Promise<boolean> {
    return apiRequest<boolean>(
      "/finance/assets/audit-pack/verify",
      "POST",
      session,
      { pack },
    );
  },

  async updateAssetStatus(
    tenantId: string,
    session: SessionContext,
    id: string,
    status: Asset["status"],
  ): Promise<Asset | null> {
    return apiRequest<Asset>(`/finance/assets/${id}/status`, "POST", session, {
      status,
    });
  },

  async listReceivables(
    tenantId: string,
    session: SessionContext,
  ): Promise<FinanceReceivableRow[]> {
    return apiRequest<FinanceReceivableRow[]>(
      "/finance/receivables",
      "GET",
      session,
    );
  },

  async createReceivable(
    tenantId: string,
    session: SessionContext,
    payload: ReceivablePayload,
  ): Promise<ReceivableInvoice> {
    return apiRequest<ReceivableInvoice>(
      "/finance/receivables",
      "POST",
      session,
      payload,
    );
  },

  async sendReceivableReminder(
    tenantId: string,
    session: SessionContext,
    id: string,
  ): Promise<void> {
    return apiRequest<void>(
      `/finance/receivables/${id}/remind`,
      "POST",
      session,
    );
  },

  async markReceived(
    tenantId: string,
    session: SessionContext,
    id: string,
  ): Promise<void> {
    return apiRequest<void>(
      `/finance/receivables/${id}/mark-received`,
      "POST",
      session,
    );
  },

  // Invoices (Aggregated)
  async listInvoices(
    tenantId: string,
    session: SessionContext,
  ): Promise<FinanceInvoiceRow[]> {
    return apiRequest<FinanceInvoiceRow[]>("/finance/invoices", "GET", session);
  },

  async capturePayableInvoice(
    tenantId: string,
    session: SessionContext,
    payload: InvoiceCapturePayload,
  ): Promise<FinanceInvoiceRow> {
    return apiRequest<FinanceInvoiceRow>(
      "/finance/payables",
      "POST",
      session,
      payload,
    );
  },


  async createPayable(
    tenantId: string,
    session: SessionContext,
    payload: PayablePayload,
  ): Promise<FinanceInvoiceRow> {
    // Adapter to capturePayableInvoice
    return this.capturePayableInvoice(tenantId, session, {
      vendor: payload.vendor,
      amount: payload.amount,
      dueDate: payload.dueDate,
      invoiceDate: new Date().toISOString(),
    });
  },

  // Periods
  async listPeriods(
    tenantId: string,
    session: SessionContext,
  ): Promise<AccountingPeriod[]> {
    return apiRequest<AccountingPeriod[]>("/finance/periods", "GET", session);
  },

  async lockPeriod(
    tenantId: string,
    session: SessionContext,
    id: string,
  ): Promise<void> {
    return apiRequest<void>(`/finance/periods/${id}/lock`, "POST", session);
  },

  async approvePeriodClose(
    tenantId: string,
    session: SessionContext,
    id: string,
  ): Promise<void> {
    return apiRequest<void>(
      `/finance/periods/${id}/approve-close`,
      "POST",
      session,
    );
  },

  async markPeriodFailed(
    tenantId: string,
    session: SessionContext,
    id: string,
  ): Promise<void> {
    return apiRequest<void>(`/finance/periods/${id}/fail`, "POST", session);
  },

  async reopenPeriod(
    tenantId: string,
    session: SessionContext,
    id: string,
  ): Promise<void> {
    return apiRequest<void>(`/finance/periods/${id}/reopen`, "POST", session);
  },

  async forceClosePeriod(
    tenantId: string,
    session: SessionContext,
    id: string,
  ): Promise<void> {
    return apiRequest<void>(
      `/finance/periods/${id}/force-close`,
      "POST",
      session,
    );
  },

  // Insights
  async getFinanceInsights(
    tenantId: string,
    session: SessionContext,
  ): Promise<FinanceInsight[]> {
    return apiRequest<FinanceInsight[]>("/finance/insights", "GET", session);
  },

  async getFinanceOverview(
    tenantId: string,
    session: SessionContext,
  ): Promise<Record<string, unknown>> {
    return apiRequest<Record<string, unknown>>(
      "/finance/overview",
      "GET",
      session,
    );
  },
};
