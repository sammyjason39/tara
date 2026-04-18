import { Injectable, Logger, Inject } from '@nestjs/common';
import { AuditService } from '../../../shared/audit/audit.service';
import { ReconciliationService } from './reconciliation.service';
import * as crypto from 'crypto';
// import { Cron, CronExpression } from '@nestjs/schedule'; // Package not installed in Phase 2.5.2
const Cron = (time: any) => (target: any, key: string, descriptor: any) => descriptor;
const CronExpression = { EVERY_HOUR: '0 0 * * * *' };
import { IJournalRepository } from '../repositories/interfaces/journal.repository.interface';
import { IAccountBalanceRepository } from '../repositories/interfaces/account-balance.repository.interface';
import { ILedgerPostingRepository } from '../repositories/interfaces/ledger-posting.repository.interface';
import { IUnitOfWork } from '../repositories/interfaces/uow.interface';
import { PostingMonitoringService } from './posting-monitoring.service';
import { PostingContextFactory } from '../domain/posting-context-factory';
import { HashingService } from '../utils/hashing.service';
import { PostingSide } from '../domain/finance.constants';
import { Prisma } from '@prisma/client';

@Injectable()
export class LedgerIntegrityService {
  private readonly logger = new Logger(LedgerIntegrityService.name);
  private readonly defaultTenantId = 'tenant_1';

  constructor(
    @Inject('IJournalRepository')
    private readonly journalRepo: IJournalRepository,
    @Inject('IAccountBalanceRepository')
    private readonly balanceRepo: IAccountBalanceRepository,
    @Inject('ILedgerPostingRepository')
    private readonly ledgerRepo: ILedgerPostingRepository,
    private readonly auditService: AuditService,
    private readonly reconService: ReconciliationService,
    @Inject('IUnitOfWork')
    private readonly uow: IUnitOfWork,
    private readonly monitor: PostingMonitoringService,
    private readonly hashingService: HashingService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async runIntegrityAudits(tenant_id: string = this.defaultTenantId, company_id?: string) {
    this.logger.log(`Starting background Ledger Integrity Audits for Tenant ${tenant_id}${company_id ? ` Company ${company_id}` : ''}...`);
    
    const companies = company_id ? [company_id] : ['company_1']; 

    for (const cid of companies) {
      await this.checkTrialBalanceIntegrity(tenant_id, cid);
      await this.checkBalanceProjectionIntegrity(tenant_id, cid);
      await this.checkSequenceIntegrity(tenant_id, cid);
      await this.verifyJournalHashChain(tenant_id, cid);
      await this.storeDailyHashAnchor(tenant_id, cid);
    }
    
    this.logger.log('Ledger Integrity Audits completed.');
  }

  /**
   * 1. Trial Balance Check: SUM(Debits) must equal SUM(Credits)
   */
  private async checkTrialBalanceIntegrity(tenant_id: string, company_id: string) {
    this.logger.debug(`[Integrity] Checking Trial Balance for Tenant ${tenant_id} Company ${company_id}`);
    
    const journals = await this.journalRepo.findAllOrderedByDate(tenant_id, company_id);
    let totalDebit = new Prisma.Decimal(0);
    let totalCredit = new Prisma.Decimal(0);

    for (const journal of journals) {
      const lines = await this.journalRepo.findLines(journal.id);
      for (const line of lines) {
        if (line.side === PostingSide.DEBIT) totalDebit = totalDebit.plus(line.amount);
        else totalCredit = totalCredit.plus(line.amount);
      }
    }

    if (!totalDebit.equals(totalCredit)) {
      await this.reportViolation(
        tenant_id, 
        company_id, 
        'TRIAL_BALANCE_MISMATCH', 
        `Total Debits (${totalDebit.toString()}) do not equal Total Credits (${totalCredit.toString()})`
      );
    }
  }

  /**
   * 2. Balance Projection Check: AccountBalance.netBalance == SUM(JournalLines)
   * Area 2: Uses rolling reconciliation for scalability.
   */
  private async checkBalanceProjectionIntegrity(tenant_id: string, company_id: string) {
    this.logger.debug(`[Integrity] Checking Balance Projection for Tenant ${tenant_id} Company ${company_id}`);
    
    // In mock, we check a few key accounts or all in a period
    // Real implementation would iterate through all active AccountBalance records
    const journals = await this.journalRepo.findAllOrderedByDate(tenant_id, company_id);
    if (journals.length === 0) return;

    const fiscalPeriodId = journals[journals.length - 1].fiscalPeriodId;
    
    // Example: verify first account found in journals
    const firstLine = (await this.journalRepo.findLines(journals[0].id))[0];
    if (firstLine) {
      const currency = firstLine.currency || 'USD';
      const report = await this.reconService.verifyAccountConsistencyRolling(
        tenant_id, 
        company_id, 
        fiscalPeriodId, 
        firstLine.accountId,
        currency,
        { branch_id: firstLine.dimensionBranchId || firstLine.branch_id || '', location_id: firstLine.location_id || '' }
      );

      if (report.status === 'MISMATCH') {
        // Area 3: Self-Healing Trigger
        await this.autoRepairBalance(
          tenant_id, 
          company_id, 
          fiscalPeriodId, 
          firstLine.accountId, 
          currency,
          { branch_id: firstLine.dimensionBranchId || firstLine.branch_id || '', location_id: firstLine.location_id || '' }
        );
      }
    }
  }

  /**
   * Area 3: Self-Healing Strategy
   * Automatically repairs a drifted account balance by recalculating it from the ledger.
   */
  async autoRepairBalance(
    tenant_id: string,
    company_id: string,
    fiscalPeriodId: string,
    accountId: string,
    currency: string,
    dimensions: any
  ): Promise<boolean> {
    this.logger.warn(`[Self-Healing] Attempting auto-repair for Account ${accountId} (Company: ${company_id})...`);

    // 1. Recalculate true balance from ledger (Full scan required for authoritative repair)
    const journals = await this.journalRepo.findAllOrderedByDate(tenant_id, company_id);
    let trueNet = new Prisma.Decimal(0);
    let trueDebit = new Prisma.Decimal(0);
    let trueCredit = new Prisma.Decimal(0);

    for (const journal of journals) {
      if (journal.fiscalPeriodId !== fiscalPeriodId) continue;
      const lines = await this.journalRepo.findLines(journal.id);
      const relevantLines = lines.filter(l => 
        l.accountId === accountId &&
        l.currency === currency &&
        (l.dimensionBranchId || l.branch_id || '') === dimensions.branch_id &&
        (l.location_id || '') === dimensions.location_id &&
        l.dimensionDepartmentId === dimensions.departmentId &&
        l.dimensionCostCenterId === dimensions.costCenterId &&
        l.dimensionProjectId === dimensions.projectId
      );

      for (const line of relevantLines) {
        if (line.side === PostingSide.DEBIT) {
          trueDebit = trueDebit.plus(line.amount);
          trueNet = trueNet.plus(line.amount);
        } else {
          trueCredit = trueCredit.plus(line.amount);
          trueNet = trueNet.minus(line.amount);
        }
      }
    }

    // 1.5. Find original balance for audit
    const original = await this.balanceRepo.findBalance({
      tenant_id, company_id, fiscalPeriodId, accountId, currency, ...dimensions
    });
    const originalNet = original?.netBalance || new Prisma.Decimal(0);
    const delta = trueNet.minus(originalNet);

    // 2. Force-update the balance record and create audit journal
    try {
      // Create Journal Adjustment for Auditability (Section 1)
      const entryId = `ADJ-${Math.random().toString(36).substr(2, 9)}`;
      const ctx = PostingContextFactory.issue(tenant_id, company_id);
      await this.journalRepo.createEntry(ctx, {
        id: entryId,
        fiscalPeriodId,
        journalType: 'SYSTEM_ADJUSTMENT' as any,
        status: 'POSTED' as any,
        memo: `[AUTO_RECONCILIATION] Repair Account ${accountId}. Original: ${originalNet.toString()}, Corrected: ${trueNet.toString()}, Delta: ${delta.toString()}`,
        source_module: 'RECONCILIATION_SERVICE',
        effectiveDate: new Date(),
      } as any);

      await this.journalRepo.createLines(ctx, entryId, [
        {
          accountId,
          currency,
          amount: delta.abs(),
          side: delta.gt(0) ? PostingSide.DEBIT : PostingSide.CREDIT,
          ...dimensions,
        } as any
      ]);

      await this.balanceRepo.updateBalance(tenant_id, company_id, {
        fiscalPeriodId,
        accountId,
        currency,
        branch_id: dimensions.branch_id,
        location_id: dimensions.location_id,
        departmentId: dimensions.departmentId,
        costCenterId: dimensions.costCenterId,
        projectId: dimensions.projectId,
        netBalance: trueNet,
      });

      this.monitor.recordSelfHealing();
      this.logger.log(`[Self-Healing] SUCCESS: Account ${accountId}:${currency} repaired to ${trueNet.toString()}`);
      this.monitor.recordReconciliationResult(tenant_id, company_id, accountId, trueNet, trueNet, 'MATCH', currency); // Reset metrics to MATCH
      return true;
      
      await this.reportViolation(tenant_id, company_id, 'SELF_HEALING_REPAIR', `Account ${accountId}:${currency} was drifted and has been automatically repaired. Delta: ${delta.toString()}`);
      return true;
    } catch (error) {
      this.logger.error(`[Self-Healing] FAILED: Could not repair account ${accountId}:${currency}. ${error.message}`);
      return false;
    }
  }

  /**
   * 3. Sequence Integrity Check: No gaps or duplicates in sequenceNumber per sequenceKey
   */
  private async checkSequenceIntegrity(tenant_id: string, company_id: string) {
    this.logger.debug(`[Integrity] Checking Sequence Continuity for Tenant ${tenant_id} Company ${company_id}`);
    
    const journals = await this.journalRepo.findAllOrderedByDate(tenant_id, company_id);
    let lastSeq = -1;

    for (const journal of journals) {
      if (lastSeq !== -1 && journal.ledgerSequence !== lastSeq + 1) {
        await this.reportViolation(
          tenant_id, 
          company_id, 
          'SEQUENCE_GAP', 
          `Sequence gap detected between ${lastSeq} and ${journal.ledgerSequence}`
        );
      }
      lastSeq = journal.ledgerSequence;
    }
  }

  /**
   * 4. Hash Chain Verification: Verify each journal's hash matches the previous journal's hash.
   */
  private async verifyJournalHashChain(tenant_id: string, company_id: string) {
    this.logger.debug(`[Integrity] Verifying Hash Chain for Tenant ${tenant_id} Company ${company_id}`);

    const journals = await this.journalRepo.findAllOrderedByDate(tenant_id, company_id);
    let expectedPrevHash = 'GENESIS';

    for (const journal of journals) {
      if (!journal.entryHash) {
        await this.reportViolation(tenant_id, company_id, 'HASH_CHAIN', `Journal ${journal.id} is missing entryHash`);
        return;
      }

      if (journal.previousHash !== expectedPrevHash) {
        await this.reportViolation(
          tenant_id, 
          company_id,
          'HASH_CHAIN', 
          `Journal ${journal.id} prevHash mismatch. Expected: ${expectedPrevHash}, Actual: ${journal.previousHash}`
        );
        return;
      }

      // Recompute hash using standardized HashingService
      const lines = await this.journalRepo.findLines(journal.id);
      const recomputedHash = this.hashingService.generateJournalHash({
        previousHash: journal.previousHash || 'GENESIS',
        journalId: journal.id,
        timestamp: journal.created_at || new Date(),
        lines: lines.map(l => ({
          accountId: l.accountId,
          side: l.side as any,
          amount: new Prisma.Decimal(l.amount.toString()),
        })),
      });

      if (journal.entryHash !== recomputedHash) {
        await this.reportViolation(
          tenant_id, 
          company_id,
          'HASH_CHAIN', 
          `Journal ${journal.id} hash corruption detected! Stored: ${journal.entryHash}, Recomputed: ${recomputedHash}`
        );
        return;
      }

      expectedPrevHash = journal.entryHash;
    }
  }

  /**
   * Stores the last journal hash for independent verification.
   */
  private async storeDailyHashAnchor(tenant_id: string, company_id: string): Promise<void> {
    this.logger.log(`Storing daily hash anchor for Tenant ${tenant_id} Company ${company_id}...`);
    
    const lastHash = await this.journalRepo.getLastEntryHash(tenant_id, company_id);
    if (!lastHash) return;

    this.logger.log(`Anchor for ${new Date().toDateString()}: ${lastHash}`);
  }

  /**
   * On-demand verification of a specific journal entry's hash integrity.
   */
  async verifyJournalHash(tenant_id: string, company_id: string, journalId: string): Promise<{ valid: boolean; error?: string }> {
    const journal = await this.journalRepo.findById(tenant_id, company_id, journalId);
    if (!journal) return { valid: false, error: 'Journal not found' };

    const lines = await this.journalRepo.findLines(journalId);
    const recomputedHash = this.hashingService.generateJournalHash({
      previousHash: journal.previousHash || 'GENESIS',
      journalId: journal.id,
      timestamp: journal.created_at || new Date(),
      lines: lines.map(l => ({
        accountId: l.accountId,
        side: l.side as any,
        amount: new Prisma.Decimal(l.amount.toString()),
      })),
    });

    if (journal.entryHash !== recomputedHash) {
      return { 
        valid: false, 
        error: `Hash mismatch. Stored: ${journal.entryHash}, Recomputed: ${recomputedHash}` 
      };
    }

    return { valid: true };
  }

  private async reportViolation(tenant_id: string, company_id: string, checkType: string, details: string) {
    this.logger.error(`INTEGRITY_VIOLATION [Company: ${company_id}] [${checkType}]: ${details}`);
    
    if (this.auditService?.log) {
      await this.auditService.log({
        tenant_id,
        user_id: 'SYSTEM',
        module: 'FINANCE',
        action: 'INTEGRITY_VIOLATION',
        entity_type: 'SystemAudit',
        entity_id: checkType,
        metadata: { company_id, checkType, details, timestamp: new Date().toISOString() }
      });
    }
  }
}
