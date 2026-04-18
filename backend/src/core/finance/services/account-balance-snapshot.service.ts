import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { IAccountBalanceSnapshotRepository } from '../repositories/interfaces/account-balance-snapshot.repository.interface';
import { IFiscalPeriodRepository } from '../repositories/interfaces/fiscal.repository.interface';
import { IJournalRepository } from '../repositories/interfaces/journal.repository.interface';
import { JournalEntry, AccountBalanceSnapshot } from '../domain/finance.interfaces';
import { FiscalPeriodStatus, PostingSide } from '../domain/finance.constants';

@Injectable()
export class AccountBalanceSnapshotService {
  private readonly logger = new Logger(AccountBalanceSnapshotService.name);

  constructor(
    private readonly snapshotRepo: IAccountBalanceSnapshotRepository,
    private readonly fiscalRepo: IFiscalPeriodRepository,
    private readonly journalRepo: IJournalRepository,
  ) {}

  /**
   * Resilience: Sequence Buffer & Atomic Propagation
   * Processes all lines of a journal in a single sequence-aware execution.
   */
  async handleJournalEntry(tenant_id: string, company_id: string, entry: JournalEntry): Promise<void> {
    const periodId = entry.fiscalPeriodId;
    const ledgerSequence = entry.ledgerSequence || 0;

    // 1. Sequence Gap Detection & Buffering
    const lastSeq = await this.snapshotRepo.getLastAppliedSequence(tenant_id, company_id, periodId);
    
    if (ledgerSequence > lastSeq + 1) {
      this.logger.warn(`Sequence Gap: Expected ${lastSeq + 1}, got ${ledgerSequence}. Buffering entry ${entry.id}.`);
      await this.snapshotRepo.saveToBuffer(tenant_id, company_id, entry);
      return; 
    }

    if (ledgerSequence <= lastSeq && ledgerSequence !== 0) {
      this.logger.warn(`Duplicate Sequence: Entry ${entry.id} (Seq: ${ledgerSequence}) already surpassed by ${lastSeq}. Skipping.`);
      return;
    }

    // 2. BEGIN ATOMIC PROCESSING (Journal + Propagation)
    try {
      await this.processJournalAtomically(tenant_id, company_id, entry);
      
      // 3. Update Sequence
      await this.snapshotRepo.updateLastAppliedSequence(tenant_id, company_id, periodId, ledgerSequence);
      
      // 4. Clear from buffer if it was there
      await this.snapshotRepo.clearFromBuffer(tenant_id, company_id, entry.id);

      // 5. Recursive Buffer Drain (Process next in sequence if buffered)
      const nextBuffered = await this.snapshotRepo.getFromBuffer(tenant_id, company_id, periodId, ledgerSequence + 1);
      if (nextBuffered) {
        this.logger.log(`Gap Fixed: Processing buffered entry ${nextBuffered.id} (Seq: ${ledgerSequence + 1})`);
        await this.handleJournalEntry(tenant_id, company_id, nextBuffered);
      }

    } catch (error) {
      this.logger.error(`Processing Error: Failed to apply entry ${entry.id}. ${error.message}`);
      throw error;
    }
  }

  private async processJournalAtomically(tenant_id: string, company_id: string, entry: JournalEntry): Promise<void> {
    const lines = await this.journalRepo.findLines(entry.id);
    const periodId = entry.fiscalPeriodId;

    // Period State Enforcement
    const period = await this.fiscalRepo.findById(tenant_id, company_id, periodId);
    if (!period) throw new BadRequestException('Period not found');
    if (period.status === FiscalPeriodStatus.CLOSED || period.status === FiscalPeriodStatus.HARD_LOCK) {
      throw new BadRequestException(`Immutability Violation: Cannot update snapshots for ${period.status} period.`);
    }

    for (const line of lines) {
      const netDelta = line.side === PostingSide.DEBIT ? line.amount : line.amount.negated();
      const currency = line.currency || 'USD';
      
      // Row Lock Current Period
      await this.snapshotRepo.acquireRowLock(tenant_id, company_id, line.accountId, currency, periodId);

      let snapshot = await this.snapshotRepo.findByAccount(tenant_id, company_id, line.accountId, currency, periodId);
      if (!snapshot) snapshot = await this.initializeSnapshot(tenant_id, company_id, line.accountId, periodId, currency);

      if (line.side === PostingSide.DEBIT) {
        snapshot.debitTotal = (snapshot.debitTotal || new Prisma.Decimal(0)).plus(line.amount);
      } else {
        snapshot.creditTotal = (snapshot.creditTotal || new Prisma.Decimal(0)).plus(line.amount);
      }
      
      snapshot.closingBalance = (snapshot.openingBalance || new Prisma.Decimal(0)).plus(snapshot.debitTotal || 0).minus(snapshot.creditTotal || 0);
      snapshot.snapshotSequence = (snapshot.snapshotSequence || 0) + 1;
      snapshot.lastUpdatedAt = new Date();

      await this.snapshotRepo.upsert(tenant_id, company_id, snapshot);

      // UNIFIED TRANSACTIONAL PROPAGATION
      await this.propagateForwardResilient(tenant_id, company_id, line.accountId, period.fiscalYearId, period.periodNumber, netDelta, currency);
      
      await this.snapshotRepo.addLog({ 
        snapshotId: snapshot.id,
        ledgerEntryId: entry.id, 
        accountId: line.accountId, 
        periodId, 
        appliedAt: new Date() 
      });
    }
  }

  private async propagateForwardResilient(tenant_id: string, company_id: string, accountId: string, yearId: string, startPeriod: number, delta: Prisma.Decimal, currency: string): Promise<void> {
    const futurePeriods = await this.snapshotRepo.findPeriodsAfter(tenant_id, company_id, startPeriod, yearId);
    
    for (const periodId of futurePeriods) {
      await this.snapshotRepo.acquireRowLock(tenant_id, company_id, accountId, currency, periodId);
      
      const snapshot = await this.snapshotRepo.findByAccount(tenant_id, company_id, accountId, currency, periodId);
      if (snapshot) {
        snapshot.openingBalance = (snapshot.openingBalance || new Prisma.Decimal(0)).plus(delta);
        snapshot.closingBalance = (snapshot.closingBalance || new Prisma.Decimal(0)).plus(delta);
        snapshot.snapshotSequence = (snapshot.snapshotSequence || 0) + 1;
        snapshot.lastUpdatedAt = new Date();
        await this.snapshotRepo.upsert(tenant_id, company_id, snapshot);
      }
    }
  }

  async triggerRecovery(tenant_id: string, company_id: string, periodId: string): Promise<void> {
    const lastSeq = await this.snapshotRepo.getLastAppliedSequence(tenant_id, company_id, periodId);
    this.logger.warn(`Controlled Recovery triggered for period ${periodId} from sequence ${lastSeq}`);
    await this.rebuildPeriod(tenant_id, company_id, periodId);
  }

  async getSafeSnapshot(tenant_id: string, company_id: string, accountId: string, periodId: string, currency: string): Promise<AccountBalanceSnapshot | null> {
    const closingSeq = await this.snapshotRepo.getClosingSnapshotSequence(tenant_id, company_id, periodId);
    const snapshot = await this.snapshotRepo.findByAccount(tenant_id, company_id, accountId, currency, periodId);

    if (closingSeq && snapshot && (snapshot.snapshotSequence || 0) > closingSeq) {
       this.logger.warn(`Audit Warning: Accessing snapshot newer than closing sequence (${snapshot.snapshotSequence} > ${closingSeq})`);
    }

    return snapshot;
  }

  private roundTo2(num: number): number {
    return Math.round((num + Number.EPSILON) * 100) / 100;
  }

  private async initializeSnapshot(tenant_id: string, company_id: string, accountId: string, periodId: string, currency: string): Promise<AccountBalanceSnapshot> {
    return {
      id: `${tenant_id}:${company_id}:${accountId}:${periodId}:${currency}`,
      tenant_id,
      company_id,
      accountId,
      currency,
      periodId,
      openingBalance: new Prisma.Decimal(0), 
      debitTotal: new Prisma.Decimal(0),
      creditTotal: new Prisma.Decimal(0),
      closingBalance: new Prisma.Decimal(0),
      snapshotSequence: 0,
      snapshotDate: new Date(),
      lastUpdatedAt: new Date(),
    };
  }

  async rebuildPeriod(tenant_id: string, company_id: string, periodId: string): Promise<void> {
    await this.fiscalRepo.acquireLock(tenant_id, company_id, periodId);
    try {
      await this.snapshotRepo.deleteForPeriod(tenant_id, company_id, periodId);
      const entries = await this.journalRepo.findAllOrderedByDate(tenant_id, company_id);
      const periodEntries = entries.filter(e => e.fiscalPeriodId === periodId).sort((a, b) => (a.ledgerSequence || 0) - (b.ledgerSequence || 0));

      for (const entry of periodEntries) {
        await this.handleJournalEntry(tenant_id, company_id, entry);
      }
    } catch (error) {
       this.logger.error(`Rebuild failed. ${error.message}`);
       throw error;
    }
  }

  async validateSnapshot(tenant_id: string, company_id: string, periodId: string): Promise<boolean> {
    const rawBalances = await this.journalRepo.getRawBalances(tenant_id, company_id, periodId, new Date('1970-01-01'), new Date('2099-12-31'));
    const snapshots = await this.snapshotRepo.findAllInPeriod(tenant_id, company_id, periodId);

    for (const snapshot of snapshots) {
      const glBalance = new Prisma.Decimal(rawBalances[snapshot.accountId!] || 0);
      const snapDiff = (snapshot.closingBalance || new Prisma.Decimal(0)).minus(snapshot.openingBalance || 0);
      if (glBalance.minus(snapDiff).abs().gt(0.001)) {
        this.logger.error(`CRITICAL_MISMATCH: ${snapshot.accountId}. GL: ${glBalance}, Snap: ${snapDiff}`);
        return false;
      }
    }
    return true;
  }
}
