import { Injectable } from '@nestjs/common';
import { JournalReversal } from '../domain/finance.interfaces';
import { IJournalReversalRepository } from './interfaces/journal-reversal.repository.interface';

@Injectable()
export class JournalReversalMockRepository implements IJournalReversalRepository {
  /** Key: `${tenant_id}:${company_id}` */
  private reversals: Map<string, JournalReversal[]> = new Map();

  async createReversalRecord(tenant_id: string, company_id: string, data: Partial<JournalReversal>): Promise<JournalReversal> {
    const scopeKey = `${tenant_id}:${company_id}`;
    const list = this.reversals.get(scopeKey) || [];
    const newRecord: JournalReversal = {
      id: Math.random().toString(36).substr(2, 9),
      tenant_id,
      company_id,
      originalJournalId: data.originalJournalId!,
      reversalJournalId: data.reversalJournalId!,
      reversalReason: data.reversalReason || '',
      requested_by: data.requested_by || 'SYSTEM',
      created_at: new Date(),
    };
    list.push(newRecord);
    this.reversals.set(scopeKey, list);
    return newRecord;
  }

  async findByOriginalJournalId(tenant_id: string, company_id: string, originalJournalId: string): Promise<JournalReversal | null> {
    const list = this.reversals.get(`${tenant_id}:${company_id}`) || [];
    return list.find((r: any) => r.originalJournalId === originalJournalId) || null;
  }
}
