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
} from "../finance.types";

/**
 * Finance Repository Interface
 * Abstract class defining the contract for finance data persistence
 * Using abstract class instead of interface for NestJS DI compatibility
 *
 * CRITICAL: All methods MUST accept tenantId as the first argument
 * to enforce multi-tenancy at the data layer
 */
export abstract class IFinanceRepository {
  // Ledger & Transactions
  abstract getLedger(
    tenantId: string,
    locationId?: string,
  ): Promise<LedgerEntry[]>;
  abstract createTransaction(
    tenantId: string,
    data: CreateTransactionDto,
  ): Promise<Transaction>;
  abstract createJournal(tenantId: string, data: any): Promise<any>;
  abstract getBalance(tenantId: string): Promise<Balance>;
  abstract getTransactionById(
    tenantId: string,
    transactionId: string,
  ): Promise<Transaction | null>;

  // Money Sources
  abstract listMoneySources(tenantId: string): Promise<FinanceMoneySourceRow[]>;

  // Treasury
  abstract listTransfers(tenantId: string): Promise<TreasuryTransfer[]>;
  abstract createTransfer(
    tenantId: string,
    data: Partial<TreasuryTransfer>,
  ): Promise<TreasuryTransfer>;
  abstract reconcileSettlement(
    tenantId: string,
    sourceId: string,
    amount: number,
  ): Promise<void>;

  // Assets
  abstract listAssets(tenantId: string): Promise<Asset[]>;
  abstract getAssetById(
    tenantId: string,
    assetId: string,
  ): Promise<Asset | null>;
  abstract createAsset(tenantId: string, asset: Partial<Asset>): Promise<Asset>;
  abstract updateAsset(
    tenantId: string,
    assetId: string,
    updates: Partial<Asset>,
  ): Promise<Asset | null>;

  // Capex
  abstract listCapexRequests(tenantId: string): Promise<CapexRequest[]>;
  abstract getCapexRequestById(
    tenantId: string,
    id: string,
  ): Promise<CapexRequest | null>;
  abstract createCapexRequest(
    tenantId: string,
    request: Partial<CapexRequest>,
  ): Promise<CapexRequest>;
  abstract updateCapexRequest(
    tenantId: string,
    id: string,
    updates: Partial<CapexRequest>,
  ): Promise<CapexRequest | null>;
  abstract listCapexBudgets(tenantId: string): Promise<FinanceCapexBudgetRow[]>;
  abstract setCapexBudget(
    tenantId: string,
    budget: FinanceCapexBudgetRow,
  ): Promise<void>;

  // Depreciation & Events
  abstract listAssetDepreciationEntries(
    tenantId: string,
    assetId?: string,
  ): Promise<AssetDepreciationEntry[]>;
  abstract createDepreciationEntry(
    tenantId: string,
    entry: Partial<AssetDepreciationEntry>,
  ): Promise<AssetDepreciationEntry>;
  abstract listAssetEvents(
    tenantId: string,
    assetId?: string,
  ): Promise<AssetEvent[]>;
  abstract createAssetEvent(
    tenantId: string,
    event: Partial<AssetEvent>,
  ): Promise<AssetEvent>;
  abstract getAssetAuditPack(
    tenantId: string,
    assetId: string,
  ): Promise<AssetAuditPack>;

  // Receivables
  abstract listReceivables(tenantId: string): Promise<FinanceReceivableRow[]>;
  abstract createReceivable(
    tenantId: string,
    invoice: Partial<ReceivableInvoice>,
  ): Promise<ReceivableInvoice>;
  abstract updateReceivable(
    tenantId: string,
    id: string,
    updates: Partial<ReceivableInvoice>,
  ): Promise<ReceivableInvoice | null>;

  // Payables
  abstract listPayables(tenantId: string): Promise<FinancePayableRow[]>;
  abstract createPayable(
    tenantId: string,
    bill: Partial<PayableBill>,
  ): Promise<PayableBill>;
  abstract updatePayable(
    tenantId: string,
    id: string,
    updates: Partial<PayableBill>,
  ): Promise<PayableBill | null>;

  // Payments
  abstract listPayments(tenantId: string): Promise<FinancePaymentRow[]>;
  abstract createPaymentRequest(
    tenantId: string,
    request: Partial<PaymentRequest>,
  ): Promise<PaymentRequest>;
  abstract updatePaymentStatus(
    tenantId: string,
    id: string,
    status: string,
  ): Promise<void>;

  // Documents
  abstract listDocuments(tenantId: string): Promise<FinanceDocumentRow[]>;
  abstract createDocument(
    tenantId: string,
    doc: Partial<FinanceDocumentRow>,
  ): Promise<FinanceDocumentRow>;

  // Policies & Periods
  abstract listPolicies(tenantId: string): Promise<FinancePolicyRow[]>;
  abstract listPeriods(tenantId: string): Promise<AccountingPeriod[]>;

  // Insights & Alerts
  abstract getInsights(tenantId: string): Promise<FinanceInsight[]>;
  abstract getAlerts(tenantId: string): Promise<FinanceAlert[]>;

  // Payroll
  abstract listPayrollEntries(
    tenantId: string,
    period?: string,
  ): Promise<PayrollEntry[]>;
  abstract createPayrollEntry(
    tenantId: string,
    entry: Partial<PayrollEntry>,
  ): Promise<PayrollEntry>;
  abstract estimatePayroll(
    tenantId: string,
    period: string,
  ): Promise<PayrollEstimate[]>;
  abstract executePayrollRun(
    tenantId: string,
    period: string,
    userId: string,
  ): Promise<void>;
  abstract updatePayrollEntry(
    tenantId: string,
    id: string,
    updates: Partial<PayrollEntry>,
  ): Promise<PayrollEntry | null>;
}
