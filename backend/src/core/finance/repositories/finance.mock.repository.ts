import { Injectable } from "@nestjs/common";
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
  FinanceMoneySourceRow,
  TreasuryTransfer,
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
  private moneySources: FinanceMoneySourceRow[] = [
    {
      id: "ms-1",
      name: "Main Operating Account",
      type: "BANK_ACCOUNT",
      currency: "USD",
      balance: 150000,
    },
    {
      id: "ms-2",
      name: "Payroll Account",
      type: "BANK_ACCOUNT",
      currency: "USD",
      balance: 50000,
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
        amount: 50000,
        type: "credit",
        description: "Initial Capital",
        category: "Equity",
      },
    ]);
  }

  private createMockLedgerEntries(
    tenantId: string,
    locationId: string,
    entries: any[],
  ) {
    // Simplified for brevity, reusing logic from previous implementation if needed
    // but keeping it minimal to avoid huge file
    const baseDate = new Date();
    entries.forEach((e, i) => {
      this.ledgerEntries.push({
        id: `${tenantId}-leg-${i}`,
        tenantId,
        locationId,
        amount: e.amount,
        type: e.type,
        description: e.description,
        category: e.category,
        timestamp: baseDate,
        balance: 0,
        referenceId: `ref-${i}`,
      } as LedgerEntry);
    });
  }

  // --- Implementation ---

  async getLedger(
    tenantId: string,
    locationId?: string,
  ): Promise<LedgerEntry[]> {
    return this.ledgerEntries.filter(
      (e) =>
        e.tenantId === tenantId && (!locationId || e.locationId === locationId),
    );
  }

  async createTransaction(
    tenantId: string,
    data: CreateTransactionDto,
  ): Promise<Transaction> {
    const txn: Transaction = {
      id: `${tenantId}-txn-${Date.now()}`,
      tenantId,
      locationId: data.locationId ?? "default",
      amount: data.amount,
      type: data.type,
      description: data.description,
      category: data.category,
      createdAt: new Date(),
      status: "approved",
      createdBy: "system",
    };
    this.transactions.push(txn);
    return txn;
  }

  async getBalance(tenantId: string): Promise<Balance> {
    return {
      tenantId,
      totalBalance: 100000, // Mock fixed balance
      currency: "USD",
      lastUpdated: new Date(),
      totalDebits: 5000,
      totalCredits: 105000,
      transactionCount: 10,
    };
  }

  async getTransactionById(
    tenantId: string,
    transactionId: string,
  ): Promise<Transaction | null> {
    return (
      this.transactions.find(
        (t) => t.tenantId === tenantId && t.id === transactionId,
      ) || null
    );
  }

  // Money Sources
  async listMoneySources(tenantId: string): Promise<FinanceMoneySourceRow[]> {
    return this.moneySources;
  }

  // Treasury
  async listTransfers(tenantId: string): Promise<TreasuryTransfer[]> {
    return this.transfers.filter((t: any) => t.tenantId === tenantId);
  }

  async createTransfer(
    tenantId: string,
    data: Partial<TreasuryTransfer>,
  ): Promise<TreasuryTransfer> {
    const transfer: TreasuryTransfer = {
      id: `TR-${Date.now()}`,
      tenantId,
      fromSourceId: data.fromSourceId!,
      toSourceId: data.toSourceId!,
      amount: data.amount!,
      currency: data.currency || "IDR",
      status: data.status || "PENDING",
      requestedBy: data.requestedBy || "system",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.transfers.push(transfer);
    return transfer;
  }

  async reconcileSettlement(
    tenantId: string,
    sourceId: string,
    amount: number,
  ): Promise<void> {
    const source = this.moneySources.find((s) => s.id === sourceId);
    if (source) {
      source.balance += amount;
      if (source.pendingSettlement) {
        source.pendingSettlement = Math.max(
          0,
          source.pendingSettlement - amount,
        );
      }
    }
  }

  // Assets
  async listAssets(tenantId: string): Promise<Asset[]> {
    return this.assets; // No tenant filter for simplicity in mock, or add filtering
  }

  async getAssetById(tenantId: string, assetId: string): Promise<Asset | null> {
    return this.assets.find((a) => a.id === assetId) || null;
  }

  async createAsset(tenantId: string, asset: Partial<Asset>): Promise<Asset> {
    const newAsset = {
      ...asset,
      id: `ast-${Date.now()}`,
      status: "DRAFT",
    } as Asset;
    this.assets.push(newAsset);
    return newAsset;
  }

  async updateAsset(
    tenantId: string,
    assetId: string,
    updates: Partial<Asset>,
  ): Promise<Asset | null> {
    const idx = this.assets.findIndex((a) => a.id === assetId);
    if (idx === -1) return null;
    this.assets[idx] = { ...this.assets[idx], ...updates };
    return this.assets[idx];
  }

  // Capex
  async listCapexRequests(tenantId: string): Promise<CapexRequest[]> {
    return this.capexRequests;
  }

  async getCapexRequestById(
    tenantId: string,
    id: string,
  ): Promise<CapexRequest | null> {
    return this.capexRequests.find((c) => c.id === id) || null;
  }

  async createCapexRequest(
    tenantId: string,
    request: Partial<CapexRequest>,
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
    tenantId: string,
    id: string,
    updates: Partial<CapexRequest>,
  ): Promise<CapexRequest | null> {
    const idx = this.capexRequests.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    this.capexRequests[idx] = { ...this.capexRequests[idx], ...updates };
    return this.capexRequests[idx];
  }

  async listCapexBudgets(tenantId: string): Promise<FinanceCapexBudgetRow[]> {
    return this.capexBudgets;
  }

  async setCapexBudget(
    tenantId: string,
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
    tenantId: string,
    assetId?: string,
  ): Promise<AssetDepreciationEntry[]> {
    return this.depreciationEntries.filter(
      (d) => !assetId || d.assetId === assetId,
    );
  }

  async createDepreciationEntry(
    tenantId: string,
    entry: Partial<AssetDepreciationEntry>,
  ): Promise<AssetDepreciationEntry> {
    const newEntry = {
      ...entry,
      id: `dep-${Date.now()}`,
    } as AssetDepreciationEntry;
    this.depreciationEntries.push(newEntry);
    return newEntry;
  }

  async listAssetEvents(
    tenantId: string,
    assetId?: string,
  ): Promise<AssetEvent[]> {
    return this.assetEvents.filter((e) => !assetId || e.assetId === assetId);
  }

  async createAssetEvent(
    tenantId: string,
    event: Partial<AssetEvent>,
  ): Promise<AssetEvent> {
    const newEvent = { ...event, id: `evt-${Date.now()}` } as AssetEvent;
    this.assetEvents.push(newEvent);
    return newEvent;
  }

  async getAssetAuditPack(
    tenantId: string,
    assetId: string,
  ): Promise<AssetAuditPack> {
    return {
      assetId,
      capexRequest: this.capexRequests.find((c) =>
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
  async listReceivables(tenantId: string): Promise<FinanceReceivableRow[]> {
    return this.receivables;
  }

  async createReceivable(
    tenantId: string,
    invoice: Partial<ReceivableInvoice>,
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
    });
    return newInv;
  }

  async updateReceivable(
    tenantId: string,
    id: string,
    updates: Partial<ReceivableInvoice>,
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
  async listPayables(tenantId: string): Promise<FinancePayableRow[]> {
    return this.payables;
  }

  async createPayable(
    tenantId: string,
    bill: Partial<PayableBill>,
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
    });
    return newBill;
  }

  async updatePayable(
    tenantId: string,
    id: string,
    updates: Partial<PayableBill>,
  ): Promise<PayableBill | null> {
    const idx = this.payableBills.findIndex((i) => i.id === id);
    if (idx === -1) return null;
    this.payableBills[idx] = { ...this.payableBills[idx], ...updates };
    return this.payableBills[idx];
  }

  // Payments
  async listPayments(tenantId: string): Promise<FinancePaymentRow[]> {
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
    tenantId: string,
    request: Partial<PaymentRequest>,
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
    tenantId: string,
    id: string,
    status: string,
  ): Promise<void> {
    const p = this.payments.find((p) => p.id === id);
    if (p) p.status = status as any;
  }

  // Documents
  async listDocuments(tenantId: string): Promise<FinanceDocumentRow[]> {
    return this.documents;
  }

  async createDocument(
    tenantId: string,
    doc: Partial<FinanceDocumentRow>,
  ): Promise<FinanceDocumentRow> {
    const newDoc = { ...doc, id: `doc-${Date.now()}` } as FinanceDocumentRow;
    this.documents.push(newDoc);
    return newDoc;
  }

  // Policies & Periods
  async listPolicies(tenantId: string): Promise<FinancePolicyRow[]> {
    return this.policies;
  }

  async listPeriods(tenantId: string): Promise<AccountingPeriod[]> {
    return this.periods;
  }

  // Insights & Alerts
  async getInsights(tenantId: string): Promise<FinanceInsight[]> {
    return [];
  }

  async getAlerts(tenantId: string): Promise<FinanceAlert[]> {
    return this.alerts;
  }

  // Payroll
  async listPayrollEntries(
    tenantId: string,
    period?: string,
  ): Promise<PayrollEntry[]> {
    return this.payroll;
  }

  async createPayrollEntry(
    tenantId: string,
    entry: Partial<PayrollEntry>,
  ): Promise<PayrollEntry> {
    const newEntry = { ...entry, id: `pay-${Date.now()}` } as PayrollEntry;
    this.payroll.push(newEntry);
    return newEntry;
  }

  async updatePayrollEntry(
    tenantId: string,
    id: string,
    updates: Partial<PayrollEntry>,
  ): Promise<PayrollEntry | null> {
    const idx = this.payroll.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    this.payroll[idx] = { ...this.payroll[idx], ...updates };
    return this.payroll[idx];
  }
}
