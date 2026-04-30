import { Injectable, Logger, Inject } from "@nestjs/common";
import { TenantContext } from "../../gateway/tenant-context.interface";
import { PrismaService } from "../../persistence/prisma.service";
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
  BankTransaction,
  PerformanceTreeNode,
} from "./finance.types";
import { AuditService } from "../../shared/audit/audit.service";
import { FileProcessingService } from "../../shared/file-processing/file-processing.service";
import { CsvBankProvider, ModularApiBankProvider } from "../../shared/finance/bank-providers";

@Injectable()
export class FinanceService {
  private readonly logger = new Logger(FinanceService.name);

  constructor(
    @Inject(IFinanceRepository)
    private readonly financeRepository: IFinanceRepository,
    private readonly auditService: AuditService,
    private readonly fileProcessingService: FileProcessingService,
    private readonly prisma: PrismaService,
    private readonly csvBankProvider: CsvBankProvider,
    private readonly apiBankProvider: ModularApiBankProvider,
  ) {}

  // Money Sources
  async getMoneySources(ctx: TenantContext) {
    return this.financeRepository.listMoneySources(ctx);
  }

  async getAlerts(ctx: TenantContext) {
    return this.financeRepository.getAlerts(ctx);
  }

  async getInbox(ctx: TenantContext) {
    // Inbox is a combination of unresolved alerts and pending payment requests
    const [alerts, payments] = await Promise.all([
      this.financeRepository.getAlerts(ctx),
      this.financeRepository.listPayments(ctx)
    ]);

    const pendingPayments = payments.filter(p => p.status === 'PENDING_APPROVAL');

    return {
      alerts,
      pendingPayments,
      totalCount: alerts.length + pendingPayments.length
    };
  }

  async listPayments(ctx: TenantContext) {
    return this.financeRepository.listPayments(ctx);
  }

  async updateMoneySource(ctx: TenantContext, id: string, updates: any) {
    this.logger.log(`[FinanceService] Updating money source ${id} for tenant ${ctx.tenant_id}`);
    const updated = await this.financeRepository.updateMoneySource(ctx, id, updates);
    
    await this.auditService.log({
      tenant_id: ctx.tenant_id,
      user_id: 'SYSTEM', // Should be from context if available
      module: 'FINANCE',
      action: 'MONEY_SOURCE_UPDATED',
      entity_type: 'MONEY_SOURCE',
      entity_id: id,
      metadata: updates
    });

    return updated;
  }

  // Phase 5: Bank Reconciliation Orchestration
  async processBankStatement(
    ctx: TenantContext,
    source: 'CSV' | 'API',
    user_id: string,
    fileBuffer?: Buffer
  ): Promise<void> {
    const provider = source === 'CSV' ? this.csvBankProvider : this.apiBankProvider;
    this.logger.log(`[FinanceService] Processing statement from ${source} for tenant ${ctx.tenant_id}`);

    if (source === 'CSV' && !fileBuffer) {
      throw new Error('CSV file buffer is required for CSV ingestion');
    }

    const transactions = await provider.fetchStatements(ctx.tenant_id, { buffer: fileBuffer as any });
    
    if (transactions.length > 0) {
      const bankTxns = transactions.map(t => ({
        ...t,
        amount: new Prisma.Decimal(t.amount),
        status: 'UNRECONCILED' as any
      }));
      await this.financeRepository.ingestBankTransactions(ctx, bankTxns);
      await this.autoMatchBankTransactions(ctx);
    }

    await this.auditService.log({
      tenant_id: ctx.tenant_id,
      user_id,
      module: 'FINANCE',
      action: 'BANK_STATEMENT_PROCESSED',
      entity_type: 'BANK_ACCOUNT',
      entity_id: 'GLOBAL',
      metadata: { source, row_count: transactions.length }
    });
  }

  private async autoMatchBankTransactions(ctx: TenantContext): Promise<void> {
    const unreconciled = await this.financeRepository.getUnreconciledTransactions(ctx);
    const ledger = await this.financeRepository.getLedger(ctx);

    for (const stmt of unreconciled) {
      // Logic: Exact Amount + Date Proxy (within 3 days)
      const match = ledger.find(l => 
        l.amount.equals(stmt.amount) && 
        l.created_at &&
        Math.abs(new Date(l.created_at).getTime() - stmt.date.getTime()) < 259200000 // 3 days
      );

      if (match) {
        await this.financeRepository.createReconcileMatch(ctx, stmt.id, match.id, 0.95);
      }
    }
  }

  // Phase 5: Hierarchical Performance Dashboard (Multi-Level Roll-up)
  async getPerformanceDashboard(
    ctx: TenantContext,
    scope: 'TENANT' | 'BRANCH' | 'STORE' | 'ECOMMERCE',
    nodeId?: string
  ): Promise<PerformanceTreeNode> {
    this.logger.log(`[FinanceService] Calculating Performance Tree for ${scope}:${nodeId || 'ROOT'}`);
    
    // Recursive aggregation logic moved to Repository for DB-level performance
    const tree = await this.financeRepository.getPerformanceTree(ctx, nodeId, scope);
    
    return tree;
  }

  async finalizePayrollSettlement(
    ctx: TenantContext,
    runId: string,
    payload: any
  ): Promise<void> {
    this.logger.log(`[FinanceService] Finalizing Payroll Settlement for run ${runId}`);
    
    // Logic: Verify total gross matches expectations, then tag journal entries as 'FINALIZED'
    // in this phase, we just log the audit trail for security compliance
    await this.auditService.log({
      tenant_id: ctx.tenant_id,
      user_id: 'SYSTEM',
      module: 'FINANCE',
      action: 'PAYROLL_SETTLEMENT_FINALIZED',
      entity_type: 'PAYROLL_RUN',
      entity_id: runId,
      metadata: payload
    });
  }
}

