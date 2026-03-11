import { Injectable } from "@nestjs/common";
import { IFinanceRepository } from "./repositories/finance.repository.interface";
import { LedgerEntry } from "./entities/ledger-entry.entity";
import { Transaction } from "./entities/transaction.entity";
import { Balance } from "./entities/balance.entity";
import {
  CreateTransactionDto,
  TransactionType,
} from "./dto/create-transaction.dto";
import { CreateJournalDto } from "./dto/create-journal.dto";
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

  async createJournal(
    tenantId: string,
    data: CreateJournalDto,
    userId: string,
  ): Promise<any> {
    const totalDebits = data.lines.reduce(
      (sum, line) => sum + Number(line.debit),
      0,
    );
    const totalCredits = data.lines.reduce(
      (sum, line) => sum + Number(line.credit),
      0,
    );

    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      throw new Error("Journal entry is not balanced (Debits != Credits)");
    }

    try {
      const journal = await this.financeRepository.createJournal(
        tenantId,
        data,
      );

      /*
      await this.auditService.log({
        tenantId,
        userId,
        module: "finance",
        action: "CREATE",
        entityType: "JOURNAL_ENTRY",
        entityId: (journal as any).id,
        metadata: {
          description: data.description,
          linesCount: data.lines.length,
        },
      });
      */

      return journal;
    } catch (error) {
      const fs = require("fs");
      fs.appendFileSync(
        "finance_error.log",
        `[${new Date().toISOString()}] Error in createJournal: ${error.stack || error}\n`,
      );
      console.error("[FinanceService] Error in createJournal:", error);
      throw error;
    }
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

  async createAsset(
    tenantId: string,
    asset: Partial<Asset>,
    userId: string,
  ): Promise<Asset> {
    const created = await this.financeRepository.createAsset(tenantId, asset);
    await this.auditService.log({
      tenantId,
      userId,
      module: "FINANCE",
      action: "CREATE_ASSET",
      entityType: "FIXED_ASSET",
      entityId: created.id,
      metadata: { description: created.description },
    });
    return created;
  }

  async updateAssetStatus(
    tenantId: string,
    id: string,
    status: string,
    userId: string,
  ): Promise<Asset | null> {
    const updated = await this.financeRepository.updateAsset(tenantId, id, {
      status: status as any,
    });
    if (updated) {
      await this.auditService.log({
        tenantId,
        userId,
        module: "FINANCE",
        action: "UPDATE_ASSET_STATUS",
        entityType: "FIXED_ASSET",
        entityId: id,
        changes: { status },
      });
    }
    return updated;
  }

  async capitalizeAsset(
    tenantId: string,
    assetId: string,
    capitalizationDate: string,
    userId: string,
  ): Promise<Asset | null> {
    const updated = await this.financeRepository.updateAsset(
      tenantId,
      assetId,
      {
        status: "ACTIVE",
        acquisitionDate: capitalizationDate,
      },
    );
    if (updated) {
      await this.auditService.log({
        tenantId,
        userId,
        module: "FINANCE",
        action: "CAPITALIZE_ASSET",
        entityType: "FIXED_ASSET",
        entityId: assetId,
        changes: { status: "ACTIVE", capitalizationDate },
      });
    }
    return updated;
  }

  // Capex
  async listCapexRequests(tenantId: string): Promise<CapexRequest[]> {
    return this.financeRepository.listCapexRequests(tenantId);
  }

  async createCapexRequest(
    tenantId: string,
    request: Partial<CapexRequest>,
    userId: string,
  ): Promise<CapexRequest> {
    const created = await this.financeRepository.createCapexRequest(
      tenantId,
      request,
    );
    await this.auditService.log({
      tenantId,
      userId,
      module: "FINANCE",
      action: "CREATE_CAPEX_REQUEST",
      entityType: "CAPEX_REQUEST",
      entityId: created.id,
      metadata: { amount: created.requestedAmount },
    });
    return created;
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
    userId: string,
  ): Promise<CapexRequest | null> {
    const updated = await this.financeRepository.updateCapexRequest(
      tenantId,
      id,
      {
        status: "APPROVED",
      },
    );
    if (updated) {
      await this.auditService.log({
        tenantId,
        userId,
        module: "FINANCE",
        action: "APPROVE_CAPEX_REQUEST",
        entityType: "CAPEX_REQUEST",
        entityId: id,
        changes: { status: "APPROVED" },
      });
    }
    return updated;
  }

  async rejectCapexRequest(
    tenantId: string,
    id: string,
    userId: string,
  ): Promise<CapexRequest | null> {
    const updated = await this.financeRepository.updateCapexRequest(
      tenantId,
      id,
      {
        status: "REJECTED",
      },
    );
    if (updated) {
      await this.auditService.log({
        tenantId,
        userId,
        module: "FINANCE",
        action: "REJECT_CAPEX_REQUEST",
        entityType: "CAPEX_REQUEST",
        entityId: id,
        changes: { status: "REJECTED" },
      });
    }
    return updated;
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

  // Money Sources
  async getMoneySources(tenantId: string) {
    return this.financeRepository.listMoneySources(tenantId);
  }

  // Treasury
  async listTransfers(tenantId: string): Promise<any[]> {
    return this.financeRepository.listTransfers(tenantId);
  }

  async createTransfer(
    tenantId: string,
    data: any,
    userId: string,
  ): Promise<any> {
    const created = await this.financeRepository.createTransfer(tenantId, data);
    await this.auditService.log({
      tenantId,
      userId,
      module: "FINANCE",
      action: "CREATE_TREASURY_TRANSFER",
      entityType: "TREASURY_TRANSFER",
      entityId: created.id,
      metadata: {
        from: created.fromSourceId,
        to: created.toSourceId,
        amount: created.amount,
      },
    });
    return created;
  }

  async reconcileSettlement(
    tenantId: string,
    sourceId: string,
    amount: number,
    userId: string,
  ): Promise<void> {
    await this.financeRepository.reconcileSettlement(
      tenantId,
      sourceId,
      amount,
    );
    await this.auditService.log({
      tenantId,
      userId,
      module: "FINANCE",
      action: "RECONCILE_SETTLEMENT",
      entityType: "MONEY_SOURCE",
      entityId: sourceId,
      metadata: { amount },
    });
  }

  // Payments
  async listPayments(tenantId: string): Promise<FinancePaymentRow[]> {
    return this.financeRepository.listPayments(tenantId);
  }

  async createPaymentRequest(
    tenantId: string,
    request: Partial<PaymentRequest>,
    userId: string,
    userRole: string,
  ): Promise<PaymentRequest> {
    const isHighLevelRole = ["OWNER", "FINANCE_HOD", "ADMIN"].includes(
      userRole.toUpperCase(),
    );

    // Auto-approve if high level role, otherwise mark as pending
    request.status = isHighLevelRole ? "APPROVED" : "DRAFT";

    // Convert internal status if needed (DRAFT -> PENDING_APPROVAL based on types)
    // The DB repo creates 'DRAFT' by default if status is empty, but we override it here.
    if (!isHighLevelRole) {
      request.status = "SUBMITTED"; // or DRAFT based on UI intention
    }

    const created = await this.financeRepository.createPaymentRequest(
      tenantId,
      request,
    );

    await this.auditService.log({
      tenantId,
      userId,
      module: "FINANCE",
      action: "CREATE_PAYMENT_REQUEST",
      entityType: "PAYMENT_TRANSACTION",
      entityId: created.id,
      metadata: {
        amount: created.amount,
        destination: created.beneficiary,
        departmentId: created.departmentId,
        purpose: created.purpose,
        status: created.status,
      },
    });

    return created;
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

  // Aggregated Views
  async listInvoices(tenantId: string): Promise<any[]> {
    const [payables, receivables] = await Promise.all([
      this.listPayables(tenantId),
      this.listReceivables(tenantId),
    ]);

    const invoiceRows: any[] = [];

    // Map payables to common invoice format
    payables.forEach((p) => {
      invoiceRows.push({
        id: p.id,
        kind: "PAYABLE",
        vendor: p.vendorName,
        amount: p.amount,
        invoiceDate: p.updatedAt, // Use updatedAt as proxy for invoice date if missing
        dueDate: p.dueDate,
        status: p.status,
      });
    });

    // Map receivables to common invoice format
    receivables.forEach((r) => {
      invoiceRows.push({
        id: r.id,
        kind: "RECEIVABLE",
        vendor: r.customerName,
        amount: r.amount,
        invoiceDate: r.updatedAt, // Use updatedAt as proxy for invoice date if missing
        dueDate: r.dueDate,
        status: r.status,
      });
    });

    return invoiceRows;
  }

  async getPayrollEntries(
    tenantId: string,
    period?: string,
  ): Promise<PayrollEntry[]> {
    return this.financeRepository.listPayrollEntries(tenantId, period);
  }

  async estimatePayroll(
    tenantId: string,
    period: string,
  ): Promise<PayrollEstimate[]> {
    return this.financeRepository.estimatePayroll(tenantId, period);
  }

  async executePayrollRun(
    tenantId: string,
    period: string,
    userId: string,
  ): Promise<void> {
    await this.financeRepository.executePayrollRun(tenantId, period, userId);
    
    await this.auditService.log({
      tenantId,
      userId,
      module: "FINANCE",
      action: "CREATE",
      entityType: "PayrollRun",
      entityId: `PayrollPeriod-${period}`,
      metadata: { period },
    });
  }
}

