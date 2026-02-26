import { Injectable } from "@nestjs/common";
import { IFinanceRepository } from "./repositories/finance.repository.interface";
import { LedgerEntry } from "./entities/ledger-entry.entity";
import { Transaction } from "./entities/transaction.entity";
import { Balance } from "./entities/balance.entity";
import {
  CreateTransactionDto,
  TransactionType,
} from "./dto/create-transaction.dto";
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
} from "./finance.types";
import { AuditService } from "../../shared/audit/audit.service";
import { FileProcessingService } from "../../shared/file-processing/file-processing.service";

@Injectable()
export class FinanceService {
  constructor(
    private readonly financeRepository: IFinanceRepository,
    private readonly auditService: AuditService,
    private readonly fileProcessingService: FileProcessingService,
  ) {}

  async getLedger(
    tenantId: string,
    locationId?: string,
  ): Promise<LedgerEntry[]> {
    return this.financeRepository.getLedger(tenantId, locationId);
  }

  async createTransaction(
    tenantId: string,
    data: CreateTransactionDto,
    userId: string,
  ): Promise<Transaction> {
    const transaction = await this.financeRepository.createTransaction(
      tenantId,
      data,
    );
    await this.auditService.log({
      tenantId,
      userId,
      module: "finance",
      action: "CREATE",
      entityType: "TRANSACTION",
      entityId: transaction.id,
      metadata: {
        amount: data.amount,
        type: data.type,
        description: data.description,
      },
    });
    return transaction;
  }

  /**
   * Bulk import transactions from file (CSV/Excel)
   */
  async importTransactions(
    tenantId: string,
    buffer: Buffer,
    fileType: "csv" | "xlsx",
    userId: string,
  ): Promise<{ imported: number; errors: any[] }> {
    const { data, errors } =
      fileType === "csv"
        ? await this.fileProcessingService.parseCsv(
            buffer,
            CreateTransactionDto,
          )
        : await this.fileProcessingService.parseExcel(
            buffer,
            CreateTransactionDto,
          );

    if (errors.length > 0) {
      return { imported: 0, errors };
    }

    let importedCount = 0;
    for (const transactionData of data) {
      await this.createTransaction(tenantId, transactionData, userId);
      importedCount++;
    }

    return { imported: importedCount, errors: [] };
  }

  /**
   * Export General Ledger to Excel
   */
  async exportLedger(tenantId: string, userId: string): Promise<Buffer> {
    const ledger = await this.getLedger(tenantId);

    const columns = [
      { header: "ID", key: "id", width: 10 },
      { header: "Date", key: "created_at", width: 20 },
      { header: "Description", key: "description", width: 40 },
      { header: "Amount", key: "amount", width: 15 },
      { header: "Type", key: "type", width: 10 },
      { header: "Category", key: "category", width: 20 },
      { header: "Reference", key: "reference", width: 20 },
    ];

    return this.fileProcessingService.generateExcel(ledger, columns, {
      traceId: `FIN-${tenantId}-${userId}-${Date.now()}`,
      watermark: { text: "ZENVIX INTERNAL" },
    });
  }

  async getBalance(tenantId: string): Promise<Balance> {
    return this.financeRepository.getBalance(tenantId);
  }

  async getTransactionById(
    tenantId: string,
    transactionId: string,
  ): Promise<Transaction | null> {
    return this.financeRepository.getTransactionById(tenantId, transactionId);
  }

  // Assets
  async listAssets(tenantId: string): Promise<Asset[]> {
    return this.financeRepository.listAssets(tenantId);
  }

  async createAsset(tenantId: string, asset: Partial<Asset>): Promise<Asset> {
    return this.financeRepository.createAsset(tenantId, asset);
  }

  async updateAssetStatus(
    tenantId: string,
    id: string,
    status: string,
  ): Promise<Asset | null> {
    return this.financeRepository.updateAsset(tenantId, id, {
      status: status as any,
    });
  }

  async capitalizeAsset(
    tenantId: string,
    assetId: string,
    capitalizationDate: string,
  ): Promise<Asset | null> {
    return this.financeRepository.updateAsset(tenantId, assetId, {
      status: "ACTIVE",
      acquisitionDate: capitalizationDate,
    });
  }

  // Capex
  async listCapexRequests(tenantId: string): Promise<CapexRequest[]> {
    return this.financeRepository.listCapexRequests(tenantId);
  }

  async createCapexRequest(
    tenantId: string,
    request: Partial<CapexRequest>,
  ): Promise<CapexRequest> {
    return this.financeRepository.createCapexRequest(tenantId, request);
  }

  async listCapexBudgets(tenantId: string): Promise<FinanceCapexBudgetRow[]> {
    return this.financeRepository.listCapexBudgets(tenantId);
  }

  async setCapexBudget(
    tenantId: string,
    budget: FinanceCapexBudgetRow,
  ): Promise<void> {
    return this.financeRepository.setCapexBudget(tenantId, budget);
  }

  async approveCapexRequest(
    tenantId: string,
    id: string,
  ): Promise<CapexRequest | null> {
    return this.financeRepository.updateCapexRequest(tenantId, id, {
      status: "APPROVED",
    });
  }

  async rejectCapexRequest(
    tenantId: string,
    id: string,
  ): Promise<CapexRequest | null> {
    return this.financeRepository.updateCapexRequest(tenantId, id, {
      status: "REJECTED",
    });
  }

  // Depreciation
  async listAssetDepreciationEntries(
    tenantId: string,
    assetId?: string,
  ): Promise<AssetDepreciationEntry[]> {
    return this.financeRepository.listAssetDepreciationEntries(
      tenantId,
      assetId,
    );
  }

  async createDepreciationEntry(
    tenantId: string,
    entry: Partial<AssetDepreciationEntry>,
  ): Promise<AssetDepreciationEntry> {
    return this.financeRepository.createDepreciationEntry(tenantId, entry);
  }

  async runScheduledPeriodDepreciation(
    tenantId: string,
    periodStart: string,
    periodEnd: string,
  ): Promise<any> {
    // Mock logic: just create one entry for first asset
    const assets = await this.listAssets(tenantId);
    if (assets.length > 0) {
      await this.createDepreciationEntry(tenantId, {
        assetId: assets[0].id,
        amount: 100,
        postingDate: periodEnd,
        method: "STRAIGHT_LINE",
        isPosted: true,
      });
    }
    return {
      runId: `run-${Date.now()}`,
      postedEntries: 1,
      skippedAssetIds: [],
    };
  }

  // Events
  async listAssetEvents(
    tenantId: string,
    assetId?: string,
  ): Promise<AssetEvent[]> {
    return this.financeRepository.listAssetEvents(tenantId, assetId);
  }

  async createAssetEvent(
    tenantId: string,
    event: Partial<AssetEvent>,
  ): Promise<AssetEvent> {
    return this.financeRepository.createAssetEvent(tenantId, event);
  }

  async getAssetAuditPack(
    tenantId: string,
    assetId: string,
  ): Promise<AssetAuditPack> {
    return this.financeRepository.getAssetAuditPack(tenantId, assetId);
  }

  // Receivables
  async listReceivables(tenantId: string): Promise<FinanceReceivableRow[]> {
    return this.financeRepository.listReceivables(tenantId);
  }

  async createReceivable(
    tenantId: string,
    invoice: Partial<ReceivableInvoice>,
  ): Promise<ReceivableInvoice> {
    return this.financeRepository.createReceivable(tenantId, invoice);
  }

  async markReceivableReceived(tenantId: string, id: string): Promise<void> {
    await this.financeRepository.updateReceivable(tenantId, id, {
      status: "PAID",
    });
  }

  async sendReceivableReminder(tenantId: string, id: string): Promise<void> {
    // Mock email sending
    console.log(`Sending reminder for invoice ${id}`);
  }

  // Payables
  async listPayables(tenantId: string): Promise<FinancePayableRow[]> {
    return this.financeRepository.listPayables(tenantId);
  }

  async createPayable(
    tenantId: string,
    bill: Partial<PayableBill>,
  ): Promise<PayableBill> {
    return this.financeRepository.createPayable(tenantId, bill);
  }

  async approvePayable(
    tenantId: string,
    id: string,
  ): Promise<PayableBill | null> {
    return this.financeRepository.updatePayable(tenantId, id, {
      status: "APPROVED",
    });
  }

  async markPayablePaid(tenantId: string, id: string): Promise<void> {
    await this.financeRepository.updatePayable(tenantId, id, {
      status: "PAID",
    });
  }

  // Payments
  async listPayments(tenantId: string): Promise<FinancePaymentRow[]> {
    return this.financeRepository.listPayments(tenantId);
  }

  async createPaymentRequest(
    tenantId: string,
    request: Partial<PaymentRequest>,
  ): Promise<PaymentRequest> {
    return this.financeRepository.createPaymentRequest(tenantId, request);
  }

  async updatePaymentStatus(
    tenantId: string,
    id: string,
    status: string,
  ): Promise<void> {
    return this.financeRepository.updatePaymentStatus(tenantId, id, status);
  }

  // Documents
  async listDocuments(tenantId: string): Promise<FinanceDocumentRow[]> {
    return this.financeRepository.listDocuments(tenantId);
  }

  async createDocument(
    tenantId: string,
    doc: Partial<FinanceDocumentRow>,
  ): Promise<FinanceDocumentRow> {
    return this.financeRepository.createDocument(tenantId, doc);
  }

  // Policies
  async listPolicies(tenantId: string): Promise<FinancePolicyRow[]> {
    return this.financeRepository.listPolicies(tenantId);
  }

  async listPeriods(tenantId: string): Promise<AccountingPeriod[]> {
    return this.financeRepository.listPeriods(tenantId);
  }

  // Insights
  async getInsights(tenantId: string): Promise<FinanceInsight[]> {
    return this.financeRepository.getInsights(tenantId);
  }

  async getAlerts(tenantId: string): Promise<FinanceAlert[]> {
    return this.financeRepository.getAlerts(tenantId);
  }
}
