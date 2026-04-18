import { Injectable, Inject, Logger } from '@nestjs/common';
import { IJournalRepository } from '../repositories/interfaces/journal.repository.interface';
import { IAccountBalanceRepository } from '../repositories/interfaces/account-balance.repository.interface';
import { ITrialBalanceProjectionRepository } from '../repositories/interfaces/trial-balance-projection.repository.interface';
import { IGeneralLedgerProjectionRepository } from '../repositories/interfaces/general-ledger-projection.repository.interface';
import { IAccountStatementProjectionRepository } from '../repositories/interfaces/account-statement-projection.repository.interface';
import { ILedgerProjectionCheckpointRepository } from '../repositories/interfaces/ledger-projection-checkpoint.repository.interface';
import { IFinancialSnapshotRepository } from '../repositories/interfaces/financial-snapshot.repository.interface';
import { IChartOfAccountRepository } from '../repositories/interfaces/coa.repository.interface';
import { PostingSide } from '../domain/finance.constants';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProjectionRebuildService {
  private readonly logger = new Logger(ProjectionRebuildService.name);
  private readonly BATCH_SIZE = 1000;

  constructor(
    @Inject('IJournalRepository')
    private readonly journalRepo: IJournalRepository,
    @Inject('IAccountBalanceRepository')
    private readonly balanceRepo: IAccountBalanceRepository,
    @Inject('ITrialBalanceProjectionRepository')
    private readonly trialBalanceRepo: ITrialBalanceProjectionRepository,
    @Inject('IGeneralLedgerProjectionRepository')
    private readonly glRepo: IGeneralLedgerProjectionRepository,
    @Inject('IAccountStatementProjectionRepository')
    private readonly statementRepo: IAccountStatementProjectionRepository,
    @Inject('ILedgerProjectionCheckpointRepository')
    private readonly checkpointRepo: ILedgerProjectionCheckpointRepository,
    @Inject('IFinancialSnapshotRepository')
    private readonly snapshotRepo: IFinancialSnapshotRepository,
    @Inject('IChartOfAccountRepository')
    private readonly coaRepo: IChartOfAccountRepository,
  ) {}

  async rebuildProjections(tenant_id: string, company_id: string): Promise<void> {
    this.logger.log(`Starting projection rebuild for tenant ${tenant_id}, company ${company_id}...`);

    // 1. Reset all projection tables
    await Promise.all([
      this.balanceRepo.reset(tenant_id, company_id),
      this.trialBalanceRepo.reset(tenant_id, company_id),
      this.glRepo.reset(tenant_id, company_id),
      this.statementRepo.reset(tenant_id, company_id),
      this.checkpointRepo.reset(tenant_id, company_id),
    ]);

    let fromSeq = 1;
    let totalJournals = 0;

    // 2. Check for latest snapshot for hydration acceleration
    const latestSnapshot = await this.snapshotRepo.findLatest(tenant_id, company_id);
    if (latestSnapshot && latestSnapshot.compressedTrialBalanceState) {
      this.logger.log(`Found snapshot at sequence ${latestSnapshot.snapshotSequence}. Hydrating Trial Balance...`);
      
      try {
        const tbState = JSON.parse(latestSnapshot.compressedTrialBalanceState);
        for (const accountState of tbState) {
          await this.trialBalanceRepo.update(
            tenant_id, 
            company_id,
            accountState.accountId, 
            accountState.fiscalPeriodId, // Should be in snapshot state
            accountState.accountCategory,
            accountState.debitTotal, 
            accountState.creditTotal
          );
        }
        
        fromSeq = (latestSnapshot.snapshotSequence || 0) + 1;
        await this.checkpointRepo.upsert(tenant_id, company_id, 'ALL_PROJECTIONS', latestSnapshot.snapshotSequence || 0);
        this.logger.log(`Hydration complete. Replaying journals from sequence ${fromSeq}...`);
      } catch (err) {
        this.logger.error(`Failed to hydrate from snapshot: ${err.message}. Falling back to full rebuild.`);
        fromSeq = 1;
      }
    }

    // 3. Streaming Batch Processing (Fast-Forward)
    while (true) {
      const journals = await this.journalRepo.findBySequenceRange(tenant_id, company_id, fromSeq, fromSeq + this.BATCH_SIZE - 1);
      
      if (journals.length === 0) break;

      // Ensure journals are processed in strict order
      const orderedJournals = journals.sort((a, b) => (a.ledgerSequence || 0) - (b.ledgerSequence || 0));

      for (const journal of orderedJournals) {
        const lines = await this.journalRepo.findLines(journal.id);
        
        for (const line of lines) {
          // Update AccountBalance (Logical Source of Truth for Real-time)
          const balanceParams = {
            fiscalPeriodId: journal.fiscalPeriodId,
            accountId: line.accountId,
            currency: line.currency,
            branch_id: line.dimensionBranchId || line.branch_id || '',
            location_id: line.location_id || '',
            departmentId: line.dimensionDepartmentId || line.departmentId,
            costCenterId: line.dimensionCostCenterId || line.costCenterId,
            projectId: line.dimensionProjectId || line.projectId,
          };

          const isDebit = line.side === PostingSide.DEBIT;
          const isCredit = line.side === PostingSide.CREDIT;
          const amount = new Prisma.Decimal(line.amount);
          
          const currency = line.currency || 'USD';
          
          // Area 1: Atomic increment for rebuild precision
          await this.balanceRepo.incrementBalance(tenant_id, company_id, balanceParams, {
            debit: isDebit ? amount : undefined,
            credit: isCredit ? amount : undefined,
            net: isDebit ? amount : amount.negated(),
          });

          // Fetch category
          const acc = await this.coaRepo.findById(tenant_id, company_id, line.accountId);
          const category = acc?.accountType || 'UNKNOWN';

          // Update Trial Balance Projection
          await this.trialBalanceRepo.update(
            tenant_id, 
            company_id,
            line.accountId, 
            journal.fiscalPeriodId,
            category,
            isDebit ? amount : new Prisma.Decimal(0),
            isCredit ? amount : new Prisma.Decimal(0)
          );

          // Update General Ledger Projection (Incremental Running Balance & Dimensions)
          const latestRunningBal = await this.glRepo.getLatestRunningBalance(tenant_id, company_id, line.accountId);
          const newRunningBal = latestRunningBal.plus(isDebit ? amount : amount.negated());
          
          await this.glRepo.append({
            tenant_id,
            company_id,
            accountId: line.accountId,
            journalId: journal.id,
            ledgerSequence: journal.ledgerSequence,
            debit: isDebit ? amount : new Prisma.Decimal(0),
            credit: isCredit ? amount : new Prisma.Decimal(0),
            runningBalance: newRunningBal,
            dimensionCostCenterId: line.dimensionCostCenterId,
            dimensionDepartmentId: line.dimensionDepartmentId,
            dimensionProjectId: line.dimensionProjectId,
          });

          // Update Account Statement Projection (with Dimensions)
          await this.statementRepo.append({
            tenant_id,
            company_id,
            accountId: line.accountId,
            ledgerSequence: journal.ledgerSequence,
            journalId: journal.id,
            description: `Rebuild: ${journal.id}`,
            debit: isDebit ? amount : new Prisma.Decimal(0),
            credit: isCredit ? amount : new Prisma.Decimal(0),
            balance: newRunningBal,
            dimensionCostCenterId: line.dimensionCostCenterId,
            dimensionDepartmentId: line.dimensionDepartmentId,
            dimensionProjectId: line.dimensionProjectId,
          });
        }
        
        totalJournals++;
        await this.checkpointRepo.upsert(tenant_id, company_id, 'ALL_PROJECTIONS', journal.ledgerSequence);
      }

      fromSeq += this.BATCH_SIZE;
      this.logger.log(`Processed ${totalJournals} journals since start/snapshot for tenant ${tenant_id}...`);
    }

    this.logger.log(`Projection rebuild completed for tenant ${tenant_id}. Total journals processed in this run: ${totalJournals}`);
  }
}
