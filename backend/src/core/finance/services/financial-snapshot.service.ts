import { Injectable, Inject, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { IFinancialSnapshotRepository } from '../repositories/interfaces/financial-snapshot.repository.interface';
import { IJournalRepository } from '../repositories/interfaces/journal.repository.interface';
import { ITrialBalanceProjectionRepository } from '../repositories/interfaces/trial-balance-projection.repository.interface';
import { ILedgerProjectionCheckpointRepository } from '../repositories/interfaces/ledger-projection-checkpoint.repository.interface';
import { FinancialSnapshot } from '../domain/finance.interfaces';
import { Prisma } from '@prisma/client';
import { PostingSide } from '../domain/finance.constants';

@Injectable()
export class FinancialSnapshotService {
  private readonly logger = new Logger(FinancialSnapshotService.name);

  constructor(
    @Inject('IFinancialSnapshotRepository')
    private readonly snapshotRepo: IFinancialSnapshotRepository,
    @Inject('IJournalRepository')
    private readonly journalRepo: IJournalRepository,
    @Inject('ITrialBalanceProjectionRepository')
    private readonly trialBalanceRepo: ITrialBalanceProjectionRepository,
    @Inject('ILedgerProjectionCheckpointRepository')
    private readonly checkpointRepo: ILedgerProjectionCheckpointRepository,
  ) {}

  /**
   * Generates a structural checkpoint (snapshotSequence) and captures full projection state.
   * Reports can hydrate from this state and replay journals forward for efficiency.
   */
  async generateCheckpoint(tenant_id: string, company_id: string): Promise<FinancialSnapshot> {
    // 1. Get the latest processed sequence for projections
    const latestProcessedSeq = await this.checkpointRepo.getCheckpoint(tenant_id, company_id, 'ALL_PROJECTIONS');

    // 2. Capture full Trial Balance state
    const tbState = await this.trialBalanceRepo.findAll(tenant_id, company_id);
    
    // 3. Normalize and sort for deterministic hashing (Period-aware)
    const normalizedState = tbState.map(s => ({
      accountId: s.accountId,
      fiscalPeriodId: s.fiscalPeriodId,
      debitTotal: s.debitTotal,
      creditTotal: s.creditTotal
    })).sort((a, b) => {
      const accCmp = a.accountId.localeCompare(b.accountId);
      if (accCmp !== 0) return accCmp;
      return a.fiscalPeriodId.localeCompare(b.fiscalPeriodId);
    });
    
    const serializedForHash = JSON.stringify(normalizedState);
    const stateHash = createHash('sha256').update(serializedForHash).digest('hex');

    // 5. Create Snapshot (store full state but use normalized hash)
    const serializedState = JSON.stringify(tbState.sort((a,b) => a.accountId.localeCompare(b.accountId)));

    // 5. Create Snapshot
    const snapshot = await this.snapshotRepo.create(tenant_id, company_id, {
      snapshotSequence: latestProcessedSeq,
      snapshotDate: new Date(),
      trialBalanceStateHash: stateHash,
      compressedTrialBalanceState: serializedState, // In prod this might be GZIPed
    });

    this.logger.log(`Created stateful financial snapshot for tenant ${tenant_id} company ${company_id} at sequence ${latestProcessedSeq} (hash: ${stateHash.substring(0, 8)})`);
    return {
      ...snapshot,
      snapshotSequence: snapshot.snapshotSequence || 0
    } as any;
  }

  async getLatestCheckpoint(tenant_id: string, company_id: string): Promise<FinancialSnapshot | null> {
    return this.snapshotRepo.findLatest(tenant_id, company_id);
  }

  /**
   * Periodically verifies that snapshots were not corrupted by rebuilding state from ledger.
   */
  async snapshotIntegrityAudit(tenant_id: string, company_id: string): Promise<void> {
    const snapshot = await this.getLatestCheckpoint(tenant_id, company_id);
    if (!snapshot) return;

    // 1. Rebuild state from ledger using the sequence stored in snapshot
    // Note: In this mock environment, we might simulate this or use a simple rebuild
    // For this audit, we compute what the TB should be based on the immutable journal entries
    // up to snapshot.snapshotSequence.
    
    this.logger.log(`Starting integrity audit for snapshot ${snapshot.id} (tenant: ${tenant_id}, companies: ${company_id}). Current hash: ${snapshot.trialBalanceStateHash}`);

    // Fetch all journals up to this sequence
    const journals = await this.journalRepo.findBySequenceRange(tenant_id, company_id, 1, snapshot.snapshotSequence);
    
    // Simple in-memory aggregation for audit (Period-aware)
    const expectedTotals: Map<string, { accountId: string, fiscalPeriodId: string, debitTotal: Prisma.Decimal, creditTotal: Prisma.Decimal }> = new Map();
    
    for (const journal of journals) {
      const lines = await this.journalRepo.findLines(journal.id);
      for (const line of lines) {
        const key = `${line.accountId}|${journal.fiscalPeriodId}`;
        const acc = expectedTotals.get(key) || { 
          accountId: line.accountId, 
          fiscalPeriodId: journal.fiscalPeriodId, 
          debitTotal: new Prisma.Decimal(0), 
          creditTotal: new Prisma.Decimal(0) 
        };
        if (line.side === PostingSide.DEBIT) acc.debitTotal = acc.debitTotal.plus(line.amount);
        else acc.creditTotal = acc.creditTotal.plus(line.amount);
        expectedTotals.set(key, acc);
      }
    }

    // 2. Compute hash of the rebuilt state (using same minimal normalized structure)
    const normalizedRebuiltState = Array.from(expectedTotals.values())
      .map(s => ({ 
        accountId: s.accountId, 
        fiscalPeriodId: s.fiscalPeriodId,
        debitTotal: s.debitTotal, 
        creditTotal: s.creditTotal 
      }))
      .sort((a, b) => {
        const accCmp = a.accountId.localeCompare(b.accountId);
        if (accCmp !== 0) return accCmp;
        return a.fiscalPeriodId.localeCompare(b.fiscalPeriodId);
      });
    
    const rebuiltHash = createHash('sha256').update(JSON.stringify(normalizedRebuiltState)).digest('hex');

    // 3. Compare with snapshot hash
    if (rebuiltHash !== snapshot.trialBalanceStateHash) {
      this.logger.error(`INTEGRITY FAILURE: Snapshot ${snapshot.id} hash mismatch.`);
      throw new SnapshotIntegrityError(tenant_id, snapshot.snapshotSequence);
    }

    this.logger.log(`Integrity audit passed for snapshot ${snapshot.id}`);
  }
}

export class SnapshotIntegrityError extends Error {
  constructor(tenant_id: string, sequence: number) {
    super(`Snapshot integrity violation for tenant ${tenant_id} at sequence ${sequence}`);
    this.name = 'SnapshotIntegrityError';
  }
}
