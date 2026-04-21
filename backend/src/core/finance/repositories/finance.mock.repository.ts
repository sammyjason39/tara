import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { IFinanceRepository } from "./finance.repository.interface";
import { LedgerEntry } from "../entities/ledger-entry.entity";
import { Transaction } from "../entities/transaction.entity";
import { Balance } from "../entities/balance.entity";
import { CreateTransactionDto } from "../dto/create-transaction.dto";
import {
  Asset,
  CapexRequest,
  FinanceCapexBudgetRow,
  AssetDepreciationEntry,
  AssetEvent,
  AssetAuditPack,
  FinanceReceivableRow,
  ReceivableInvoice,
  FinancePayableRow,
  PayableBill,
  FinancePaymentRow,
  PaymentRequest,
  FinanceDocumentRow,
  FinancePolicyRow,
  AccountingPeriod,
  FinanceInsight,
  FinanceAlert,
  PayrollEntry,
  PayrollEstimate,
  FinanceMoneySourceRow,
  TreasuryTransfer,
  BankTransaction,
  PerformanceTreeNode,
} from "../finance.types";

@Injectable()
export class FinanceMockRepository extends IFinanceRepository {
  private ledgerEntries: LedgerEntry[] = [];
  private transactions: Transaction[] = [];
  private assets: Asset[] = [];
  private capexRequests: CapexRequest[] = [];
  private capexBudgets: FinanceCapexBudgetRow[] = [];
  private depreciationEntries: AssetDepreciationEntry[] = [];
  private assetEvents: AssetEvent[] = [];
  private receivables: FinanceReceivableRow[] = []; // View model
  private receivableInvoices: ReceivableInvoice[] = []; // Entity
  private payables: FinancePayableRow[] = []; // View model
  private payableBills: PayableBill[] = []; // Entity
  private payments: PaymentRequest[] = [];
  private documents: FinanceDocumentRow[] = [];
  private policies: FinancePolicyRow[] = [];
  private periods: AccountingPeriod[] = [];
  private alerts: FinanceAlert[] = [];
  private payroll: PayrollEntry[] = [];
  private transfers: TreasuryTransfer[] = [];
  private compensations: any[] = [];
  private employees: any[] = [];
  private moneySources: FinanceMoneySourceRow[] = [
    {
      id: "ms-1",
      name: "Main Operating Account",
      type: "BANK_ACCOUNT",
      currency: "USD",
      balance: new Prisma.Decimal(150000),
    },
    {
      id: "ms-2",
      name: "Payroll Account",
      type: "BANK_ACCOUNT",
      currency: "USD",
      balance: new Prisma.Decimal(50000),
    },
  ];

  constructor() {
    super();
    this.initializeMockData();
  }

  private initializeMockData() {
    // Basic mock initialization for core ledgers
    this.createMockLedgerEntries("tenant-001", "location-001", [
      {
        amount: new Prisma.Decimal(50000),
        type: "credit",
        description: "Initial Capital",
        category: "Equity",
      },
    ]);

    // Add mock employees and compensations
    this.employees.push({
      id: "emp-1",
      tenant_id: "tenant-001",
      first_name: "John",
      last_name: "Doe",
      status: "active",
      department: { name: "Engineering" }
    });

    this.compensations.push({
      employee_id: "emp-1",
      baseSalary: 10000,
      allowances: [{ name: "Housing", amount: 2000 }],
      bonuses: [{ name: "Performance", amount: 1000 }]
    });
  }

  private createMockLedgerEntries(
    tenant_id: string,
    location_id: string,
    entries: any[],
  ) {
    // Simplified for brevity, reusing logic from previous implementation if needed
    // but keeping it minimal to avoid huge file
    const baseDate = new Date();
    entries.forEach((e, i) => {
      this.ledgerEntries.push({
        id: `${tenant_id}-leg-${i}`,
        tenant_id,
        location_id,
        amount: new Prisma.Decimal(e.amount),
        type: e.type,
        description: e.description,
        category: e.category,
        timestamp: baseDate,
        effectiveDate: baseDate,
        balance: new Prisma.Decimal(0),
        referenceId: `ref-${i}`,
      } as LedgerEntry);
    });
  }

  // --- Implementation ---

  async getLedger(
    tenant_id: string,
    location_id?: string,
  ): Promise<LedgerEntry[]> {
    return this.ledgerEntries.filter(
      (e) =>
        e.tenant_id === tenant_id && (!location_id || e.location_id === location_id),
    );
  }

  async createTransaction(
    tenant_id: string,
    data: CreateTransactionDto,
    tx?: Prisma.TransactionClient,
  ): Promise<Transaction> {
    const txn: Transaction = {
      id: `${tenant_id}-txn-${Date.now()}`,
      tenant_id,
      location_id: data.location_id ?? "default",
      amount: new Prisma.Decimal(data.amount),
      type: data.type,
      description: data.description,
      category: data.category,
      created_at: new Date(),
      status: "approved",
      createdBy: "system",
    };
    this.transactions.push(txn);
    return txn;
  }

  async createJournal(tenant_id: string, data: any, tx?: Prisma.TransactionClient): Promise<any> {
    const journal = {
      id: `${tenant_id}-jr-${Date.now()}`,
      tenant_id,
      description: data.description,
      ref: data.ref,
      status: "POSTED",
      created_at: new Date(),
      lines: data.lines.map((l: any, i: number) => ({
        id: `line-${i}`,
        ...l,
      })),
    };
    return journal;
  }

  async getBalance(tenant_id: string): Promise<Balance> {
    return {
      tenant_id,
      totalBalance: new Prisma.Decimal(100000), // Mock fixed balance
      currency: "USD",
      lastUpdated: new Date(),
      totalDebits: new Prisma.Decimal(5000),
      totalCredits: new Prisma.Decimal(105000),
      transactionCount: 10,
    };
  }

  async getTransactionById(
    tenant_id: string,
    transaction_id: string,
  ): Promise<Transaction | null> {
    return (
      this.transactions.find(
        (t) => t.tenant_id === tenant_id && t.id === transaction_id,
      ) || null
    );
  }

  // Money Sources
  async listMoneySources(tenant_id: string): Promise<FinanceMoneySourceRow[]> {
    return this.moneySources;
  }

  // Treasury
  async listTransfers(tenant_id: string): Promise<TreasuryTransfer[]> {
    return this.transfers.filter((t: any) => t.tenant_id === tenant_id);
  }

  async createTransfer(
    tenant_id: string,
    data: Partial<TreasuryTransfer>,
    tx?: Prisma.TransactionClient,
  ): Promise<TreasuryTransfer> {
    const transfer: TreasuryTransfer = {
      id: `TR-${Date.now()}`,
      tenant_id,
      fromSourceId: data.fromSourceId!,
      toSourceId: data.toSourceId!,
      amount: data.amount!,
      currency: data.currency || "IDR",
      status: data.status || "PENDING",
      requested_by: data.requested_by || "system",
      created_at: new Date(),
      updated_at: new Date(),
    };
    this.transfers.push(transfer);
    return transfer;
  }

  async reconcileSettlement(
    tenant_id: string,
    sourceId: string,
    amount: number,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const source = this.moneySources.find((s) => s.id === sourceId);
    if (source) {
      source.balance = source.balance.plus(amount);
      if (source.pendingSettlement) {
        source.pendingSettlement = Prisma.Decimal.max(
          0,
          source.pendingSettlement.minus(amount),
        );
      }
    }
  }

  // Assets
  async listAssets(tenant_id: string): Promise<Asset[]> {
    return this.assets; // No tenant filter for simplicity in mock, or add filtering
  }

  async getAssetById(tenant_id: string, assetId: string): Promise<Asset | null> {
    return this.assets.find((a) => a.tenant_id === tenant_id && a.id === assetId) || null;
  }

  async createAsset(tenant_id: string, asset: Partial<Asset>, tx?: Prisma.TransactionClient): Promise<Asset> {
    const newAsset = {
      ...asset,
      id: `ast-${Date.now()}`,
      status: "DRAFT",
    } as Asset;
    this.assets.push(newAsset);
    return newAsset;
  }

  async updateAsset(
    tenant_id: string,
    assetId: string,
    updates: Partial<Asset>,
    tx?: Prisma.TransactionClient,
  ): Promise<Asset | null> {
    const idx = this.assets.findIndex((a) => a.id === assetId);
    if (idx === -1) return null;
    this.assets[idx] = { ...this.assets[idx], ...updates };
    return this.assets[idx];
  }

  // Capex
  async listCapexRequests(tenant_id: string): Promise<CapexRequest[]> {
    return this.capexRequests;
  }

  async getCapexRequestById(
    tenant_id: string,
    id: string,
  ): Promise<CapexRequest | null> {
    return this.capexRequests.find((c: any) => c.id === id) || null;
  }

  async createCapexRequest(
    tenant_id: string,
    request: Partial<CapexRequest>,
    tx?: Prisma.TransactionClient,
  ): Promise<CapexRequest> {
    const newReq = {
      ...request,
      id: `cpx-${Date.now()}`,
      status: "PENDING",
    } as CapexRequest;
    this.capexRequests.push(newReq);
    return newReq;
  }

  async updateCapexRequest(
    tenant_id: string,
    id: string,
    updates: Partial<CapexRequest>,
    tx?: Prisma.TransactionClient,
  ): Promise<CapexRequest | null> {
    const idx = this.capexRequests.findIndex((c: any) => c.id === id);
    if (idx === -1) return null;
    this.capexRequests[idx] = { ...this.capexRequests[idx], ...updates };
    return this.capexRequests[idx];
  }

  async listCapexBudgets(tenant_id: string): Promise<FinanceCapexBudgetRow[]> {
    return this.capexBudgets;
  }

  async setCapexBudget(
    tenant_id: string,
    budget: FinanceCapexBudgetRow,
  ): Promise<void> {
    const idx = this.capexBudgets.findIndex(
      (b) => b.department === budget.department,
    );
    if (idx !== -1) {
      this.capexBudgets[idx] = budget;
    } else {
      this.capexBudgets.push(budget);
    }
  }

  // Depreciation & Events
  async listAssetDepreciationEntries(
    tenant_id: string,
    assetId?: string,
  ): Promise<AssetDepreciationEntry[]> {
    return this.depreciationEntries.filter(
      (d) => !assetId || d.assetId === assetId,
    );
  }

  async createDepreciationEntry(
    tenant_id: string,
    entry: Partial<AssetDepreciationEntry>,
    tx?: Prisma.TransactionClient,
  ): Promise<AssetDepreciationEntry> {
    const newEntry = {
      ...entry,
      id: `dep-${Date.now()}`,
    } as AssetDepreciationEntry;
    this.depreciationEntries.push(newEntry);
    return newEntry;
  }

  async listAssetEvents(
    tenant_id: string,
    assetId?: string,
  ): Promise<AssetEvent[]> {
    return this.assetEvents.filter((e) => !assetId || e.assetId === assetId);
  }

  async createAssetEvent(
    tenant_id: string,
    event: Partial<AssetEvent>,
    tx?: Prisma.TransactionClient,
  ): Promise<AssetEvent> {
    const newEvent = { ...event, id: `evt-${Date.now()}` } as AssetEvent;
    this.assetEvents.push(newEvent);
    return newEvent;
  }

  async getAssetAuditPack(
    tenant_id: string,
    assetId: string,
  ): Promise<AssetAuditPack> {
    return {
      assetId,
      capexRequest: this.capexRequests.find((c: any) =>
        c.assetDescription.includes(assetId),
      ), // rough match
      depreciationEntries: this.depreciationEntries.filter(
        (d) => d.assetId === assetId,
      ),
      events: this.assetEvents.filter((e) => e.assetId === assetId),
      evidence: [],
      checksum: "mock-checksum",
      signature: "mock-signature",
    };
  }

  // Receivables
  async listReceivables(tenant_id: string): Promise<FinanceReceivableRow[]> {
    return this.receivables;
  }

  async createReceivable(
    tenant_id: string,
    invoice: Partial<ReceivableInvoice>,
    tx?: Prisma.TransactionClient,
  ): Promise<ReceivableInvoice> {
    const newInv = {
      ...invoice,
      id: `inv-${Date.now()}`,
      status: "DRAFT",
    } as ReceivableInvoice;
    this.receivableInvoices.push(newInv);
    // Update view model
    this.receivables.push({
      id: newInv.id,
      customerName: newInv.customer,
      invoiceNumber: newInv.id,
      amount: newInv.amount,
      currency: "USD",
      dueDate: newInv.dueDate,
      status: "DRAFT",
      agingDays: 0,
      updated_at: new Date().toISOString(),
    });
    return newInv;
  }

  async updateReceivable(
    tenant_id: string,
    id: string,
    updates: Partial<ReceivableInvoice>,
    tx?: Prisma.TransactionClient,
  ): Promise<ReceivableInvoice | null> {
    const idx = this.receivableInvoices.findIndex((i) => i.id === id);
    if (idx === -1) return null;
    this.receivableInvoices[idx] = {
      ...this.receivableInvoices[idx],
      ...updates,
    };
    return this.receivableInvoices[idx];
  }

  // Payables
  async listPayables(tenant_id: string): Promise<FinancePayableRow[]> {
    return this.payables;
  }

  async createPayable(
    tenant_id: string,
    bill: Partial<PayableBill>,
    tx?: Prisma.TransactionClient,
  ): Promise<PayableBill> {
    const newBill = {
      ...bill,
      id: `bill-${Date.now()}`,
      status: "RECEIVED",
    } as PayableBill;
    this.payableBills.push(newBill);
    // Update view model
    this.payables.push({
      id: newBill.id,
      vendorName: newBill.vendor,
      billNumber: newBill.id,
      amount: newBill.amount,
      currency: "USD",
      dueDate: newBill.dueDate,
      status: "RECEIVED",
      updated_at: new Date().toISOString(),
    });
    return newBill;
  }

  async updatePayable(
    tenant_id: string,
    id: string,
    updates: Partial<PayableBill>,
    tx?: Prisma.TransactionClient,
  ): Promise<PayableBill | null> {
    const idx = this.payableBills.findIndex((i) => i.id === id);
    if (idx === -1) return null;
    this.payableBills[idx] = { ...this.payableBills[idx], ...updates };
    return this.payableBills[idx];
  }

  // Payments
  async listPayments(tenant_id: string): Promise<FinancePaymentRow[]> {
    return this.payments.map((p) => ({
      id: p.id,
      beneficiary: p.beneficiary,
      amount: p.amount,
      currency: p.currency,
      status: p.status === "PAID" ? "COMPLETED" : "PENDING_APPROVAL",
      method: "BANK_TRANSFER",
      scheduledDate: new Date().toISOString(),
    }));
  }

  async createPaymentRequest(
    tenant_id: string,
    request: Partial<PaymentRequest>,
    tx?: Prisma.TransactionClient,
  ): Promise<PaymentRequest> {
    const newPay = {
      ...request,
      id: `pay-${Date.now()}`,
      status: "DRAFT",
    } as PaymentRequest;
    this.payments.push(newPay);
    return newPay;
  }

  async updatePaymentStatus(
    tenant_id: string,
    id: string,
    status: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const p = this.payments.find((p) => p.id === id);
    if (p) p.status = status as any;
  }

  // Documents
  async listDocuments(tenant_id: string): Promise<FinanceDocumentRow[]> {
    return this.documents;
  }

  async createDocument(
    tenant_id: string,
    doc: Partial<FinanceDocumentRow>,
    tx?: Prisma.TransactionClient,
  ): Promise<FinanceDocumentRow> {
    const newDoc = { ...doc, id: `doc-${Date.now()}` } as FinanceDocumentRow;
    this.documents.push(newDoc);
    return newDoc;
  }

  // Policies & Periods
  async listPolicies(tenant_id: string): Promise<FinancePolicyRow[]> {
    return this.policies;
  }

  async listPeriods(tenant_id: string): Promise<AccountingPeriod[]> {
    return this.periods;
  }

  // Insights & Alerts
  async getInsights(tenant_id: string): Promise<FinanceInsight[]> {
    return [];
  }

  async getAlerts(tenant_id: string): Promise<FinanceAlert[]> {
    return this.alerts;
  }

  // Payroll
  async listPayrollEntries(
    tenant_id: string,
    period?: string,
  ): Promise<PayrollEntry[]> {
    return this.payroll;
  }

  async createPayrollEntry(
    tenant_id: string,
    entry: Partial<PayrollEntry>,
    tx?: Prisma.TransactionClient,
  ): Promise<PayrollEntry> {
    const newEntry = { ...entry, id: `pay-${Date.now()}` } as PayrollEntry;
    this.payroll.push(newEntry);
    return newEntry;
  }

  async updatePayrollEntry(
    tenant_id: string,
    id: string,
    updates: Partial<PayrollEntry>,
    tx?: Prisma.TransactionClient,
  ): Promise<PayrollEntry | null> {
    const idx = this.payroll.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    this.payroll[idx] = { ...this.payroll[idx], ...updates };
    return this.payroll[idx];
  }

  async estimatePayroll(
    tenant_id: string,
    period: string,
  ): Promise<PayrollEstimate[]> {
    const estimatesMap = new Map<string, PayrollEstimate>();

    for (const emp of this.employees) {
      if (emp.tenant_id !== tenant_id || emp.status !== "active") continue;
      
      const deptName = emp.department?.name || "Unassigned";
      const compensation = this.compensations.find((c: any) => c.employee_id === emp.id);
      
      let gross = new Prisma.Decimal(0);
      if (compensation) {
        gross = new Prisma.Decimal(compensation.baseSalary);
        if (compensation.allowances) {
          compensation.allowances.forEach((a: any) => gross = gross.plus(a.amount));
        }
        if (compensation.bonuses) {
          compensation.bonuses.forEach((b: any) => gross = gross.plus(b.amount));
        }
      }

      const net = gross.times(0.9);

      if (!estimatesMap.has(deptName)) {
        estimatesMap.set(deptName, {
          department: deptName,
          employeeCount: 0,
          totalGross: new Prisma.Decimal(0),
          totalNet: new Prisma.Decimal(0),
        });
      }

      const est = estimatesMap.get(deptName)!;
      est.employeeCount += 1;
      est.totalGross = est.totalGross.plus(gross);
      est.totalNet = est.totalNet.plus(net);
    }

    if (estimatesMap.size === 0) {
      // Fallback for empty mock state
      return [
        {
          department: "Engineering",
          employeeCount: 1,
          totalGross: new Prisma.Decimal(13000),
          totalNet: new Prisma.Decimal(11700),
        }
      ];
    }

    return Array.from(estimatesMap.values());
  }

  async executePayrollRun(
    tenant_id: string,
    period: string,
    user_id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const estimates = await this.estimatePayroll(tenant_id, period);
    if (estimates.length === 0) return;

    estimates.forEach(est => {
      this.payroll.push({
        id: `pay-${Date.now()}-${Math.random()}`,
        tenant_id,
        employee_id: "various",
        period,
        baseSalary: est.totalGross,
        netSalary: est.totalNet,
        status: "PAID",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    });
  }

  // Bank Reconciliation & Analytics (Phase 5)
  async ingestBankTransactions(
    tenant_id: string,
    transactions: Partial<BankTransaction>[],
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    // Mock ingestion logic
  }

  async getUnreconciledTransactions(
    tenant_id: string
  ): Promise<BankTransaction[]> {
    return [];
  }

  async createReconcileMatch(
    tenant_id: string,
    transaction_id: string,
    journal_id: string,
    score: number,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    // Mock match logic
  }

  async getPerformanceTree(
    tenant_id: string,
    parentId?: string,
    type?: string
  ): Promise<PerformanceTreeNode> {
    return {
      id: "root",
      name: "Global Operations",
      type: "TENANT",
      income: new Prisma.Decimal(500000),
      expense: new Prisma.Decimal(300000),
      net: new Prisma.Decimal(200000),
      children: [],
    };
  }
}

