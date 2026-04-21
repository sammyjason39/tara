import { Injectable, Logger } from "@nestjs/common";
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
    private readonly financeRepository: IFinanceRepository,
    private readonly auditService: AuditService,
    private readonly fileProcessingService: FileProcessingService,
    private readonly prisma: PrismaService,
    private readonly csvBankProvider: CsvBankProvider,
    private readonly apiBankProvider: ModularApiBankProvider,
  ) {}

  // ... (existing methods remain unchanged)

  // Phase 5: Bank Reconciliation Orchestration
  async processBankStatement(
    tenant_id: string,
    source: 'CSV' | 'API',
    user_id: string,
    fileBuffer?: Buffer
  ): Promise<void> {
    const provider = source === 'CSV' ? this.csvBankProvider : this.apiBankProvider;
    this.logger.log(`[FinanceService] Processing statement from ${source} for tenant ${tenant_id}`);

    if (source === 'CSV' && !fileBuffer) {
      throw new Error('CSV file buffer is required for CSV ingestion');
    }

    const transactions = await provider.fetchStatements(tenant_id, { buffer: fileBuffer as any });
    
    if (transactions.length > 0) {
      const bankTxns = transactions.map(t => ({
        ...t,
        amount: new Prisma.Decimal(t.amount),
        status: 'UNRECONCILED' as any
      }));
      await this.financeRepository.ingestBankTransactions(tenant_id, bankTxns);
      await this.autoMatchBankTransactions(tenant_id);
    }

    await this.auditService.log({
      tenant_id,
      user_id,
      module: 'FINANCE',
      action: 'BANK_STATEMENT_PROCESSED',
      entity_type: 'BANK_ACCOUNT',
      entity_id: 'GLOBAL',
      metadata: { source, row_count: transactions.length }
    });
  }

  private async autoMatchBankTransactions(tenant_id: string): Promise<void> {
    const unreconciled = await this.financeRepository.getUnreconciledTransactions(tenant_id);
    const ledger = await this.financeRepository.getLedger(tenant_id);

    for (const stmt of unreconciled) {
      // Logic: Exact Amount + Date Proxy (within 3 days)
      const match = ledger.find(l => 
        l.amount.equals(stmt.amount) && 
        l.created_at &&
        Math.abs(new Date(l.created_at).getTime() - stmt.date.getTime()) < 259200000 // 3 days
      );

      if (match) {
        await this.financeRepository.createReconcileMatch(tenant_id, stmt.id, match.id, 0.95);
      }
    }
  }

  // Phase 5: Hierarchical Performance Dashboard (Multi-Level Roll-up)
  async getPerformanceDashboard(
    tenant_id: string,
    scope: 'TENANT' | 'BRANCH' | 'STORE' | 'ECOMMERCE',
    nodeId?: string
  ): Promise<PerformanceTreeNode> {
    this.logger.log(`[FinanceService] Calculating Performance Tree for ${scope}:${nodeId || 'ROOT'}`);
    
    // Recursive aggregation logic moved to Repository for DB-level performance
    const tree = await this.financeRepository.getPerformanceTree(tenant_id, nodeId, scope);
    
    return tree;
  }

  async finalizePayrollSettlement(
    tenant_id: string,
    runId: string,
    payload: any
  ): Promise<void> {
    this.logger.log(`[FinanceService] Finalizing Payroll Settlement for run ${runId}`);
    
    // Logic: Verify total gross matches expectations, then tag journal entries as 'FINALIZED'
    // in this phase, we just log the audit trail for security compliance
    await this.auditService.log({
      tenant_id,
      user_id: 'SYSTEM',
      module: 'FINANCE',
      action: 'PAYROLL_SETTLEMENT_FINALIZED',
      entity_type: 'PAYROLL_RUN',
      entity_id: runId,
      metadata: payload
    });
  }
}

