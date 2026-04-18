import { Injectable } from '@nestjs/common';
import { ConsolidatedFinancialSnapshot } from '../domain/finance.interfaces';

@Injectable()
export class ConsolidatedSnapshotMockRepository {
  private snapshots: ConsolidatedFinancialSnapshot[] = [];

  async save(snapshot: ConsolidatedFinancialSnapshot): Promise<void> {
    this.snapshots.push(snapshot);
  }

  async findLatest(tenant_id: string, groupId: string): Promise<ConsolidatedFinancialSnapshot | null> {
    const filtered = this.snapshots.filter(s => s.tenant_id === tenant_id && s.groupId === groupId);
    if (filtered.length === 0) return null;
    return filtered.sort((a, b) => (b.projectionCheckpointSequence || 0) - (a.projectionCheckpointSequence || 0))[0];
  }
}
