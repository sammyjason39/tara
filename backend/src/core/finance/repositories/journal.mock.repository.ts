import { Injectable } from '@nestjs/common';
import { JournalEntry, JournalLine, JournalStatus, JournalType } from '../domain/finance.interfaces';
import { IJournalRepository } from './interfaces/journal.repository.interface';
import { PostingSide } from '../domain/finance.constants';
import { Prisma } from '@prisma/client';

@Injectable()
export class JournalMockRepository implements IJournalRepository {
  private entries: Map<string, JournalEntry[]> = new Map();
  private lines: Map<string, JournalLine[]> = new Map();

  async findById(tenant_id: string, company_id: string, id: string): Promise<JournalEntry | null> {
    const list = this.entries.get(`${tenant_id}:${company_id}`) || [];
    return list.find(e => e.id === id) || null;
  }

  async findByRef(tenant_id: string, company_id: string, ref: string): Promise<JournalEntry | null> {
    const list = this.entries.get(`${tenant_id}:${company_id}`) || [];
    return list.find(e => e.ref === ref) || null;
  }

  async findBySequence(tenant_id: string, company_id: string, sequence: number): Promise<JournalEntry | null> {
    const list = this.entries.get(`${tenant_id}:${company_id}`) || [];
    return list.find(e => Number(e.ledgerSequence) === sequence) || null;
  }

  async findBySequenceRange(tenant_id: string, company_id: string, fromSeq: number, toSeq: number): Promise<JournalEntry[]> {
    const list = this.entries.get(`${tenant_id}:${company_id}`) || [];
    return list.filter(e => Number(e.ledgerSequence) >= fromSeq && Number(e.ledgerSequence) <= toSeq);
  }

  async findAllOrderedByDate(tenant_id: string, company_id: string): Promise<JournalEntry[]> {
    const list = this.entries.get(`${tenant_id}:${company_id}`) || [];
    return [...list].sort((a, b) => a.postingDate.getTime() - b.postingDate.getTime());
  }

  async getLastEntryHash(tenant_id: string, company_id: string): Promise<string | null> {
    return 'MOCK-HASH';
  }

  async createEntry(ctx: any, entry: Partial<JournalEntry>): Promise<JournalEntry> {
    return this.create(ctx.tenant_id, ctx.company_id, entry);
  }

  async create(tenant_id: string, company_id: string, entry: Partial<JournalEntry>): Promise<JournalEntry> {
    const scopeKey = `${tenant_id}:${company_id}`;
    const list = this.entries.get(scopeKey) || [];
    const newEntry: JournalEntry = {
      id: entry.id || Math.random().toString(36).substr(2, 9),
      tenant_id,
      company_id,
      fiscalPeriodId: entry.fiscalPeriodId!,
      ledgerSequence: entry.ledgerSequence || 0,
      postingDate: entry.postingDate || new Date(),
      effectiveDate: entry.effectiveDate || new Date(),
      status: (entry.status as JournalStatus) || JournalStatus.DRAFT,
      journalType: (entry.journalType as JournalType) || JournalStatus.DRAFT as any,
      ref: entry.ref || `REF-${Date.now()}`,
      sourceEventId: entry.sourceEventId || '',
      created_at: new Date(),
      updated_at: new Date(),
    };
    list.push(newEntry);
    this.entries.set(scopeKey, list);
    return newEntry;
  }

  async createLines(ctx: any, entryId: string, lines: Partial<JournalLine>[]): Promise<void> {
    await this.createJournalLines(ctx.tenant_id, ctx.company_id, entryId, lines);
  }

  async createJournalLines(tenant_id: string, company_id: string, entryId: string, lines: Partial<JournalLine>[]): Promise<JournalLine[]> {
    const list = this.lines.get(entryId) || [];
    const newLines = lines.map((line: any) => ({
      id: Math.random().toString(36).substr(2, 9),
      journalEntryId: entryId,
      accountId: line.accountId!,
      accountCode: line.accountCode || 'MOCK',
      side: line.side!,
      amount: new Prisma.Decimal(line.amount?.toString() || '0'),
      currency: line.currency || 'USD',
      branch_id: line.branch_id || 'GLOBAL',
      created_at: new Date(),
    } as JournalLine));
    this.lines.set(entryId, [...list, ...newLines]);
    return newLines;
  }

  async updateStatus(tenant_id: string, company_id: string, id: string, status: JournalStatus): Promise<JournalEntry> {
    const scopeKey = `${tenant_id}:${company_id}`;
    const list = this.entries.get(scopeKey) || [];
    const index = list.findIndex(e => e.id === id);
    if (index !== -1) {
      list[index].status = status;
      list[index].updated_at = new Date();
      return list[index];
    }
    throw new Error('Entry not found');
  }

  async incrementSequence(tenant_id: string, company_id: string, id: string): Promise<number> {
    const scopeKey = `${tenant_id}:${company_id}`;
    const list = this.entries.get(scopeKey) || [];
    const index = list.findIndex(e => e.id === id);
    if (index !== -1) {
      const current = Number(list[index].ledgerSequence || 0);
      list[index].ledgerSequence = current + 1;
      return current + 1;
    }
    return 0;
  }

  async findLines(entryId: string): Promise<JournalLine[]> {
    return this.lines.get(entryId) || [];
  }

  async getRawBalances(tenant_id: string, company_id: string, periodId: string, start_date: Date, end_date: Date): Promise<Record<string, Prisma.Decimal>> {
    return {};
  }

  async countDraftsInPeriod(tenant_id: string, company_id: string, periodId: string): Promise<number> {
    const list = this.entries.get(`${tenant_id}:${company_id}`) || [];
    return list.filter(e => e.fiscalPeriodId === periodId && e.status === JournalStatus.DRAFT).length;
  }

  async voidDraftsInPeriod(tenant_id: string, company_id: string, periodId: string): Promise<void> {
    const scopeKey = `${tenant_id}:${company_id}`;
    const list = this.entries.get(scopeKey) || [];
    list.forEach(e => {
      if (e.fiscalPeriodId === periodId && e.status === JournalStatus.DRAFT) {
        e.status = 'VOID' as JournalStatus;
      }
    });
  }
}
