import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
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
    tenant_id: string,
    location_id?: string,
  ): Promise<LedgerEntry[]> {
    return this.financeRepository.getLedger(tenant_id, location_id);
  }

  async createTransaction(
    tenant_id: string,
    data: CreateTransactionDto,
    user_id: string,
  ): Promise<Transaction> {
    const transaction = await this.financeRepository.createTransaction(
      tenant_id,
      data,
    );
    await this.auditService.log({
      tenant_id,
      user_id,
      module: "finance",
      action: "CREATE",
      entity_type: "TRANSACTION",
      entity_id: transaction.id,
      metadata: {
        amount: data.amount,
        type: data.type,
        description: data.description,
      },
    });
    return transaction;
  }

  async createJournal(
    tenant_id: string,
    data: CreateJournalDto,
    user_id: string,
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
        tenant_id,
        data,
      );

      /*
      await this.auditService.log({
        tenant_id,
        user_id,
        module: "finance",
        action: "CREATE",
        entity_type: "JOURNAL_ENTRY",
        entity_id: (journal as any).id,
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
    tenant_id: string,
    buffer: Buffer,
    fileType: "csv" | "xlsx",
    user_id: string,
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
      await this.createTransaction(tenant_id, transactionData, user_id);
      importedCount++;
    }

    return { imported: importedCount, errors: [] };
  }

  /**
   * Export General Ledger to Excel
   */
  async exportLedger(tenant_id: string, user_id: string): Promise<Buffer> {
    const ledger = await this.getLedger(tenant_id);

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
      traceId: `FIN-${tenant_id}-${user_id}-${Date.now()}`,
      watermark: { text: "ZENVIX INTERNAL" },
    });
  }

  async getBalance(tenant_id: string): Promise<Balance> {
    return this.financeRepository.getBalance(tenant_id);
  }

  async getTransactionById(
    tenant_id: string,
    transaction_id: string,
  ): Promise<Transaction | null> {
    return this.financeRepository.getTransactionById(tenant_id, transaction_id);
  }

  // Assets
  async listAssets(tenant_id: string): Promise<Asset[]> {
    return this.financeRepository.listAssets(tenant_id);
  }

  async createAsset(
    tenant_id: string,
    asset: Partial<Asset>,
    user_id: string,
  ): Promise<Asset> {
    const created = await this.financeRepository.createAsset(tenant_id, asset);
    await this.auditService.log({
      tenant_id,
      user_id,
      module: "FINANCE",
      action: "CREATE_ASSET",
      entity_type: "FIXED_ASSET",
      entity_id: created.id,
      metadata: { description: created.description },
    });
    return created;
  }

  async updateAssetStatus(
    tenant_id: string,
    id: string,
    status: string,
    user_id: string,
  ): Promise<Asset | null> {
    const updated = await this.financeRepository.updateAsset(tenant_id, id, {
      status: status as any,
    });
    if (updated) {
      await this.auditService.log({
        tenant_id,
        user_id,
        module: "FINANCE",
        action: "UPDATE_ASSET_STATUS",
        entity_type: "FIXED_ASSET",
        entity_id: id,
        changes: { status },
      });
    }
    return updated;
  }

  async capitalizeAsset(
    tenant_id: string,
    assetId: string,
    capitalizationDate: string,
    user_id: string,
  ): Promise<Asset | null> {
    const updated = await this.financeRepository.updateAsset(
      tenant_id,
      assetId,
      {
        status: "ACTIVE",
        acquisitionDate: new Date(capitalizationDate),
      },
    );
    if (updated) {
      await this.auditService.log({
        tenant_id,
        user_id,
        module: "FINANCE",
        action: "CAPITALIZE_ASSET",
        entity_type: "FIXED_ASSET",
        entity_id: assetId,
        changes: { status: "ACTIVE", capitalizationDate },
      });
    }
    return updated;
  }

  // Capex
  async listCapexRequests(tenant_id: string): Promise<CapexRequest[]> {
    return this.financeRepository.listCapexRequests(tenant_id);
  }

  async createCapexRequest(
    tenant_id: string,
    request: Partial<CapexRequest>,
    user_id: string,
  ): Promise<CapexRequest> {
    const created = await this.financeRepository.createCapexRequest(
      tenant_id,
      request,
    );
    await this.auditService.log({
      tenant_id,
      user_id,
      module: "FINANCE",
      action: "CREATE_CAPEX_REQUEST",
      entity_type: "CAPEX_REQUEST",
      entity_id: created.id,
      metadata: { amount: created.requestedAmount },
    });
    return created;
  }

  async listCapexBudgets(tenant_id: string): Promise<FinanceCapexBudgetRow[]> {
    return this.financeRepository.listCapexBudgets(tenant_id);
  }

  async setCapexBudget(
    tenant_id: string,
    budget: FinanceCapexBudgetRow,
  ): Promise<void> {
    return this.financeRepository.setCapexBudget(tenant_id, budget);
  }

  async approveCapexRequest(
    tenant_id: string,
    id: string,
    user_id: string,
  ): Promise<CapexRequest | null> {
    const updated = await this.financeRepository.updateCapexRequest(
      tenant_id,
      id,
      {
        status: "APPROVED",
      },
    );
    if (updated) {
      await this.auditService.log({
        tenant_id,
        user_id,
        module: "FINANCE",
        action: "APPROVE_CAPEX_REQUEST",
        entity_type: "CAPEX_REQUEST",
        entity_id: id,
        changes: { status: "APPROVED" },
      });
    }
    return updated;
  }

  async rejectCapexRequest(
    tenant_id: string,
    id: string,
    user_id: string,
  ): Promise<CapexRequest | null> {
    const updated = await this.financeRepository.updateCapexRequest(
      tenant_id,
      id,
      {
        status: "REJECTED",
      },
    );
    if (updated) {
      await this.auditService.log({
        tenant_id,
        user_id,
        module: "FINANCE",
        action: "REJECT_CAPEX_REQUEST",
        entity_type: "CAPEX_REQUEST",
        entity_id: id,
        changes: { status: "REJECTED" },
      });
    }
    return updated;
  }

  // Depreciation
  async listAssetDepreciationEntries(
    tenant_id: string,
    assetId?: string,
  ): Promise<AssetDepreciationEntry[]> {
    return this.financeRepository.listAssetDepreciationEntries(
      tenant_id,
      assetId,
    );
  }

  async createDepreciationEntry(
    tenant_id: string,
    entry: Partial<AssetDepreciationEntry>,
  ): Promise<AssetDepreciationEntry> {
    return this.financeRepository.createDepreciationEntry(tenant_id, entry);
  }

  async runScheduledPeriodDepreciation(
    tenant_id: string,
    periodStart: string,
    periodEnd: string,
  ): Promise<any> {
    // Mock logic: just create one entry for first asset
    const assets = await this.listAssets(tenant_id);
    if (assets.length > 0) {
      await this.createDepreciationEntry(tenant_id, {
        assetId: assets[0].id,
        amount: new Prisma.Decimal(100),
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
    tenant_id: string,
    assetId?: string,
  ): Promise<AssetEvent[]> {
    return this.financeRepository.listAssetEvents(tenant_id, assetId);
  }

  async createAssetEvent(
    tenant_id: string,
    event: Partial<AssetEvent>,
  ): Promise<AssetEvent> {
    return this.financeRepository.createAssetEvent(tenant_id, event);
  }

  async getAssetAuditPack(
    tenant_id: string,
    assetId: string,
  ): Promise<AssetAuditPack> {
    return this.financeRepository.getAssetAuditPack(tenant_id, assetId);
  }

  // Receivables
  async listReceivables(tenant_id: string): Promise<FinanceReceivableRow[]> {
    return this.financeRepository.listReceivables(tenant_id);
  }

  async createReceivable(
    tenant_id: string,
    invoice: Partial<ReceivableInvoice>,
  ): Promise<ReceivableInvoice> {
    return this.financeRepository.createReceivable(tenant_id, invoice);
  }

  async markReceivableReceived(tenant_id: string, id: string): Promise<void> {
    await this.financeRepository.updateReceivable(tenant_id, id, {
      status: "PAID",
    });
  }

  async sendReceivableReminder(tenant_id: string, id: string): Promise<void> {
    // Mock email sending
    console.log(`Sending reminder for invoice ${id}`);
  }

  // Payables
  async listPayables(tenant_id: string): Promise<FinancePayableRow[]> {
    return this.financeRepository.listPayables(tenant_id);
  }

  async createPayable(
    tenant_id: string,
    bill: Partial<PayableBill>,
  ): Promise<PayableBill> {
    return this.financeRepository.createPayable(tenant_id, bill);
  }

  async approvePayable(
    tenant_id: string,
    id: string,
  ): Promise<PayableBill | null> {
    return this.financeRepository.updatePayable(tenant_id, id, {
      status: "APPROVED",
    });
  }

  async markPayablePaid(tenant_id: string, id: string): Promise<void> {
    await this.financeRepository.updatePayable(tenant_id, id, {
      status: "PAID",
    });
  }

  // Money Sources
  async getMoneySources(tenant_id: string) {
    return this.financeRepository.listMoneySources(tenant_id);
  }

  // Treasury
  async listTransfers(tenant_id: string): Promise<any[]> {
    return this.financeRepository.listTransfers(tenant_id);
  }

  async createTransfer(
    tenant_id: string,
    data: any,
    user_id: string,
  ): Promise<any> {
    const created = await this.financeRepository.createTransfer(tenant_id, data);
    await this.auditService.log({
      tenant_id,
      user_id,
      module: "FINANCE",
      action: "CREATE_TREASURY_TRANSFER",
      entity_type: "TREASURY_TRANSFER",
      entity_id: created.id,
      metadata: {
        from: created.fromSourceId,
        to: created.toSourceId,
        amount: created.amount,
      },
    });
    return created;
  }

  async reconcileSettlement(
    tenant_id: string,
    sourceId: string,
    amount: number,
    user_id: string,
  ): Promise<void> {
    await this.financeRepository.reconcileSettlement(
      tenant_id,
      sourceId,
      amount,
    );
    await this.auditService.log({
      tenant_id,
      user_id,
      module: "FINANCE",
      action: "RECONCILE_SETTLEMENT",
      entity_type: "MONEY_SOURCE",
      entity_id: sourceId,
      metadata: { amount },
    });
  }

  // Payments
  async listPayments(tenant_id: string): Promise<FinancePaymentRow[]> {
    return this.financeRepository.listPayments(tenant_id);
  }

  async createPaymentRequest(
    tenant_id: string,
    request: Partial<PaymentRequest>,
    user_id: string,
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
      tenant_id,
      request,
    );

    await this.auditService.log({
      tenant_id,
      user_id,
      module: "FINANCE",
      action: "CREATE_PAYMENT_REQUEST",
      entity_type: "PAYMENT_TRANSACTION",
      entity_id: created.id,
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
    tenant_id: string,
    id: string,
    status: string,
  ): Promise<void> {
    return this.financeRepository.updatePaymentStatus(tenant_id, id, status);
  }

  // Documents
  async listDocuments(tenant_id: string): Promise<FinanceDocumentRow[]> {
    return this.financeRepository.listDocuments(tenant_id);
  }

  async createDocument(
    tenant_id: string,
    doc: Partial<FinanceDocumentRow>,
  ): Promise<FinanceDocumentRow> {
    return this.financeRepository.createDocument(tenant_id, doc);
  }

  // Policies
  async listPolicies(tenant_id: string): Promise<FinancePolicyRow[]> {
    return this.financeRepository.listPolicies(tenant_id);
  }

  async listPeriods(tenant_id: string): Promise<AccountingPeriod[]> {
    return this.financeRepository.listPeriods(tenant_id);
  }

  // Insights
  async getInsights(tenant_id: string): Promise<FinanceInsight[]> {
    return this.financeRepository.getInsights(tenant_id);
  }

  async getAlerts(tenant_id: string): Promise<FinanceAlert[]> {
    return this.financeRepository.getAlerts(tenant_id);
  }

  // Aggregated Views
  async listInvoices(tenant_id: string): Promise<any[]> {
    const [payables, receivables] = await Promise.all([
      this.listPayables(tenant_id),
      this.listReceivables(tenant_id),
    ]);

    const invoiceRows: any[] = [];

    // Map payables to common invoice format
    payables.forEach((p) => {
      invoiceRows.push({
        id: p.id,
        kind: "PAYABLE",
        vendor: p.vendorName,
        amount: p.amount,
        invoiceDate: p.updated_at, // Use updated_at as proxy for invoice date if missing
        dueDate: p.dueDate,
        status: p.status,
      });
    });

    // Map receivables to common invoice format
    receivables.forEach((r: any) => {
      invoiceRows.push({
        id: r.id,
        kind: "RECEIVABLE",
        vendor: r.customerName,
        amount: r.amount,
        invoiceDate: r.updated_at, // Use updated_at as proxy for invoice date if missing
        dueDate: r.dueDate,
        status: r.status,
      });
    });

    return invoiceRows;
  }

  async getPayrollEntries(
    tenant_id: string,
    period?: string,
  ): Promise<PayrollEntry[]> {
    return this.financeRepository.listPayrollEntries(tenant_id, period);
  }

  async estimatePayroll(
    tenant_id: string,
    period: string,
  ): Promise<PayrollEstimate[]> {
    return this.financeRepository.estimatePayroll(tenant_id, period);
  }

  async executePayrollRun(
    tenant_id: string,
    period: string,
    user_id: string,
  ): Promise<void> {
    await this.financeRepository.executePayrollRun(tenant_id, period, user_id);
    
    await this.auditService.log({
      tenant_id,
      user_id,
      module: "FINANCE",
      action: "CREATE",
      entity_type: "PayrollRun",
      entity_id: `PayrollPeriod-${period}`,
      metadata: { period },
    });
  }
}

