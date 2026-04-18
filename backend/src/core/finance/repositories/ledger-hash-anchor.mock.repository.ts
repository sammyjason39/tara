import { Injectable } from '@nestjs/common';
import { LedgerHashAnchor } from '../domain/finance.interfaces';
import { ILedgerHashAnchorRepository } from './interfaces/ledger-hash-anchor.repository.interface';
import { v4 as uuid } from 'uuid';

@Injectable()
export class LedgerHashAnchorMockRepository implements ILedgerHashAnchorRepository {
  private anchors: LedgerHashAnchor[] = [];

  async create(tenant_id: string, data: { anchorDate: Date, finalJournalHash: string }): Promise<LedgerHashAnchor> {
    const anchor: LedgerHashAnchor = {
      id: uuid(),
      tenant_id,
      anchorDate: data.anchorDate,
      finalJournalHash: data.finalJournalHash,
      created_at: new Date(),
    };
    this.anchors.push(anchor);
    return anchor;
  }

  async findLatest(tenant_id: string): Promise<LedgerHashAnchor | null> {
    const tenantAnchors = this.anchors.filter(a => a.tenant_id === tenant_id);
    if (tenantAnchors.length === 0) return null;
    return tenantAnchors.sort((a, b) => b.anchorDate.getTime() - a.anchorDate.getTime())[0];
  }

  async findByDate(tenant_id: string, date: Date): Promise<LedgerHashAnchor | null> {
    return this.anchors.find(a => a.tenant_id === tenant_id && a.anchorDate.getTime() === date.getTime()) || null;
  }
}
