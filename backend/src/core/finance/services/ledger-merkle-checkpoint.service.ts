import { Injectable, Logger } from '@nestjs/common';
import { ILedgerMerkleCheckpointRepository } from '../repositories/interfaces/ledger-merkle-checkpoint.repository.interface';
import { IJournalRepository } from '../repositories/interfaces/journal.repository.interface';
import { LedgerMerkleCheckpoint, CheckpointChainResult, JournalEntry } from '../domain/finance.interfaces';
import { createHash } from 'crypto';

@Injectable()
export class LedgerMerkleCheckpointService {
  private readonly logger = new Logger(LedgerMerkleCheckpointService.name);

  constructor(
    private readonly checkpointRepo: ILedgerMerkleCheckpointRepository,
    private readonly journalRepo: IJournalRepository,
  ) {}

  async buildCheckpoint(tenant_id: string, company_id: string, fromSeq: number, toSeq: number): Promise<string> {
    const journals = await this.journalRepo.findBySequenceRange(tenant_id, company_id, fromSeq, toSeq);
    const hashes = journals.map((j: JournalEntry) => j.entryHash || 'UNDEFINED');
    const root = this.computeMerkleRoot(hashes);

    await this.checkpointRepo.create(tenant_id, company_id, {
      ledgerSequence: toSeq,
      fromSequence: fromSeq,
      toSequence: toSeq,
      merkleRoot: root,
      journalCount: journals.length,
      created_at: new Date(),
    });

    return root;
  }

  async verifyChain(tenant_id: string, company_id: string): Promise<CheckpointChainResult> {
    const checkpoints = await this.checkpointRepo.findAll(tenant_id, company_id);
    const violations: string[] = [];

    for (let i = 1; i < checkpoints.length; i++) {
        const curr = checkpoints[i];
        const prev = checkpoints[i - 1];
        
        const currFrom = curr.fromSequence ?? 0;
        const prevTo = prev.toSequence ?? 0;

        if (currFrom !== prevTo + 1) {
            violations.push(`Sequence Gap: ${prevTo} to ${currFrom}`);
        }
    }

    return {
      isValid: violations.length === 0,
      checkpointCount: checkpoints.length,
      violations,
    };
  }

  private computeMerkleRoot(hashes: string[]): string {
    if (hashes.length === 0) return 'EMPTY';
    if (hashes.length === 1) return hashes[0];

    const nextLevel: string[] = [];
    for (let i = 0; i < hashes.length; i += 2) {
      const left = hashes[i];
      const right = hashes[i + 1] || left;
      nextLevel.push(createHash('sha256').update(left + right).digest('hex'));
    }
    return this.computeMerkleRoot(nextLevel);
  }
}
