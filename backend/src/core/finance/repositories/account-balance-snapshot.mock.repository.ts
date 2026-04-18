import { Injectable } from '@nestjs/common';
import { AccountBalanceSnapshot, SnapshotApplicationLog, JournalEntry } from '../domain/finance.interfaces';
import { IAccountBalanceSnapshotRepository } from './interfaces/account-balance-snapshot.repository.interface';

@Injectable()
export class AccountBalanceSnapshotMockRepository implements IAccountBalanceSnapshotRepository {
  private snapshots: Map<string, AccountBalanceSnapshot[]> = new Map();
  private logs: Map<string, boolean> = new Map();
  private buffer: Map<string, JournalEntry[]> = new Map();
  private sequences: Map<string, number> = new Map();

  async findByAccount(tenant_id: string, company_id: string, accountId: string, currency: string, periodId: string): Promise<AccountBalanceSnapshot | null> {
    const list = this.snapshots.get(`${tenant_id}:${company_id}`) || [];
    return list.find(s => s.accountId === accountId && s.currency === currency && s.periodId === periodId) || null;
  }

  async upsert(tenant_id: string, company_id: string, snapshot: AccountBalanceSnapshot): Promise<void> {
    const scopeKey = `${tenant_id}:${company_id}`;
    let list = this.snapshots.get(scopeKey) || [];
    const index = list.findIndex(s => s.accountId === snapshot.accountId && s.currency === snapshot.currency && s.periodId === snapshot.periodId && s.snapshotSequence === snapshot.snapshotSequence);
    if (index !== -1) list[index] = snapshot;
    else list.push(snapshot);
    this.snapshots.set(scopeKey, list);
  }

  async findPeriodsAfter(tenant_id: string, company_id: string, periodNumber: number, fiscalYearId: string): Promise<string[]> {
    return []; // Mock
  }

  async deleteForPeriod(tenant_id: string, company_id: string, periodId: string): Promise<void> {
    const scopeKey = `${tenant_id}:${company_id}`;
    let list = this.snapshots.get(scopeKey) || [];
    this.snapshots.set(scopeKey, list.filter(s => s.periodId !== periodId));
  }

  async findAllInPeriod(tenant_id: string, company_id: string, periodId: string): Promise<AccountBalanceSnapshot[]> {
    const list = this.snapshots.get(`${tenant_id}:${company_id}`) || [];
    return list.filter(s => s.periodId === periodId);
  }

  async isLogged(ledgerEntryId: string, accountId: string, periodId: string): Promise<boolean> {
    return this.logs.get(`${ledgerEntryId}:${accountId}:${periodId}`) || false;
  }

  async addLog(log: SnapshotApplicationLog): Promise<void> {
    this.logs.set(`${log.ledgerEntryId}:${log.accountId}:${log.periodId}`, true);
  }

  async acquireRowLock(tenant_id: string, company_id: string, accountId: string, currency: string, periodId: string): Promise<void> {
    // Mock
  }

  async saveToBuffer(tenant_id: string, company_id: string, entry: JournalEntry): Promise<void> {
    const key = `${tenant_id}:${company_id}:${entry.fiscalPeriodId}`;
    let list = this.buffer.get(key) || [];
    list.push(entry);
    this.buffer.set(key, list);
  }

  async getFromBuffer(tenant_id: string, company_id: string, periodId: string, sequence: number): Promise<JournalEntry | null> {
    const key = `${tenant_id}:${company_id}:${periodId}`;
    const list = this.buffer.get(key) || [];
    return list.find(e => e.ledgerSequence === sequence) || null;
  }

  async clearFromBuffer(tenant_id: string, company_id: string, entryId: string): Promise<void> {
    // Mock
  }

  async getLastAppliedSequence(tenant_id: string, company_id: string, periodId: string): Promise<number> {
    return this.sequences.get(`${tenant_id}:${company_id}:${periodId}`) || 0;
  }

  async updateLastAppliedSequence(tenant_id: string, company_id: string, periodId: string, sequence: number): Promise<void> {
    this.sequences.set(`${tenant_id}:${company_id}:${periodId}`, sequence);
  }

  async getClosingSnapshotSequence(tenant_id: string, company_id: string, periodId: string): Promise<number | null> {
    return 999999;
  }
}
