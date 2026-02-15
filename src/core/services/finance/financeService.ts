import { audit } from "@/core/logging/audit";
import { resolveDepartment } from "@/core/org/departmentResolver";
import type { Asset } from "@/core/repositories/finance/financeRepository";
import { mockFinanceRepo } from "@/core/repositories/finance/mockFinanceRepo";
import { Roles } from "@/core/security/roles";
import type { SessionContext } from "@/core/security/session";
import { workflowService } from "@/core/services/hr/workflowService";
import { paymentService } from "@/core/services/payment/paymentService";
import type { WorkflowEntityType, WorkflowRequest } from "@/core/tools/workflows/workflowTypes";
import type {
  AssetAuditPack,
  AssetDepreciationEntry,
  AssetDisposalEvent,
  AssetEvent,
  AssetRevaluationEvent,
  CapexRequest,
  DepreciationMethod,
  DisposalType,
  FixedAsset,
} from "@/core/types/finance/assets";
import type { JournalEntry } from "@/core/types/finance/ledger";
import { PaymentMethod, type PaymentRequest } from "@/core/types/finance/payments";
import type { PayableBill } from "@/core/types/finance/payables";
import type { ReceivableInvoice } from "@/core/types/finance/receivables";

const repo = mockFinanceRepo;

const ensureTenant = (tenantId: string, session: SessionContext) => {
  if (session.role === "SUPERADMIN") return;
  if (tenantId !== session.tenantId) throw new Error("Tenant access denied");
};

const nowIso = () => new Date().toISOString();
const todayIsoDate = () => nowIso().slice(0, 10);
const isPastDate = (isoDate: string) => isoDate < todayIsoDate();
const toAuditRecord = <T extends object>(value: T): Record<string, unknown> =>
  ({ ...value }) as Record<string, unknown>;

const PAYMENT_METHODS: PaymentMethod[] = [
  "BANK_TRANSFER",
  "QRIS",
  "GOPAY",
  "OVO",
  "DANA",
  "SHOPEEPAY",
  "CARD",
];

const FINANCE_WORKFLOW_TYPES: WorkflowEntityType[] = [
  "PAYMENT",
  "PURCHASE",
  "TREASURY_TRANSFER",
  "ASSET_REQUEST",
];

const HOD_APPROVER_ROLES = new Set([
  Roles.DEPT_HEAD,
  Roles.FINANCE_DEPT_HEAD,
  Roles.COMPANY_ADMIN,
  Roles.OWNER,
  Roles.SUPERADMIN,
]);

const CFO_APPROVER_ROLES = new Set([
  Roles.FINANCE_ADMIN,
  Roles.COMPANY_ADMIN,
  Roles.OWNER,
  Roles.SUPERADMIN,
]);

const toPaymentMethod = (value: string): PaymentMethod =>
  PAYMENT_METHODS.find((method) => method === value) ?? "BANK_TRANSFER";

const channelToFinanceMethod = (channel: string): PaymentMethod => {
  if (channel === "QR") return "QRIS";
  if (channel === "WALLET") return "GOPAY";
  if (channel === "CARD_ONLINE" || channel === "CARD_POS") return "CARD";
  return "BANK_TRANSFER";
};

const createPaymentSystemSession = (tenantId: string): SessionContext => ({
  userId: "finance-payment-system",
  tenantId,
  role: Roles.SUPERADMIN,
  departmentId: "FINANCE",
});

const getSessionDepartmentCode = (session: SessionContext) =>
  normalizeDepartmentCode(
    resolveDepartment(session.departmentId)?.code ?? session.departmentId,
  );

type FinanceDocumentStatus = "PENDING" | "APPROVED" | "REJECTED";
type FinancePolicyType = "APPROVAL_LIMIT" | "PAYMENT_RULE" | "EXPENSE_POLICY";
type PeriodStatus = "OPEN" | "CLOSING" | "CLOSED" | "FAILED";
const CAPEX_BUDGET_ACCOUNT_PREFIX = "BUD-CAPEX-";
const AUDIT_SIGNING_KEY_PREFIX = "fin:audit-pack-signing-key:";

const normalizeDepartmentCode = (department: string) =>
  department.trim().toUpperCase().replace(/\s+/g, "_");

const getCapexBudgetAccount = (department: string) =>
  `${CAPEX_BUDGET_ACCOUNT_PREFIX}${normalizeDepartmentCode(department)}`;

const isFinanciallyFinalJournalStatus = (status: JournalEntry["status"]) =>
  status === "approved" || status === "posted" || status === "locked";

type CapexBudgetSnapshot = {
  department: string;
  accountCode: string;
  allocatedBudget: number;
  committedBudget: number;
  availableBudget: number;
};

export type FinanceAlert = {
  id: string;
  type: "approval" | "cash" | "receivable" | "payable" | "compliance";
  title: string;
  description: string;
  severity: "low" | "medium" | "high";
  action?: string;
};

export type FinanceReceivableRow = {
  id: string;
  customer: string;
  invoiceId: string;
  amount: number;
  dueDate: string;
  status: "PENDING" | "APPROVED" | "OVERDUE";
};

export type FinancePayableRow = {
  id: string;
  vendor: string;
  invoiceId: string;
  amount: number;
  dueDate: string;
  status: "PENDING" | "APPROVED" | "OVERDUE";
};

export type FinanceInvoiceRow = {
  id: string;
  kind: "PAYABLE" | "RECEIVABLE";
  vendor: string;
  amount: number;
  invoiceDate: string;
  dueDate: string;
  status: "PENDING" | "APPROVED" | "OVERDUE";
};

export type FinanceJournalRow = {
  id: string;
  account: string;
  type: "DEBIT" | "CREDIT";
  amount: number;
  description: string;
  status: "DRAFT" | "APPROVED" | "POSTED" | "LOCKED";
};

export type FinancePaymentRow = {
  id: string;
  destination: string;
  method: PaymentMethod;
  amount: number;
  purpose: string;
  approvalLevel: number;
  status: "PENDING" | "APPROVED" | "REJECTED" | "SCHEDULED" | "FAILED";
};

export type FinanceDocumentRow = {
  id: string;
  title: string;
  type: string;
  description: string;
  status: FinanceDocumentStatus;
  uploadedAt: string;
  uploadedBy?: string;
};

export type FinancePolicyRow = {
  id: string;
  title: string;
  type: FinancePolicyType;
  description: string;
  threshold: number;
  active: boolean;
};

export type FinanceInsight = {
  id: string;
  title: string;
  category: "PAYMENTS" | "CASHFLOW" | "APPROVALS" | "PERIODS";
  value: string;
};

export type AccountingPeriod = {
  id: string;
  startDate: string;
  endDate: string;
  status: PeriodStatus;
  lockedBy?: string;
  approvalLevel?: number;
};

const docsStore = new Map<string, FinanceDocumentRow[]>();
const policiesStore = new Map<string, FinancePolicyRow[]>();
const periodsStore = new Map<string, AccountingPeriod[]>();

const mapInvoiceStatus = (
  status: ReceivableInvoice["status"],
  dueDate: string,
): FinanceReceivableRow["status"] => {
  if (status === "paid") return "APPROVED";
  if (status === "overdue") return "OVERDUE";
  if (isPastDate(dueDate) && status !== "paid") return "OVERDUE";
  return "PENDING";
};

const mapPayableStatus = (
  status: PayableBill["status"],
  dueDate: string,
): FinancePayableRow["status"] => {
  if (status === "paid" || status === "approved") return "APPROVED";
  if (isPastDate(dueDate)) return "OVERDUE";
  return "PENDING";
};

const ensureDocs = (tenantId: string): FinanceDocumentRow[] => {
  const docs = docsStore.get(tenantId);
  if (docs) return docs;
  const seed: FinanceDocumentRow[] = [
    {
      id: `${tenantId}-doc-001`,
      title: "Invoice Pack Jan",
      type: "INVOICE",
      description: "Monthly invoice packet",
      status: "PENDING",
      uploadedAt: nowIso(),
      uploadedBy: "system",
    },
  ];
  docsStore.set(tenantId, seed);
  return seed;
};

const ensurePolicies = (tenantId: string): FinancePolicyRow[] => {
  const policies = policiesStore.get(tenantId);
  if (policies) return policies;
  const seed: FinancePolicyRow[] = [
    {
      id: `${tenantId}-pol-001`,
      title: "Default approval limit",
      type: "APPROVAL_LIMIT",
      description: "Approvals required above 50,000,000",
      threshold: 50000000,
      active: true,
    },
  ];
  policiesStore.set(tenantId, seed);
  return seed;
};

const ensurePeriods = (tenantId: string): AccountingPeriod[] => {
  const periods = periodsStore.get(tenantId);
  if (periods) return periods;
  const seed: AccountingPeriod[] = [
    {
      id: `${tenantId}-prd-open`,
      startDate: "2026-02-01",
      endDate: "2026-02-28",
      status: "OPEN",
      approvalLevel: 0,
    },
    {
      id: `${tenantId}-prd-closing`,
      startDate: "2026-01-01",
      endDate: "2026-01-31",
      status: "CLOSING",
      lockedBy: "FinanceOps",
      approvalLevel: 1,
    },
    {
      id: `${tenantId}-prd-closed`,
      startDate: "2025-12-01",
      endDate: "2025-12-31",
      status: "CLOSED",
      lockedBy: "FinanceOps",
      approvalLevel: 0,
    },
    {
      id: `${tenantId}-prd-failed`,
      startDate: "2025-11-01",
      endDate: "2025-11-30",
      status: "FAILED",
      lockedBy: "FinanceOps",
      approvalLevel: 2,
    },
  ];
  periodsStore.set(tenantId, seed);
  return seed;
};

const updatePeriod = (
  tenantId: string,
  periodId: string,
  patch: Partial<AccountingPeriod>,
): AccountingPeriod | null => {
  let updated: AccountingPeriod | null = null;
  const next = ensurePeriods(tenantId).map((period) => {
    if (period.id !== periodId) return period;
    updated = { ...period, ...patch };
    return updated;
  });
  periodsStore.set(tenantId, next);
  return updated;
};

const createFinanceWorkflow = (
  tenantId: string,
  session: SessionContext,
  params: {
    entityType: WorkflowEntityType;
    entityId: string;
    destinationDept?: string;
    notes?: string;
    metadata?: Record<string, string>;
  },
) =>
  workflowService.createRequest(tenantId, session, {
    entityType: params.entityType,
    entityId: params.entityId,
    makerDept: session.departmentId,
    destinationDept: params.destinationDept ?? "FINANCE",
    notes: params.notes,
    metadata: params.metadata,
  });

const createId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

const monthsBetween = (fromDate: string, toDate: string) => {
  const from = new Date(fromDate);
  const to = new Date(toDate);
  const years = to.getFullYear() - from.getFullYear();
  const months = to.getMonth() - from.getMonth();
  return Math.max(years * 12 + months + 1, 1);
};

const calculateDepreciationAmount = (
  asset: FixedAsset,
  method: DepreciationMethod,
  unitsProduced = 0,
): number => {
  const depreciableBase = Math.max(asset.acquisitionCost - asset.residualValue, 0);
  if (depreciableBase <= 0 || asset.usefulLifeYears <= 0) return 0;

  if (method === "DECLINING_BALANCE") {
    const rate = 2 / asset.usefulLifeYears;
    return Math.max((asset.carryingValue || asset.acquisitionCost) * rate / 12, 0);
  }

  if (method === "UNIT_OF_PRODUCTION") {
    const expectedUnits = Math.max(asset.usefulLifeYears * 1200, 1);
    return Math.max((depreciableBase / expectedUnits) * Math.max(unitsProduced, 0), 0);
  }

  return depreciableBase / (asset.usefulLifeYears * 12);
};

const hasMaterialDepreciationThreshold = (tenantId: string, amount: number) => {
  const threshold =
    ensurePolicies(tenantId).find((policy) => policy.type === "APPROVAL_LIMIT")?.threshold ??
    Number.POSITIVE_INFINITY;
  return amount >= threshold;
};

const canApproveCapexAsHod = (session: SessionContext, request: CapexRequest) => {
  if (session.role === Roles.SUPERADMIN || session.role === Roles.OWNER) return true;
  if (session.role === Roles.COMPANY_ADMIN) return true;
  if (!HOD_APPROVER_ROLES.has(session.role)) return false;
  const requestDepartment = normalizeDepartmentCode(request.department);
  return getSessionDepartmentCode(session) === requestDepartment;
};

const canApproveCapexAsCfo = (session: SessionContext) => {
  if (session.role === Roles.SUPERADMIN || session.role === Roles.OWNER) return true;
  if (session.role === Roles.COMPANY_ADMIN) return true;
  if (!CFO_APPROVER_ROLES.has(session.role)) return false;
  return getSessionDepartmentCode(session) === "FINANCE";
};

const ensureMaterialEventCfoSignoff = (
  tenantId: string,
  session: SessionContext,
  amount: number,
  eventName: string,
) => {
  if (hasMaterialDepreciationThreshold(tenantId, Math.abs(amount)) && !canApproveCapexAsCfo(session)) {
    throw new Error(`Material ${eventName} requires CFO approval role.`);
  }
};

const ensureDocumentsExist = (tenantId: string, documentIds: string[]) => {
  if (!documentIds.length) {
    throw new Error("At least one supporting document is required.");
  }
  const docs = ensureDocs(tenantId);
  const allExist = documentIds.every((id) => docs.some((doc) => doc.id === id));
  if (!allExist) {
    throw new Error("One or more supporting documents were not found.");
  }
};

const createSystemJournalEntry = (
  tenantId: string,
  description: string,
  lines: JournalEntry["lines"],
) => {
  const entry: JournalEntry = {
    id: createId("jr"),
    tenantId,
    description,
    lines,
    status: "posted",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  repo.createJournalEntry(tenantId, entry);
  return entry;
};

const listCapexBudgetSnapshots = (tenantId: string): CapexBudgetSnapshot[] => {
  const journals = repo
    .listJournalEntries(tenantId)
    .filter((entry) => isFinanciallyFinalJournalStatus(entry.status));
  const requests = repo
    .listCapexRequests(tenantId)
    .filter((request) => request.status !== "REJECTED");

  const departments = new Set<string>();
  for (const entry of journals) {
    for (const line of entry.lines) {
      if (line.accountCode.startsWith(CAPEX_BUDGET_ACCOUNT_PREFIX)) {
        departments.add(line.accountCode.replace(CAPEX_BUDGET_ACCOUNT_PREFIX, ""));
      }
    }
  }
  for (const request of requests) {
    departments.add(normalizeDepartmentCode(request.department));
  }

  return Array.from(departments)
    .map((departmentCode) => {
      const accountCode = getCapexBudgetAccount(departmentCode);
      const allocatedBudget = journals.reduce((sum, entry) => {
        const lines = entry.lines.filter((line) => line.accountCode === accountCode);
        const lineBalance = lines.reduce(
          (lineSum, line) => lineSum + line.debit - line.credit,
          0,
        );
        return sum + lineBalance;
      }, 0);
      const committedBudget = requests
        .filter((request) => normalizeDepartmentCode(request.department) === departmentCode)
        .reduce((sum, request) => sum + request.requestedAmount, 0);

      return {
        department: departmentCode,
        accountCode,
        allocatedBudget,
        committedBudget,
        availableBudget: allocatedBudget - committedBudget,
      };
    })
    .sort((left, right) => left.department.localeCompare(right.department));
};

const getCapexBudgetSnapshot = (
  tenantId: string,
  department: string,
): CapexBudgetSnapshot => {
  const normalizedDepartment = normalizeDepartmentCode(department);
  const existing = listCapexBudgetSnapshots(tenantId).find(
    (budget) => budget.department === normalizedDepartment,
  );
  if (existing) return existing;
  return {
    department: normalizedDepartment,
    accountCode: getCapexBudgetAccount(normalizedDepartment),
    allocatedBudget: 0,
    committedBudget: 0,
    availableBudget: 0,
  };
};

const buildChecksum = (content: string) => {
  let hash = 0;
  for (let i = 0; i < content.length; i += 1) {
    hash = (hash << 5) - hash + content.charCodeAt(i);
    hash |= 0;
  }
  return `chk-${Math.abs(hash).toString(16)}`;
};

const getAuditSigningKey = (tenantId: string) => {
  if (typeof window === "undefined") return `${AUDIT_SIGNING_KEY_PREFIX}${tenantId}:server`;
  const key = `${AUDIT_SIGNING_KEY_PREFIX}${tenantId}`;
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const generated = createId("audit-key");
  window.localStorage.setItem(key, generated);
  return generated;
};

const signAuditPackPayload = (tenantId: string, canonicalPayload: string) =>
  buildChecksum(`${getAuditSigningKey(tenantId)}::${canonicalPayload}`);

const escapePdfText = (text: string) =>
  text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

const buildSimplePdf = (lines: string[]) => {
  const content = [
    "BT",
    "/F1 10 Tf",
    "50 760 Td",
    ...lines.flatMap((line, index) =>
      index === 0
        ? [`(${escapePdfText(line)}) Tj`]
        : ["0 -14 Td", `(${escapePdfText(line)}) Tj`],
    ),
    "ET",
  ].join("\n");

  const objects: string[] = [];
  objects.push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  objects.push("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");
  objects.push(
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n",
  );
  objects.push(
    `4 0 obj\n<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`,
  );
  objects.push("5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n");

  let body = "";
  const offsets = [0];
  for (const object of objects) {
    offsets.push(body.length);
    body += object;
  }
  const xrefStart = `%PDF-1.4\n${body}`.length;
  const xref = [
    "xref",
    `0 ${objects.length + 1}`,
    "0000000000 65535 f ",
    ...offsets.slice(1).map((offset) => `${String(offset + 9).padStart(10, "0")} 00000 n `),
  ].join("\n");
  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  const full = `%PDF-1.4\n${body}${xref}\n${trailer}`;
  return new TextEncoder().encode(full);
};

export type AssetAuditPackArtifact = {
  filename: string;
  mimeType: string;
  data: string | Uint8Array;
};

export type ScheduledDepreciationRunResult = {
  runId: string;
  periodStart: string;
  periodEnd: string;
  postingDate: string;
  postedEntries: number;
  skippedAssetIds: string[];
  journalEntryIds: string[];
};

export type AssetCapexInput = {
  assetDescription: string;
  requestedAmount: number;
  department: string;
  projectCode?: string;
  location: string;
  acquisitionDate: string;
  usefulLifeYears: number;
  residualValue: number;
  depreciationMethod: DepreciationMethod;
  assetClass: FixedAsset["assetClass"];
};

export type FinanceCapexBudgetRow = {
  department: string;
  accountCode: string;
  allocatedBudget: number;
  committedBudget: number;
  availableBudget: number;
};

export const financeService = {
  async getInbox(
    tenantId: string,
    session: SessionContext,
  ): Promise<WorkflowRequest[]> {
    ensureTenant(tenantId, session);
    return workflowService
      .listRequests(tenantId)
      .filter(
        (request) =>
          request.destinationDept === "FINANCE" ||
          FINANCE_WORKFLOW_TYPES.includes(request.entityType),
      );
  },

  async getAlerts(
    tenantId: string,
    session: SessionContext,
  ): Promise<FinanceAlert[]> {
    ensureTenant(tenantId, session);
    const receivables = repo.listReceivables(tenantId);
    const payables = repo.listPayables(tenantId);
    const periods = ensurePeriods(tenantId);
    const closingPeriod = periods.find((period) => period.status === "CLOSING");
    return [
      ...receivables.map((invoice) => ({
        id: invoice.id,
        type: "receivable" as const,
        title: `Invoice ${invoice.id} due`,
        description: `Customer ${invoice.customerName} - ${invoice.amount.toLocaleString()}`,
        severity:
          mapInvoiceStatus(invoice.status, invoice.dueDate) === "OVERDUE"
            ? ("high" as const)
            : ("medium" as const),
        action: "Send reminder",
      })),
      ...payables.map((bill) => ({
        id: bill.id,
        type: "payable" as const,
        title: `Bill ${bill.id} payable`,
        description: `Vendor ${bill.vendorName} - ${bill.amount.toLocaleString()}`,
        severity:
          mapPayableStatus(bill.status, bill.dueDate) === "OVERDUE"
            ? ("high" as const)
            : ("medium" as const),
        action: "Request payment approval",
      })),
      ...(closingPeriod
        ? [
            {
              id: closingPeriod.id,
              type: "compliance" as const,
              title: "Period closing in progress",
              description: `${closingPeriod.startDate} to ${closingPeriod.endDate} requires final approval`,
              severity: "medium" as const,
              action: "Review close checklist",
            },
          ]
        : []),
    ];
  },

  async createPaymentRequest(
    tenantId: string,
    session: SessionContext,
    payload: {
      amount: number;
      method: PaymentMethod;
      destination: string;
      purpose: string;
    },
  ): Promise<PaymentRequest> {
    ensureTenant(tenantId, session);
    const request = paymentService.createFinancePaymentRequest(tenantId, session, {
      destination: payload.destination,
      amount: payload.amount,
      method: payload.method,
      purpose: payload.purpose,
    });

    const flow = createFinanceWorkflow(tenantId, session, {
      entityType: "PAYMENT",
      entityId: request.id,
      notes: payload.purpose,
      metadata: { amount: String(payload.amount), method: payload.method },
    });

    audit.log({
      tenantId,
      actorId: session.userId,
      action: "finance.payment.request",
      entityType: "payment_request",
      entityId: request.id,
      after: { workflowId: flow.id },
    });
    return {
      id: request.id,
      tenantId,
      amount: request.amount,
      currency: request.currency,
      method: payload.method,
      destination: request.destination,
      purpose: payload.purpose,
      status: "pending",
      workflowId: flow.id,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
    };
  },

  async listAssets(tenantId: string, session: SessionContext): Promise<Asset[]> {
    ensureTenant(tenantId, session);
    return repo.listAssets(tenantId);
  },

  listCapexRequests(tenantId: string): CapexRequest[] {
    return repo.listCapexRequests(tenantId);
  },

  listCapexBudgets(tenantId: string): FinanceCapexBudgetRow[] {
    return listCapexBudgetSnapshots(tenantId);
  },

  setCapexBudget(
    tenantId: string,
    session: SessionContext,
    payload: {
      department: string;
      totalBudget: number;
      notes?: string;
    },
  ): FinanceCapexBudgetRow {
    ensureTenant(tenantId, session);
    const snapshot = getCapexBudgetSnapshot(tenantId, payload.department);
    const targetBudget = Math.max(payload.totalBudget, 0);
    const delta = targetBudget - snapshot.allocatedBudget;

    if (delta !== 0) {
      createSystemJournalEntry(
        tenantId,
        payload.notes || `CAPEX budget set for ${snapshot.department}`,
        delta > 0
          ? [
              {
                accountCode: snapshot.accountCode,
                description: "CAPEX budget allocation increase",
                debit: delta,
                credit: 0,
              },
              {
                accountCode: "BUD-CONTROL",
                description: "Budget control balancing line",
                debit: 0,
                credit: delta,
              },
            ]
          : [
              {
                accountCode: "BUD-CONTROL",
                description: "Budget control balancing line",
                debit: Math.abs(delta),
                credit: 0,
              },
              {
                accountCode: snapshot.accountCode,
                description: "CAPEX budget allocation decrease",
                debit: 0,
                credit: Math.abs(delta),
              },
            ],
      );
    }

    const updated = getCapexBudgetSnapshot(tenantId, snapshot.department);
    audit.log({
      tenantId,
      actorId: session.userId,
      action: "finance.capex.budget.set",
      entityType: "capex_budget",
      entityId: snapshot.department,
      after: toAuditRecord(updated),
    });
    return updated;
  },

  async createCapexRequest(
    tenantId: string,
    session: SessionContext,
    input: AssetCapexInput,
  ): Promise<{ asset: Asset; capex: CapexRequest }> {
    ensureTenant(tenantId, session);
    const budget = getCapexBudgetSnapshot(tenantId, input.department);
    if (budget.allocatedBudget <= 0) {
      throw new Error(
        `No CAPEX budget ledger configured for ${budget.department}. Set a CAPEX budget first.`,
      );
    }
    if (budget.availableBudget < input.requestedAmount) {
      throw new Error(
        `CAPEX budget exceeded for ${budget.department}. Available: ${budget.availableBudget.toLocaleString()}.`,
      );
    }
    const timestamp = nowIso();
    const capex: CapexRequest = {
      id: createId("capex"),
      tenantId,
      assetDescription: input.assetDescription,
      requestedAmount: input.requestedAmount,
      department: input.department,
      projectCode: input.projectCode,
      requestedBy: session.userId,
      status: "PENDING_HOD_APPROVAL",
      approvedBy: [],
      requiredApprovals: ["HOD", "CFO"],
      currentApprovalStage: "HOD",
      budgetMatched: budget.availableBudget >= input.requestedAmount,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    repo.createCapexRequest(tenantId, capex);

    const asset = repo.createAsset(tenantId, {
      tenantId,
      description: input.assetDescription,
      assetClass: input.assetClass,
      location: input.location,
      department: input.department,
      acquisitionDate: input.acquisitionDate,
      acquisitionCost: input.requestedAmount,
      usefulLifeYears: input.usefulLifeYears,
      depreciationMethod: input.depreciationMethod,
      residualValue: input.residualValue,
      status: "PENDING_CAPEX_APPROVAL",
      capexRequestId: capex.id,
      capitalizationDate: undefined,
    });
    repo.updateCapexRequest(tenantId, capex.id, { assetId: asset.id });

    createFinanceWorkflow(tenantId, session, {
      entityType: "ASSET_REQUEST",
      entityId: capex.id,
      notes: `CAPEX request for ${input.assetDescription}`,
      metadata: { amount: String(input.requestedAmount), department: input.department },
    });
    audit.log({
      tenantId,
      actorId: session.userId,
      action: "finance.capex.create",
      entityType: "capex_request",
      entityId: capex.id,
      after: toAuditRecord(capex),
    });
    return { asset, capex };
  },

  async createAsset(
    tenantId: string,
    session: SessionContext,
    input: AssetCapexInput,
  ): Promise<Asset> {
    const { asset } = await this.createCapexRequest(tenantId, session, input);
    audit.log({
      tenantId,
      actorId: session.userId,
      action: "finance.asset.create",
      entityType: "asset",
      entityId: asset.id,
      after: toAuditRecord(asset),
    });
    return asset;
  },

  async approveCapexRequest(
    tenantId: string,
    session: SessionContext,
    requestId: string,
  ): Promise<CapexRequest | null> {
    ensureTenant(tenantId, session);
    const request = repo.listCapexRequests(tenantId).find((item) => item.id === requestId);
    if (!request) return null;
    if (request.status === "REJECTED" || request.status === "CAPITALIZED") {
      return request;
    }

    const approvedBy = Array.from(new Set([...request.approvedBy, session.role]));
    const isHodStage =
      request.status === "PENDING" ||
      request.status === "PENDING_HOD_APPROVAL" ||
      request.currentApprovalStage === "HOD";

    if (isHodStage) {
      if (!canApproveCapexAsHod(session, request)) {
        throw new Error(
          "HOD approval is restricted to the requesting department head.",
        );
      }
      const updated = repo.updateCapexRequest(tenantId, requestId, {
        status: "PENDING_CFO_APPROVAL",
        approvedBy,
        currentApprovalStage: "CFO",
        hodApprovedBy: session.userId,
        hodApprovedAt: nowIso(),
      });
      audit.log({
        tenantId,
        actorId: session.userId,
        action: "finance.capex.approve_hod",
        entityType: "capex_request",
        entityId: requestId,
        after: {
          status: "PENDING_CFO_APPROVAL",
          currentApprovalStage: "CFO",
          approvedBy,
        },
      });
      return updated;
    }

    if (!canApproveCapexAsCfo(session)) {
      throw new Error("CFO approval is restricted to Finance authority roles.");
    }
    const updated = repo.updateCapexRequest(tenantId, requestId, {
      status: "APPROVED",
      approvedBy,
      currentApprovalStage: undefined,
      cfoApprovedBy: session.userId,
      cfoApprovedAt: nowIso(),
    });
    if (request.assetId) {
      repo.updateAsset(tenantId, request.assetId, {
        status: "APPROVED_FOR_CAPITALIZATION",
      });
    }
    audit.log({
      tenantId,
      actorId: session.userId,
      action: "finance.capex.approve_cfo",
      entityType: "capex_request",
      entityId: requestId,
      after: { status: "APPROVED", approvedBy },
    });
    return updated;
  },

  async rejectCapexRequest(
    tenantId: string,
    session: SessionContext,
    requestId: string,
    notes?: string,
  ): Promise<CapexRequest | null> {
    ensureTenant(tenantId, session);
    const request = repo.listCapexRequests(tenantId).find((item) => item.id === requestId);
    if (!request) return null;
    const updated = repo.updateCapexRequest(tenantId, requestId, {
      status: "REJECTED",
      currentApprovalStage: undefined,
      notes,
    });
    if (request.assetId) {
      repo.updateAsset(tenantId, request.assetId, { status: "INACTIVE" });
    }
    audit.log({
      tenantId,
      actorId: session.userId,
      action: "finance.capex.reject",
      entityType: "capex_request",
      entityId: requestId,
      after: { status: "REJECTED", notes: notes ?? "" },
    });
    return updated;
  },

  async capitalizeAsset(
    tenantId: string,
    session: SessionContext,
    assetId: string,
    capitalizationDate: string,
  ): Promise<Asset | null> {
    ensureTenant(tenantId, session);
    const asset = repo.listAssets(tenantId).find((item) => item.id === assetId);
    if (!asset) return null;
    const capex = asset.capexRequestId
      ? repo.listCapexRequests(tenantId).find((item) => item.id === asset.capexRequestId)
      : undefined;
    if (!capex || capex.status !== "APPROVED") {
      throw new Error("Asset cannot be capitalized without approved CAPEX.");
    }

    const updated = repo.updateAsset(tenantId, assetId, {
      status: "ACTIVE",
      capitalizationDate,
      carryingValue: asset.acquisitionCost,
    });
    repo.updateCapexRequest(tenantId, capex.id, { status: "CAPITALIZED" });
    audit.log({
      tenantId,
      actorId: session.userId,
      action: "finance.asset.capitalize",
      entityType: "asset",
      entityId: assetId,
      after: { status: "ACTIVE", capitalizationDate },
    });
    return updated;
  },

  listAssetDepreciationEntries(tenantId: string, assetId?: string): AssetDepreciationEntry[] {
    const entries = repo.listAssetDepreciationEntries(tenantId);
    return assetId ? entries.filter((entry) => entry.assetId === assetId) : entries;
  },

  async postDepreciation(
    tenantId: string,
    session: SessionContext,
    params: {
      assetId: string;
      postingDate: string;
      method?: DepreciationMethod;
      unitsProduced?: number;
      cfoSignoff?: boolean;
    },
  ): Promise<AssetDepreciationEntry & { journalEntryId: string }> {
    ensureTenant(tenantId, session);
    const asset = repo.listAssets(tenantId).find((item) => item.id === params.assetId);
    if (!asset) throw new Error("Asset not found.");
    if (!asset.capitalizationDate) {
      throw new Error("Depreciation cannot be posted before capitalization.");
    }

    const method = params.method ?? asset.depreciationMethod;
    const amount = calculateDepreciationAmount(asset, method, params.unitsProduced ?? 0);
    if (amount <= 0) throw new Error("No depreciation amount generated for this asset.");
    if (hasMaterialDepreciationThreshold(tenantId, amount) && !params.cfoSignoff) {
      throw new Error("Material depreciation posting requires CFO signoff.");
    }

    const updatedAsset = repo.updateAsset(tenantId, asset.id, {
      accumulatedDepreciation: asset.accumulatedDepreciation + amount,
      carryingValue: Math.max(asset.carryingValue - amount, asset.residualValue),
    });
    if (!updatedAsset) throw new Error("Failed to update asset depreciation balances.");

    const months = monthsBetween(asset.capitalizationDate, params.postingDate);
    const entry: AssetDepreciationEntry = {
      id: createId("dep"),
      tenantId,
      assetId: asset.id,
      postingDate: params.postingDate,
      method,
      amount,
      annualizedAmount: amount * Math.min(months, 12),
      accumulatedDepreciation: updatedAsset.accumulatedDepreciation,
      carryingValue: updatedAsset.carryingValue,
      approvedBy: params.cfoSignoff ? "CFO" : undefined,
      createdAt: nowIso(),
    };
    repo.createAssetDepreciationEntry(tenantId, entry);
    const journal = createSystemJournalEntry(
      tenantId,
      `Depreciation posting for asset ${asset.id}`,
      [
        {
          accountCode: "EXP-DEPRECIATION",
          description: "Depreciation expense",
          debit: amount,
          credit: 0,
        },
        {
          accountCode: "BS-ACCUMULATED-DEPRECIATION",
          description: "Accumulated depreciation",
          debit: 0,
          credit: amount,
        },
      ],
    );

    audit.log({
      tenantId,
      actorId: session.userId,
      action: "finance.asset.depreciation.post",
      entityType: "asset",
      entityId: asset.id,
      after: { ...toAuditRecord(entry), journalEntryId: journal.id },
    });
    return { ...entry, journalEntryId: journal.id };
  },

  async runScheduledPeriodDepreciation(
    tenantId: string,
    session: SessionContext,
    params: {
      periodStart: string;
      periodEnd: string;
      postingDate?: string;
      cfoSignoff?: boolean;
    },
  ): Promise<ScheduledDepreciationRunResult> {
    ensureTenant(tenantId, session);
    const postingDate = params.postingDate ?? params.periodEnd;
    const runId = createId("deprun");
    const eligibleAssets = repo
      .listAssets(tenantId)
      .filter(
        (asset) =>
          asset.status === "ACTIVE" &&
          !!asset.capitalizationDate &&
          asset.capitalizationDate <= params.periodEnd,
      );
    const existing = repo.listAssetDepreciationEntries(tenantId);
    const postedEntries: string[] = [];
    const journalIds: string[] = [];
    const skipped: string[] = [];

    for (const asset of eligibleAssets) {
      const alreadyPosted = existing.some(
        (entry) =>
          entry.assetId === asset.id &&
          entry.postingDate.slice(0, 7) === postingDate.slice(0, 7),
      );
      if (alreadyPosted) {
        skipped.push(asset.id);
        continue;
      }
      try {
        const entry = await this.postDepreciation(tenantId, session, {
          assetId: asset.id,
          postingDate,
          cfoSignoff: params.cfoSignoff ?? true,
        });
        postedEntries.push(entry.id);
        journalIds.push(entry.journalEntryId);
      } catch {
        skipped.push(asset.id);
      }
    }

    audit.log({
      tenantId,
      actorId: session.userId,
      action: "finance.asset.depreciation.run_scheduled",
      entityType: "depreciation_run",
      entityId: runId,
      after: {
        periodStart: params.periodStart,
        periodEnd: params.periodEnd,
        postingDate,
        postedEntries: postedEntries.length,
        skipped: skipped.length,
      },
    });

    return {
      runId,
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
      postingDate,
      postedEntries: postedEntries.length,
      skippedAssetIds: skipped,
      journalEntryIds: journalIds,
    };
  },

  async recordAssetImpairment(
    tenantId: string,
    session: SessionContext,
    params: {
      assetId: string;
      impairmentAmount: number;
      reason: string;
      attachmentDocumentIds: string[];
    },
  ): Promise<AssetEvent> {
    ensureTenant(tenantId, session);
    const asset = repo.listAssets(tenantId).find((item) => item.id === params.assetId);
    if (!asset) throw new Error("Asset not found.");
    if (params.impairmentAmount <= 0) {
      throw new Error("Impairment amount must be greater than zero.");
    }
    if (params.impairmentAmount > asset.carryingValue) {
      throw new Error("Impairment amount cannot exceed carrying value.");
    }
    ensureMaterialEventCfoSignoff(tenantId, session, params.impairmentAmount, "impairment");
    ensureDocumentsExist(tenantId, params.attachmentDocumentIds);

    const updated = repo.updateAsset(tenantId, asset.id, {
      status: "IMPAIRED",
      carryingValue: Math.max(asset.carryingValue - params.impairmentAmount, 0),
    });
    if (!updated) throw new Error("Failed to apply impairment.");
    const journal = createSystemJournalEntry(
      tenantId,
      `Impairment recognition for asset ${asset.id}`,
      [
        {
          accountCode: "EXP-IMPAIRMENT-LOSS",
          description: "Impairment loss",
          debit: params.impairmentAmount,
          credit: 0,
        },
        {
          accountCode: "BS-ASSET-IMPAIRMENT-RESERVE",
          description: "Asset impairment reserve",
          debit: 0,
          credit: params.impairmentAmount,
        },
      ],
    );

    const event: AssetEvent = {
      type: "IMPAIRMENT",
      id: createId("imp"),
      tenantId,
      assetId: asset.id,
      impairmentAmount: params.impairmentAmount,
      reason: params.reason,
      attachmentDocumentIds: params.attachmentDocumentIds,
      journalEntryId: journal.id,
      approvedBy: "CFO",
      createdAt: nowIso(),
    };
    repo.createAssetEvent(tenantId, event);
    audit.log({
      tenantId,
      actorId: session.userId,
      action: "finance.asset.impairment",
      entityType: "asset",
      entityId: asset.id,
      after: toAuditRecord(event),
    });
    return event;
  },

  async recordAssetRevaluation(
    tenantId: string,
    session: SessionContext,
    params: {
      assetId: string;
      revaluedAmount: number;
      reason: string;
      attachmentDocumentIds: string[];
    },
  ): Promise<AssetEvent> {
    ensureTenant(tenantId, session);
    const asset = repo.listAssets(tenantId).find((item) => item.id === params.assetId);
    if (!asset) throw new Error("Asset not found.");
    if (params.revaluedAmount < 0) {
      throw new Error("Revalued amount cannot be negative.");
    }
    ensureMaterialEventCfoSignoff(
      tenantId,
      session,
      params.revaluedAmount - asset.carryingValue,
      "revaluation",
    );
    ensureDocumentsExist(tenantId, params.attachmentDocumentIds);
    const reserveChange = params.revaluedAmount - asset.carryingValue;
    const updated = repo.updateAsset(tenantId, asset.id, {
      carryingValue: params.revaluedAmount,
      revaluationReserve: asset.revaluationReserve + reserveChange,
    });
    if (!updated) throw new Error("Failed to apply revaluation.");
    const journal = reserveChange >= 0
      ? createSystemJournalEntry(
          tenantId,
          `Revaluation increase for asset ${asset.id}`,
          [
            {
              accountCode: "BS-FIXED-ASSET",
              description: "Asset carrying value increase",
              debit: reserveChange,
              credit: 0,
            },
            {
              accountCode: "EQ-REVALUATION-RESERVE",
              description: "Revaluation reserve",
              debit: 0,
              credit: reserveChange,
            },
          ],
        )
      : createSystemJournalEntry(
          tenantId,
          `Revaluation decrease for asset ${asset.id}`,
          [
            {
              accountCode: "EXP-REVALUATION-LOSS",
              description: "Revaluation loss",
              debit: Math.abs(reserveChange),
              credit: 0,
            },
            {
              accountCode: "BS-FIXED-ASSET",
              description: "Asset carrying value decrease",
              debit: 0,
              credit: Math.abs(reserveChange),
            },
          ],
        );

    const event: AssetRevaluationEvent = {
      id: createId("rev"),
      tenantId,
      assetId: asset.id,
      revaluedAmount: params.revaluedAmount,
      reason: params.reason,
      attachmentDocumentIds: params.attachmentDocumentIds,
      journalEntryId: journal.id,
      approvedBy: "CFO",
      createdAt: nowIso(),
    };
    const typedEvent: AssetEvent = { type: "REVALUATION", ...event };
    repo.createAssetEvent(tenantId, typedEvent);
    audit.log({
      tenantId,
      actorId: session.userId,
      action: "finance.asset.revaluation",
      entityType: "asset",
      entityId: asset.id,
      after: toAuditRecord(typedEvent),
    });
    return typedEvent;
  },

  async disposeAsset(
    tenantId: string,
    session: SessionContext,
    params: {
      assetId: string;
      disposalType: DisposalType;
      proceeds: number;
      attachmentDocumentIds: string[];
    },
  ): Promise<AssetEvent> {
    ensureTenant(tenantId, session);
    const asset = repo.listAssets(tenantId).find((item) => item.id === params.assetId);
    if (!asset) throw new Error("Asset not found.");
    if (params.proceeds < 0) {
      throw new Error("Disposal proceeds cannot be negative.");
    }
    ensureMaterialEventCfoSignoff(tenantId, session, asset.carryingValue, "disposal");
    ensureDocumentsExist(tenantId, params.attachmentDocumentIds);
    const gainLoss = params.proceeds - asset.carryingValue;
    const updated = repo.updateAsset(tenantId, asset.id, {
      status: "DISPOSED",
      carryingValue: 0,
    });
    if (!updated) throw new Error("Failed to dispose asset.");
    const journalLines: JournalEntry["lines"] = [
      {
        accountCode: "BS-CASH",
        description: "Disposal proceeds",
        debit: params.proceeds,
        credit: 0,
      },
      {
        accountCode: "BS-FIXED-ASSET",
        description: "Remove carrying value",
        debit: 0,
        credit: asset.carryingValue,
      },
    ];
    if (gainLoss > 0) {
      journalLines.push({
        accountCode: "INC-DISPOSAL-GAIN",
        description: "Gain on disposal",
        debit: 0,
        credit: gainLoss,
      });
    } else if (gainLoss < 0) {
      journalLines.push({
        accountCode: "EXP-DISPOSAL-LOSS",
        description: "Loss on disposal",
        debit: Math.abs(gainLoss),
        credit: 0,
      });
    }
    const journal = createSystemJournalEntry(
      tenantId,
      `Disposal of asset ${asset.id}`,
      journalLines,
    );

    const event: AssetDisposalEvent = {
      id: createId("disp"),
      tenantId,
      assetId: asset.id,
      disposalType: params.disposalType,
      proceeds: params.proceeds,
      gainLoss,
      attachmentDocumentIds: params.attachmentDocumentIds,
      journalEntryId: journal.id,
      approvedBy: "CFO",
      createdAt: nowIso(),
    };
    const typedEvent: AssetEvent = { type: "DISPOSAL", ...event };
    repo.createAssetEvent(tenantId, typedEvent);
    audit.log({
      tenantId,
      actorId: session.userId,
      action: "finance.asset.disposal",
      entityType: "asset",
      entityId: asset.id,
      after: toAuditRecord(typedEvent),
    });
    return typedEvent;
  },

  listAssetEvents(tenantId: string, assetId?: string): AssetEvent[] {
    const events = repo.listAssetEvents(tenantId);
    return assetId ? events.filter((event) => event.assetId === assetId) : events;
  },

  generateAssetAuditPack(tenantId: string, assetId: string): AssetAuditPack {
    const asset = repo.listAssets(tenantId).find((item) => item.id === assetId);
    if (!asset) throw new Error("Asset not found.");
    const capex = asset.capexRequestId
      ? repo.listCapexRequests(tenantId).find((request) => request.id === asset.capexRequestId)
      : undefined;
    const depreciationEntries = this.listAssetDepreciationEntries(tenantId, assetId);
    const events = this.listAssetEvents(tenantId, assetId);
    const evidence = [
      capex ? `CAPEX:${capex.id}:${capex.status}` : "CAPEX:none",
      ...depreciationEntries.map((entry) => `DEPR:${entry.id}:${entry.postingDate}:${entry.amount}`),
      ...events.map((event) => `EVENT:${event.type}:${event.id}`),
    ];
    const generatedAt = nowIso();
    const checksum = buildChecksum(
      JSON.stringify({ assetId, capex, depreciationEntries, events, evidence }),
    );
    const canonicalPayload = JSON.stringify({
      assetId,
      tenantId,
      generatedAt,
      capexRequest: capex,
      depreciationEntries,
      events,
      evidence,
      checksum,
    });
    const signature = signAuditPackPayload(tenantId, canonicalPayload);
    return {
      assetId,
      tenantId,
      generatedAt,
      capexRequest: capex,
      depreciationEntries,
      events,
      evidence,
      checksum,
      signature,
      signatureVersion: "v1",
    };
  },

  downloadAssetAuditPack(
    tenantId: string,
    assetId: string,
    format: "JSON" | "PDF",
  ): AssetAuditPackArtifact {
    const pack = this.generateAssetAuditPack(tenantId, assetId);
    if (format === "JSON") {
      return {
        filename: `asset-audit-pack-${assetId}.json`,
        mimeType: "application/json",
        data: JSON.stringify(pack, null, 2),
      };
    }

    const lines = [
      "ZENVIX ASSET AUDIT PACK",
      `Asset: ${pack.assetId}`,
      `Tenant: ${pack.tenantId}`,
      `Generated: ${pack.generatedAt}`,
      `Checksum: ${pack.checksum}`,
      `Signature: ${pack.signature}`,
      "",
      `CAPEX: ${pack.capexRequest ? `${pack.capexRequest.id} (${pack.capexRequest.status})` : "none"}`,
      `Depreciation Entries: ${pack.depreciationEntries.length}`,
      `Events: ${pack.events.length}`,
      "Evidence:",
      ...pack.evidence,
    ];
    return {
      filename: `asset-audit-pack-${assetId}.pdf`,
      mimeType: "application/pdf",
      data: buildSimplePdf(lines),
    };
  },

  verifyAssetAuditPack(tenantId: string, pack: AssetAuditPack): boolean {
    if (pack.tenantId !== tenantId) return false;
    if (pack.signatureVersion !== "v1") return false;
    const canonicalPayload = JSON.stringify({
      assetId: pack.assetId,
      tenantId: pack.tenantId,
      generatedAt: pack.generatedAt,
      capexRequest: pack.capexRequest,
      depreciationEntries: pack.depreciationEntries,
      events: pack.events,
      evidence: pack.evidence,
      checksum: pack.checksum,
    });
    const expectedSignature = signAuditPackPayload(tenantId, canonicalPayload);
    return expectedSignature === pack.signature;
  },

  async updateAssetStatus(
    tenantId: string,
    session: SessionContext,
    id: string,
    status: Asset["status"],
  ): Promise<Asset | null> {
    ensureTenant(tenantId, session);
    const updated = repo.updateAsset(tenantId, id, { status });
    if (!updated) return null;
    audit.log({
      tenantId,
      actorId: session.userId,
      action: "finance.asset.update_status",
      entityType: "asset",
      entityId: id,
      after: { status },
    });
    return updated;
  },

  listReceivables(tenantId: string): FinanceReceivableRow[] {
    return repo.listReceivables(tenantId).map((item) => ({
      id: item.id,
      customer: item.customerName,
      invoiceId: item.id,
      amount: item.amount,
      dueDate: item.dueDate,
      status: mapInvoiceStatus(item.status, item.dueDate),
    }));
  },

  createReceivable(
    tenantId: string,
    session: SessionContext,
    payload: {
      customer: string;
      amount: number;
      dueDate: string;
      invoiceDate?: string;
      currency?: "IDR" | "USD";
    },
  ): ReceivableInvoice {
    ensureTenant(tenantId, session);
    const now = nowIso();
    const receivable: ReceivableInvoice = {
      id: `inv-${Date.now()}`,
      tenantId,
      customerName: payload.customer,
      amount: payload.amount,
      currency: payload.currency ?? "IDR",
      dueDate: payload.dueDate,
      status: "pending",
      agingBucket: "0-30",
      createdAt: payload.invoiceDate || now,
      updatedAt: now,
    };
    repo.createReceivable(tenantId, receivable);
    createFinanceWorkflow(tenantId, session, {
      entityType: "PAYMENT",
      entityId: receivable.id,
      notes: `Receivable invoice for ${payload.customer}`,
    });
    audit.log({
      tenantId,
      actorId: session.userId,
      action: "finance.receivable.create",
      entityType: "receivable",
      entityId: receivable.id,
      after: toAuditRecord(receivable),
    });
    return receivable;
  },

  sendReceivableReminder(
    tenantId: string,
    session: SessionContext,
    id: string,
  ) {
    ensureTenant(tenantId, session);
    audit.log({
      tenantId,
      actorId: session.userId,
      action: "finance.receivable.reminder",
      entityType: "receivable",
      entityId: id,
      after: { reminderSentAt: nowIso() },
    });
  },

  markReceived(tenantId: string, id: string) {
    repo.updateReceivable(tenantId, id, { status: "paid" });
    audit.log({
      tenantId,
      actorId: "system",
      action: "finance.receivable.received",
      entityType: "receivable",
      entityId: id,
      after: { status: "paid" },
    });
  },

  listPayables(tenantId: string): FinancePayableRow[] {
    return repo.listPayables(tenantId).map((item) => ({
      id: item.id,
      vendor: item.vendorName,
      invoiceId: item.id,
      amount: item.amount,
      dueDate: item.dueDate,
      status: mapPayableStatus(item.status, item.dueDate),
    }));
  },

  createPayable(
    tenantId: string,
    session: SessionContext,
    payload: {
      vendor: string;
      amount: number;
      dueDate: string;
      currency?: "IDR" | "USD";
    },
  ): PayableBill {
    ensureTenant(tenantId, session);
    const now = nowIso();
    const payable: PayableBill = {
      id: `bill-${Date.now()}`,
      tenantId,
      vendorName: payload.vendor,
      amount: payload.amount,
      currency: payload.currency ?? "IDR",
      dueDate: payload.dueDate,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    };
    repo.createPayable(tenantId, payable);
    createFinanceWorkflow(tenantId, session, {
      entityType: "PURCHASE",
      entityId: payable.id,
      notes: `Vendor payable for ${payload.vendor}`,
    });
    audit.log({
      tenantId,
      actorId: session.userId,
      action: "finance.payable.create",
      entityType: "payable",
      entityId: payable.id,
      after: toAuditRecord(payable),
    });
    return payable;
  },

  approvePayable(
    tenantId: string,
    session: SessionContext,
    id: string,
  ): PayableBill | null {
    ensureTenant(tenantId, session);
    const updated = repo.updatePayable(tenantId, id, { status: "approved" });
    if (!updated) return null;
    audit.log({
      tenantId,
      actorId: session.userId,
      action: "finance.payable.approve",
      entityType: "payable",
      entityId: id,
      after: { status: "approved" },
    });
    return updated;
  },

  markPaid(tenantId: string, id: string) {
    repo.updatePayable(tenantId, id, { status: "paid" });
    audit.log({
      tenantId,
      actorId: "system",
      action: "finance.payable.paid",
      entityType: "payable",
      entityId: id,
      after: { status: "paid" },
    });
  },

  listInvoices(tenantId: string): FinanceInvoiceRow[] {
    const receivableRows: FinanceInvoiceRow[] = repo.listReceivables(tenantId).map((item) => ({
      id: item.id,
      kind: "RECEIVABLE",
      vendor: item.customerName,
      amount: item.amount,
      invoiceDate: item.createdAt.slice(0, 10),
      dueDate: item.dueDate,
      status: mapInvoiceStatus(item.status, item.dueDate),
    }));

    const payableRows: FinanceInvoiceRow[] = repo.listPayables(tenantId).map((item) => ({
      id: item.id,
      kind: "PAYABLE",
      vendor: item.vendorName,
      amount: item.amount,
      invoiceDate: item.createdAt.slice(0, 10),
      dueDate: item.dueDate,
      status: mapPayableStatus(item.status, item.dueDate),
    }));

    return [...payableRows, ...receivableRows].sort((a, b) =>
      b.invoiceDate.localeCompare(a.invoiceDate),
    );
  },

  captureInvoice(
    tenantId: string,
    payload: {
      vendor: string;
      amount: number;
      invoiceDate: string;
      dueDate: string;
      file?: File | null;
    },
  ): ReceivableInvoice {
    const now = nowIso();
    const invoice: ReceivableInvoice = {
      id: `inv-${Date.now()}`,
      tenantId,
      customerName: payload.vendor,
      amount: payload.amount,
      currency: "IDR",
      dueDate: payload.dueDate,
      status: "pending",
      agingBucket: "0-30",
      createdAt: payload.invoiceDate || now,
      updatedAt: now,
    };
    repo.createReceivable(tenantId, invoice);
    audit.log({
      tenantId,
      actorId: "system",
      action: "finance.invoice.capture",
      entityType: "receivable",
      entityId: invoice.id,
      after: toAuditRecord(invoice),
    });
    return invoice;
  },

  capturePayableInvoice(
    tenantId: string,
    session: SessionContext,
    payload: {
      vendor: string;
      amount: number;
      invoiceDate: string;
      dueDate: string;
      file?: File | null;
    },
  ): PayableBill {
    ensureTenant(tenantId, session);
    const created = this.createPayable(tenantId, session, {
      vendor: payload.vendor,
      amount: payload.amount,
      dueDate: payload.dueDate,
      currency: "IDR",
    });
    audit.log({
      tenantId,
      actorId: session.userId,
      action: "finance.invoice.capture_payable",
      entityType: "payable",
      entityId: created.id,
      after: {
        vendor: payload.vendor,
        amount: payload.amount,
        invoiceDate: payload.invoiceDate,
      },
    });
    return created;
  },

  listJournals(tenantId: string): FinanceJournalRow[] {
    return repo.listJournalEntries(tenantId).map((item) => ({
      id: item.id,
      account: item.lines[0]?.accountCode ?? "Unmapped",
      type: item.lines[0]?.debit && item.lines[0].debit > 0 ? "DEBIT" : "CREDIT",
      amount: item.lines[0]
        ? item.lines[0].debit > 0
          ? item.lines[0].debit
          : item.lines[0].credit
        : 0,
      description: item.description,
      status: item.status.toUpperCase() as FinanceJournalRow["status"],
    }));
  },

  createJournal(
    tenantId: string,
    entry: {
      account: string;
      type: "DEBIT" | "CREDIT";
      amount: number;
      description: string;
    },
  ): JournalEntry {
    const now = nowIso();
    const journal: JournalEntry = {
      id: `jr-${Date.now()}`,
      tenantId,
      description: entry.description,
      lines: [
        {
          accountCode: entry.account,
          description: entry.description,
          debit: entry.type === "DEBIT" ? entry.amount : 0,
          credit: entry.type === "CREDIT" ? entry.amount : 0,
        },
      ],
      status: "draft",
      createdAt: now,
      updatedAt: now,
    };
    repo.createJournalEntry(tenantId, journal);
    audit.log({
      tenantId,
      actorId: "system",
      action: "finance.journal.create",
      entityType: "journal",
      entityId: journal.id,
      after: toAuditRecord(journal),
    });
    return journal;
  },

  listPayments(tenantId: string): FinancePaymentRow[] {
    return paymentService.listTransactions(tenantId).map((item) => ({
      id: item.id,
      destination: item.destination,
      method: channelToFinanceMethod(item.channel),
      amount: item.amount,
      purpose: item.type,
      approvalLevel: item.approvedBy ? 2 : 1,
      status:
        item.status === "REJECTED" || item.status === "CANCELLED"
          ? "REJECTED"
          : item.status === "FAILED"
            ? "FAILED"
            : item.status === "SETTLED"
              ? "APPROVED"
              : item.status === "APPROVAL_PENDING" || item.status === "REQUEST_CREATED"
                ? "PENDING"
                : "APPROVED",
    }));
  },

  createPayment(
    tenantId: string,
    payload: {
      destination: string;
      amount: number;
      method: string;
      purpose: string;
      scheduledDate?: string;
      recurring?: boolean;
    },
  ) {
    const session = createPaymentSystemSession(tenantId);
    const payment = paymentService.createFinancePaymentRequest(tenantId, session, {
      destination: payload.destination,
      amount: payload.amount,
      method: toPaymentMethod(payload.method),
      purpose: payload.purpose,
      externalReference: payload.scheduledDate
        ? `scheduled:${payload.scheduledDate}`
        : undefined,
    });
    audit.log({
      tenantId,
      actorId: "system",
      action: "finance.payment.create",
      entityType: "payment",
      entityId: payment.id,
      after: {
        ...toAuditRecord(payment),
        scheduledDate: payload.scheduledDate,
        recurring: payload.recurring ?? false,
      },
    });
    return {
      id: payment.id,
      tenantId,
      amount: payment.amount,
      currency: payment.currency,
      method: channelToFinanceMethod(payment.channel),
      destination: payment.destination,
      purpose: payload.purpose,
      status: "pending",
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    } as PaymentRequest;
  },

  updatePaymentStatus(
    tenantId: string,
    id: string,
    status: "APPROVED" | "REJECTED",
  ) {
    const session = createPaymentSystemSession(tenantId);
    paymentService.processFinanceApproval(tenantId, session, id, status === "APPROVED");
    audit.log({
      tenantId,
      actorId: "system",
      action: "finance.payment.update",
      entityType: "payment",
      entityId: id,
      after: { status: status === "APPROVED" ? "approved" : "rejected" },
    });
  },

  listDocuments(tenantId: string): FinanceDocumentRow[] {
    return ensureDocs(tenantId);
  },

  uploadDocument(
    tenantId: string,
    payload: {
      title: string;
      type: string;
      description: string;
      file?: File | null;
    },
  ): FinanceDocumentRow {
    const docs = ensureDocs(tenantId);
    const created: FinanceDocumentRow = {
      id: `doc-${Date.now()}`,
      title: payload.title,
      type: payload.type,
      description: payload.description,
      status: "PENDING",
      uploadedAt: nowIso(),
      uploadedBy: "system",
    };
    docsStore.set(tenantId, [created, ...docs]);
    audit.log({
      tenantId,
      actorId: "system",
      action: "finance.document.upload",
      entityType: "finance_doc",
      entityId: created.id,
      after: toAuditRecord(created),
    });
    return created;
  },

  uploadDocumentForApproval(
    tenantId: string,
    session: SessionContext,
    payload: {
      title: string;
      type: string;
      description: string;
      file?: File | null;
    },
  ): FinanceDocumentRow {
    ensureTenant(tenantId, session);
    const created = this.uploadDocument(tenantId, payload);
    const flow = createFinanceWorkflow(tenantId, session, {
      entityType: "PURCHASE",
      entityId: created.id,
      notes: `Finance document approval: ${created.title}`,
    });
    audit.log({
      tenantId,
      actorId: session.userId,
      action: "finance.document.route",
      entityType: "finance_doc",
      entityId: created.id,
      after: { workflowId: flow.id },
    });
    return created;
  },

  updateDocumentStatus(
    tenantId: string,
    id: string,
    status: FinanceDocumentStatus,
  ) {
    const docs = ensureDocs(tenantId).map((doc) =>
      doc.id === id ? { ...doc, status } : doc,
    );
    docsStore.set(tenantId, docs);
    audit.log({
      tenantId,
      actorId: "system",
      action: "finance.document.update_status",
      entityType: "finance_doc",
      entityId: id,
      after: { status },
    });
  },

  listPolicies(tenantId: string): FinancePolicyRow[] {
    return ensurePolicies(tenantId);
  },

  createPolicy(
    tenantId: string,
    policy: {
      title: string;
      type: string;
      description: string;
      threshold: number;
    },
  ): FinancePolicyRow {
    const policies = ensurePolicies(tenantId);
    const created: FinancePolicyRow = {
      id: `pol-${Date.now()}`,
      title: policy.title,
      type:
        policy.type === "PAYMENT_RULE" || policy.type === "EXPENSE_POLICY"
          ? policy.type
          : "APPROVAL_LIMIT",
      description: policy.description,
      threshold: policy.threshold,
      active: true,
    };
    policiesStore.set(tenantId, [created, ...policies]);
    audit.log({
      tenantId,
      actorId: "system",
      action: "finance.policy.create",
      entityType: "policy",
      entityId: created.id,
      after: toAuditRecord(created),
    });
    return created;
  },

  togglePolicy(tenantId: string, id: string) {
    const policies = ensurePolicies(tenantId).map((policy) =>
      policy.id === id ? { ...policy, active: !policy.active } : policy,
    );
    policiesStore.set(tenantId, policies);
    const updated = policies.find((policy) => policy.id === id);
    audit.log({
      tenantId,
      actorId: "system",
      action: "finance.policy.toggle",
      entityType: "policy",
      entityId: id,
      after: { active: updated?.active ?? false },
    });
  },

  getFinanceInsights(tenantId: string): FinanceInsight[] {
    const payments = this.listPayments(tenantId);
    const receivables = this.listReceivables(tenantId);
    const payables = this.listPayables(tenantId);
    const periods = ensurePeriods(tenantId);
    const assets = repo.listAssets(tenantId);
    const capexRequests = repo.listCapexRequests(tenantId);

    const approvedPayments = payments.filter((payment) => payment.status === "APPROVED").length;
    const totalActionedPayments = payments.filter(
      (payment) => payment.status === "APPROVED" || payment.status === "REJECTED",
    ).length;
    const paymentSuccessRate = totalActionedPayments
      ? `${((approvedPayments / totalActionedPayments) * 100).toFixed(1)}%`
      : "0%";

    const overdueReceivables = receivables.filter(
      (receivable) => receivable.status === "OVERDUE",
    ).length;
    const pendingCapex = capexRequests.filter(
      (request) =>
        request.status === "PENDING" ||
        request.status === "PENDING_HOD_APPROVAL" ||
        request.status === "PENDING_CFO_APPROVAL",
    ).length;
    const activeAssets = assets.filter((asset) => asset.status === "ACTIVE").length;
    const closedPeriods = periods.filter((period) => period.status === "CLOSED").length;
    const periodReadiness = `${Math.round((closedPeriods / periods.length) * 100)}%`;

    return [
      {
        id: `${tenantId}-ins-1`,
        title: "Payment success rate",
        category: "PAYMENTS",
        value: paymentSuccessRate,
      },
      {
        id: `${tenantId}-ins-2`,
        title: "Overdue receivables",
        category: "CASHFLOW",
        value: `${overdueReceivables} invoices`,
      },
      {
        id: `${tenantId}-ins-3`,
        title: "Pending CAPEX approvals",
        category: "APPROVALS",
        value: `${pendingCapex} requests`,
      },
      {
        id: `${tenantId}-ins-4`,
        title: "Active fixed assets",
        category: "PERIODS",
        value: `${activeAssets} assets`,
      },
      {
        id: `${tenantId}-ins-5`,
        title: "Period close readiness",
        category: "PERIODS",
        value: periodReadiness,
      },
    ];
  },

  listPeriods(tenantId: string): AccountingPeriod[] {
    return ensurePeriods(tenantId);
  },

  lockPeriod(tenantId: string, periodId: string) {
    const updated = updatePeriod(tenantId, periodId, {
      status: "CLOSING",
      lockedBy: "FinanceOps",
      approvalLevel: 1,
    });
    audit.log({
      tenantId,
      actorId: "system",
      action: "finance.period.lock",
      entityType: "period",
      entityId: periodId,
      after: { status: updated?.status ?? "CLOSING" },
    });
  },

  approvePeriodClose(tenantId: string, periodId: string) {
    const updated = updatePeriod(tenantId, periodId, {
      status: "CLOSED",
      approvalLevel: 0,
    });
    audit.log({
      tenantId,
      actorId: "system",
      action: "finance.period.approve_close",
      entityType: "period",
      entityId: periodId,
      after: { status: updated?.status ?? "CLOSED" },
    });
  },

  markPeriodFailed(tenantId: string, periodId: string) {
    const updated = updatePeriod(tenantId, periodId, {
      status: "FAILED",
      approvalLevel: 2,
    });
    audit.log({
      tenantId,
      actorId: "system",
      action: "finance.period.failed",
      entityType: "period",
      entityId: periodId,
      after: { status: updated?.status ?? "FAILED" },
    });
  },

  reopenPeriod(tenantId: string, periodId: string) {
    const updated = updatePeriod(tenantId, periodId, {
      status: "OPEN",
      lockedBy: undefined,
      approvalLevel: 0,
    });
    audit.log({
      tenantId,
      actorId: "system",
      action: "finance.period.reopen",
      entityType: "period",
      entityId: periodId,
      after: { status: updated?.status ?? "OPEN" },
    });
  },

  forceClosePeriod(tenantId: string, periodId: string) {
    const updated = updatePeriod(tenantId, periodId, {
      status: "CLOSED",
      approvalLevel: 0,
    });
    audit.log({
      tenantId,
      actorId: "system",
      action: "finance.period.force_close",
      entityType: "period",
      entityId: periodId,
      after: { status: updated?.status ?? "CLOSED" },
    });
  },
};
