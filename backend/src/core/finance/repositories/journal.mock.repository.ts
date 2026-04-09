import { Injectable } from '@nestjs/common';
import { JournalEntry, JournalLine, JournalStatus, JournalType } from '../domain/finance.interfaces';
import { IJournalRepository } from './interfaces/journal.repository.interface';
import { PostingSide } from '../domain/finance.constants';
import { Prisma } from '@prisma/client';

@Injectable()
export class JournalMockRepository implements IJournalRepository {
  private entries: Map<string, JournalEntry[]> = new Map();
  private lines: Map<string, JournalLine[]> = new Map();

  async findById(tenantId: string, companyId: string, id: string): Promise<JournalEntry | null> {
    const list = this.entries.get(`${tenantId}:${companyId}`) || [];
    return list.find(e => e.id === id) || null;
  }

  async findByRef(tenantId: string, companyId: string, ref: string): Promise<JournalEntry | null> {
    const list = this.entries.get(`${tenantId}:${companyId}`) || [];
    return list.find(e => e.ref === ref) || null;
  }

  async findBySequence(tenantId: string, companyId: string, sequence: number): Promise<JournalEntry | null> {
    const list = this.entries.get(`${tenantId}:${companyId}`) || [];
    return list.find(e => Number(e.ledgerSequence) === sequence) || null;
  }

  async findBySequenceRange(tenantId: string, companyId: string, fromSeq: number, toSeq: number): Promise<JournalEntry[]> {
    const list = this.entries.get(`${tenantId}:${companyId}`) || [];
    return list.filter(e => Number(e.ledgerSequence) >= fromSeq && Number(e.ledgerSequence) <= toSeq);
  }

  async findAllOrderedByDate(tenantId: string, companyId: string): Promise<JournalEntry[]> {
    const list = this.entries.get(`${tenantId}:${companyId}`) || [];
    return [...list].sort((a, b) => a.postingDate.getTime() - b.postingDate.getTime());
  }

  async getLastEntryHash(tenantId: string, companyId: string): Promise<string | null> {
    return 'MOCK-HASH';
  }

  async createEntry(ctx: any, entry: Partial<JournalEntry>): Promise<JournalEntry> {
    return this.create(ctx.tenantId, ctx.companyId, entry);
  }

  async create(tenantId: string, companyId: string, entry: Partial<JournalEntry>): Promise<JournalEntry> {
    const scopeKey = `${tenantId}:${companyId}`;
    const list = this.entries.get(scopeKey) || [];
    const newEntry: JournalEntry = {
      id: entry.id || Math.random().toString(36).substr(2, 9),
      tenantId,
      companyId,
      fiscalPeriodId: entry.fiscalPeriodId!,
      ledgerSequence: entry.ledgerSequence || 0,
      postingDate: entry.postingDate || new Date(),
      effectiveDate: entry.effectiveDate || new Date(),
      status: (entry.status as JournalStatus) || JournalStatus.DRAFT,
      journalType: (entry.journalType as JournalType) || JournalStatus.DRAFT as any,
      ref: entry.ref || `REF-${Date.now()}`,
      sourceEventId: entry.sourceEventId || '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    list.push(newEntry);
    this.entries.set(scopeKey, list);
    return newEntry;
  }

  async createLines(ctx: any, entryId: string, lines: Partial<JournalLine>[]): Promise<void> {
    await this.createJournalLines(ctx.tenantId, ctx.companyId, entryId, lines);
  }

  async createJournalLines(tenantId: string, companyId: string, entryId: string, lines: Partial<JournalLine>[]): Promise<JournalLine[]> {
    const list = this.lines.get(entryId) || [];
    const newLines = lines.map(line => ({
      id: Math.random().toString(36).substr(2, 9),
      journalEntryId: entryId,
      accountId: line.accountId!,
      accountCode: line.accountCode || 'MOCK',
      side: line.side!,
      amount: new Prisma.Decimal(line.amount?.toString() || '0'),
      currency: line.currency || 'USD',
      branchId: line.branchId || 'GLOBAL',
      createdAt: new Date(),
    } as JournalLine));
    this.lines.set(entryId, [...list, ...newLines]);
    return newLines;
  }

  async updateStatus(tenantId: string, companyId: string, id: string, status: JournalStatus): Promise<JournalEntry> {
    const scopeKey = `${tenantId}:${companyId}`;
    const list = this.entries.get(scopeKey) || [];
    const index = list.findIndex(e => e.id === id);
    if (index !== -1) {
      list[index].status = status;
      list[index].updatedAt = new Date();
      return list[index];
    }
    throw new Error('Entry not found');
  }

  async incrementSequence(tenantId: string, companyId: string, id: string): Promise<number> {
    const scopeKey = `${tenantId}:${companyId}`;
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

  async getRawBalances(tenantId: string, companyId: string, periodId: string, startDate: Date, endDate: Date): Promise<Record<string, Prisma.Decimal>> {
    return {};
  }

  async countDraftsInPeriod(tenantId: string, companyId: string, periodId: string): Promise<number> {
    const list = this.entries.get(`${tenantId}:${companyId}`) || [];
    return list.filter(e => e.fiscalPeriodId === periodId && e.status === JournalStatus.DRAFT).length;
  }

  async voidDraftsInPeriod(tenantId: string, companyId: string, periodId: string): Promise<void> {
    const scopeKey = `${tenantId}:${companyId}`;
    const list = this.entries.get(scopeKey) || [];
    list.forEach(e => {
      if (e.fiscalPeriodId === periodId && e.status === JournalStatus.DRAFT) {
        e.status = 'VOID' as JournalStatus;
      }
    });
  }
}
