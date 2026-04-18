import { Injectable } from '@nestjs/common';
import { LedgerProjectionCheckpoint } from '../domain/finance.interfaces';
import { ILedgerProjectionCheckpointRepository } from './interfaces/ledger-projection-checkpoint.repository.interface';

@Injectable()
export class LedgerProjectionCheckpointMockRepository implements ILedgerProjectionCheckpointRepository {
  private checkpoints: Map<string, LedgerProjectionCheckpoint> = new Map();

  async upsert(tenant_id: string, company_id: string, projectionType: string, sequence: number): Promise<void> {
    const key = `${tenant_id}:${company_id}:${projectionType}`;
    this.checkpoints.set(key, {
      id: Math.random().toString(36).substr(2, 9),
      tenant_id: tenant_id,
      company_id: company_id,
      projectionType: projectionType,
      lastSequence: sequence,
      lastJournalSequence: sequence,
      updated_at: new Date(),
    });
  }

  async getCheckpoint(tenant_id: string, company_id: string, projectionType: string): Promise<number> {
    const key = `${tenant_id}:${company_id}:${projectionType}`;
    const cp = this.checkpoints.get(key);
    return cp ? Number(cp.lastSequence) : 0;
  }

  async reset(tenant_id: string, company_id: string): Promise<void> {
    for (const [key, value] of this.checkpoints.entries()) {
      if (value.tenant_id === tenant_id && value.company_id === company_id) {
        this.checkpoints.delete(key);
      }
    }
  }
}
