import { Injectable } from '@nestjs/common';
import { FinancialReportSnapshot } from '../domain/finance.interfaces';
import { Prisma } from '@prisma/client';

@Injectable()
export class FinancialReportSnapshotMockRepository {
  private snapshots: FinancialReportSnapshot[] = [];

  async save(snapshot: FinancialReportSnapshot): Promise<void> {
    this.snapshots.push(snapshot);
  }

  async findLatest(tenant_id: string, company_id: string, reportType: string): Promise<FinancialReportSnapshot | null> {
    const list = this.snapshots.filter(s => s.tenant_id === tenant_id && s.reportType === reportType);
    if (list.length === 0) return null;
    return list.sort((a, b) => (b.projectionCheckpointSequence || 0) - (a.projectionCheckpointSequence || 0))[0];
  }
}
