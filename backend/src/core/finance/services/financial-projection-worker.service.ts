import { Injectable, Inject, Logger } from '@nestjs/common';
import { JournalPostedEvent } from '../domain/finance.interfaces';
import { PostingSide } from '../domain/finance.constants';
import { ITrialBalanceProjectionRepository } from '../repositories/interfaces/trial-balance-projection.repository.interface';
import { IGeneralLedgerProjectionRepository } from '../repositories/interfaces/general-ledger-projection.repository.interface';
import { IAccountStatementProjectionRepository } from '../repositories/interfaces/account-statement-projection.repository.interface';
import { ILedgerProjectionCheckpointRepository } from '../repositories/interfaces/ledger-projection-checkpoint.repository.interface';
import { IJournalRepository } from '../repositories/interfaces/journal.repository.interface';
import { IChartOfAccountRepository } from '../repositories/interfaces/coa.repository.interface';
import { Prisma } from '@prisma/client';

@Injectable()
export class FinancialProjectionWorkerService {
  private readonly logger = new Logger(FinancialProjectionWorkerService.name);

  constructor(
    @Inject('ITrialBalanceProjectionRepository')
    private readonly trialBalanceRepo: ITrialBalanceProjectionRepository,
    @Inject('IGeneralLedgerProjectionRepository')
    private readonly glRepo: IGeneralLedgerProjectionRepository,
    @Inject('IAccountStatementProjectionRepository')
    private readonly statementRepo: IAccountStatementProjectionRepository,
    @Inject('ILedgerProjectionCheckpointRepository')
    private readonly checkpointRepo: ILedgerProjectionCheckpointRepository,
    @Inject('IJournalRepository')
    private readonly journalRepo: IJournalRepository,
    @Inject('IChartOfAccountRepository')
    private readonly coaRepo: IChartOfAccountRepository,
  ) {}

  /**
   * Idempotent projection update triggered by events.
   * Ensures exactly-once processing via ledgerSequence checkpoints.
   */
  async onJournalPosted(event: JournalPostedEvent): Promise<void> {
    const { tenant_id, company_id } = event;
    await this.processPendingProjections(tenant_id, company_id);
  }

  /**
   * Strictly ordered batch processing of pending projections.
   */
  async processPendingProjections(tenant_id: string, company_id: string): Promise<void> {
    const batchSize = 500;
    
    while (true) {
      // 1. Get current checkpoint
      const lastSequence = await this.checkpointRepo.getCheckpoint(tenant_id, company_id, 'ALL_PROJECTIONS');
      
      // 2. Fetch next batch of journals in strict order
      const batch = await this.journalRepo.findBySequenceRange(tenant_id, company_id, lastSequence + 1, lastSequence + batchSize);
      
      if (batch.length === 0) {
        break; // No more journals to process
      }

      // Ensure batch is sorted ASC by ledgerSequence
      const orderedBatch = batch.sort((a, b) => (a.ledgerSequence || 0) - (b.ledgerSequence || 0));

      // Cache categories for this batch to minimize COA lookups
      const categoryCache: Map<string, string> = new Map();

      for (const journal of orderedBatch) {
        const lines = await this.journalRepo.findLines(journal.id);
        
        // Process lines sequentially for this journal
        for (const line of lines) {
          const isDebit = line.side === PostingSide.DEBIT;
          const isCredit = line.side === PostingSide.CREDIT;
          const amount = new Prisma.Decimal(line.amount);

          // Fetch category if not in cache
          if (!categoryCache.has(line.accountId)) {
            const acc = await this.coaRepo.findById(tenant_id, company_id, line.accountId);
            categoryCache.set(line.accountId, acc?.accountType || 'UNKNOWN');
          }
          const category = categoryCache.get(line.accountId)!;

          // a. Trial Balance (Period & Category aware)
          await this.trialBalanceRepo.update(
            tenant_id,
            company_id,
            line.accountId, 
            journal.fiscalPeriodId,
            category,
            isDebit ? amount : new Prisma.Decimal(0),
            isCredit ? amount : new Prisma.Decimal(0)
          );

          // b. General Ledger (with Running Balance & Dimensions)
          const latestRunningBal = await this.glRepo.getLatestRunningBalance(tenant_id, company_id, line.accountId);
          const newRunningBal = isDebit 
            ? latestRunningBal.plus(amount) 
            : latestRunningBal.minus(amount);
          
          await this.glRepo.append({
            tenant_id,
            company_id,
            accountId: line.accountId,
            journalId: journal.id,
            ledgerSequence: journal.ledgerSequence,
            debit: isDebit ? amount : new Prisma.Decimal(0),
            credit: isCredit ? amount : new Prisma.Decimal(0),
            runningBalance: newRunningBal,
            dimensionBranchId: line.dimensionBranchId,
            dimensionChannelId: line.dimensionChannelId,
            dimensionCostCenterId: line.dimensionCostCenterId,
            dimensionDepartmentId: line.dimensionDepartmentId,
            dimensionProjectId: line.dimensionProjectId,
          });

          // c. Account Statement (with Dimensions)
          await this.statementRepo.append({
            tenant_id,
            company_id,
            accountId: line.accountId,
            ledgerSequence: journal.ledgerSequence,
            journalId: journal.id,
            description: `Posted: ${journal.id}`,
            debit: isDebit ? amount : new Prisma.Decimal(0),
            credit: isCredit ? amount : new Prisma.Decimal(0),
            balance: newRunningBal,
            dimensionBranchId: line.dimensionBranchId,
            dimensionChannelId: line.dimensionChannelId,
            dimensionCostCenterId: line.dimensionCostCenterId,
            dimensionDepartmentId: line.dimensionDepartmentId,
            dimensionProjectId: line.dimensionProjectId,
          });
        }

        // 3. Mark Checkpoint after each journal in the batch is fully processed
        await this.checkpointRepo.upsert(tenant_id, company_id, 'ALL_PROJECTIONS', journal.ledgerSequence);
        this.logger.debug(`Projections updated for journal ${journal.id} (seq: ${journal.ledgerSequence}) in Company ${company_id}`);
      }

      this.logger.log(`Processed batch of ${orderedBatch.length} journals for Tenant ${tenant_id} Company ${company_id}`);
      
      if (orderedBatch.length < batchSize) {
        break; // Batch was not full, we caught up
      }
    }
  }
}
