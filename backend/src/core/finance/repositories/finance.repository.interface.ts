import { Prisma } from "@prisma/client";
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
 * CRITICAL: All methods MUST accept tenant_id as the first argument
 * to enforce multi-tenancy at the data layer
 */
export abstract class IFinanceRepository {
  // Ledger & Transactions
  abstract getLedger(
    tenant_id: string,
    location_id?: string,
  ): Promise<LedgerEntry[]>;
  abstract createTransaction(
    tenant_id: string,
    data: CreateTransactionDto,
    tx?: Prisma.TransactionClient,
  ): Promise<Transaction>;
  abstract createJournal(
    tenant_id: string,
    data: any,
    tx?: Prisma.TransactionClient,
  ): Promise<any>;
  abstract getBalance(tenant_id: string): Promise<Balance>;
  abstract getTransactionById(
    tenant_id: string,
    transaction_id: string,
  ): Promise<Transaction | null>;

  // Money Sources
  abstract listMoneySources(tenant_id: string): Promise<FinanceMoneySourceRow[]>;

  // Treasury
  abstract listTransfers(tenant_id: string): Promise<TreasuryTransfer[]>;
  abstract createTransfer(
    tenant_id: string,
    data: Partial<TreasuryTransfer>,
    tx?: Prisma.TransactionClient,
  ): Promise<TreasuryTransfer>;
  abstract reconcileSettlement(
    tenant_id: string,
    sourceId: string,
    amount: number,
    tx?: Prisma.TransactionClient,
  ): Promise<void>;

  // Assets
  abstract listAssets(tenant_id: string): Promise<Asset[]>;
  abstract getAssetById(
    tenant_id: string,
    assetId: string,
  ): Promise<Asset | null>;
  abstract createAsset(
    tenant_id: string,
    asset: Partial<Asset>,
    tx?: Prisma.TransactionClient,
  ): Promise<Asset>;
  abstract updateAsset(
    tenant_id: string,
    assetId: string,
    updates: Partial<Asset>,
    tx?: Prisma.TransactionClient,
  ): Promise<Asset | null>;

  // Capex
  abstract listCapexRequests(tenant_id: string): Promise<CapexRequest[]>;
  abstract getCapexRequestById(
    tenant_id: string,
    id: string,
  ): Promise<CapexRequest | null>;
  abstract createCapexRequest(
    tenant_id: string,
    request: Partial<CapexRequest>,
    tx?: Prisma.TransactionClient,
  ): Promise<CapexRequest>;
  abstract updateCapexRequest(
    tenant_id: string,
    id: string,
    updates: Partial<CapexRequest>,
    tx?: Prisma.TransactionClient,
  ): Promise<CapexRequest | null>;
  abstract listCapexBudgets(tenant_id: string): Promise<FinanceCapexBudgetRow[]>;
  abstract setCapexBudget(
    tenant_id: string,
    budget: FinanceCapexBudgetRow,
  ): Promise<void>;

  // Depreciation & Events
  abstract listAssetDepreciationEntries(
    tenant_id: string,
    assetId?: string,
  ): Promise<AssetDepreciationEntry[]>;
  abstract createDepreciationEntry(
    tenant_id: string,
    entry: Partial<AssetDepreciationEntry>,
    tx?: Prisma.TransactionClient,
  ): Promise<AssetDepreciationEntry>;
  abstract listAssetEvents(
    tenant_id: string,
    assetId?: string,
  ): Promise<AssetEvent[]>;
  abstract createAssetEvent(
    tenant_id: string,
    event: Partial<AssetEvent>,
    tx?: Prisma.TransactionClient,
  ): Promise<AssetEvent>;
  abstract getAssetAuditPack(
    tenant_id: string,
    assetId: string,
  ): Promise<AssetAuditPack>;

  // Receivables
  abstract listReceivables(tenant_id: string): Promise<FinanceReceivableRow[]>;
  abstract createReceivable(
    tenant_id: string,
    invoice: Partial<ReceivableInvoice>,
    tx?: Prisma.TransactionClient,
  ): Promise<ReceivableInvoice>;
  abstract updateReceivable(
    tenant_id: string,
    id: string,
    updates: Partial<ReceivableInvoice>,
    tx?: Prisma.TransactionClient,
  ): Promise<ReceivableInvoice | null>;

  // Payables
  abstract listPayables(tenant_id: string): Promise<FinancePayableRow[]>;
  abstract createPayable(
    tenant_id: string,
    bill: Partial<PayableBill>,
    tx?: Prisma.TransactionClient,
  ): Promise<PayableBill>;
  abstract updatePayable(
    tenant_id: string,
    id: string,
    updates: Partial<PayableBill>,
    tx?: Prisma.TransactionClient,
  ): Promise<PayableBill | null>;

  // Payments
  abstract listPayments(tenant_id: string): Promise<FinancePaymentRow[]>;
  abstract createPaymentRequest(
    tenant_id: string,
    request: Partial<PaymentRequest>,
    tx?: Prisma.TransactionClient,
  ): Promise<PaymentRequest>;
  abstract updatePaymentStatus(
    tenant_id: string,
    id: string,
    status: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void>;

  // Documents
  abstract listDocuments(tenant_id: string): Promise<FinanceDocumentRow[]>;
  abstract createDocument(
    tenant_id: string,
    doc: Partial<FinanceDocumentRow>,
    tx?: Prisma.TransactionClient,
  ): Promise<FinanceDocumentRow>;

  // Policies & Periods
  abstract listPolicies(tenant_id: string): Promise<FinancePolicyRow[]>;
  abstract listPeriods(tenant_id: string): Promise<AccountingPeriod[]>;

  // Insights & Alerts
  abstract getInsights(tenant_id: string): Promise<FinanceInsight[]>;
  abstract getAlerts(tenant_id: string): Promise<FinanceAlert[]>;

  // Payroll
  abstract listPayrollEntries(
    tenant_id: string,
    period?: string,
  ): Promise<PayrollEntry[]>;
  abstract createPayrollEntry(
    tenant_id: string,
    entry: Partial<PayrollEntry>,
    tx?: Prisma.TransactionClient,
  ): Promise<PayrollEntry>;
  abstract estimatePayroll(
    tenant_id: string,
    period: string,
  ): Promise<PayrollEstimate[]>;
  abstract executePayrollRun(
    tenant_id: string,
    period: string,
    user_id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void>;
  abstract updatePayrollEntry(
    tenant_id: string,
    id: string,
    updates: Partial<PayrollEntry>,
    tx?: Prisma.TransactionClient,
  ): Promise<PayrollEntry | null>;
}
