import { Injectable } from '@nestjs/common';
import { FinanceFiscalYear, FinanceFiscalPeriod, PeriodClosingRecord, ClosingExecutionLock } from '../domain/finance.interfaces';
import { IFiscalPeriodRepository } from './interfaces/fiscal.repository.interface';
import { FiscalPeriodStatus } from '../domain/finance.constants';

@Injectable()
export class FiscalMockRepository implements IFiscalPeriodRepository {
  /** Key: `${tenant_id}:${company_id}` */
  private years: Map<string, FinanceFiscalYear[]> = new Map();
  /** Key: `${tenant_id}:${company_id}` */
  private periods: Map<string, FinanceFiscalPeriod[]> = new Map();
  /** Key: `${tenant_id}:${company_id}` */
  private closingRecords: Map<string, PeriodClosingRecord[]> = new Map();
  /** Key: `${tenant_id}:${company_id}` */
  private executionLocks: Map<string, ClosingExecutionLock[]> = new Map();
  /** Key: `${tenant_id}:${company_id}:${periodId}` */
  private activeLocks: Set<string> = new Set();

  async findYear(tenant_id: string, company_id: string, year: number): Promise<FinanceFiscalYear | null> {
    const list = this.years.get(`${tenant_id}:${company_id}`) || [];
    return list.find((y) => y.year === year) || null;
  }

  async findPeriods(tenant_id: string, company_id: string, yearId: string): Promise<FinanceFiscalPeriod[]> {
    const list = this.periods.get(`${tenant_id}:${company_id}`) || [];
    return list.filter((p) => (p as any).fiscalYearId === yearId);
  }

  async findById(tenant_id: string, company_id: string, id: string): Promise<FinanceFiscalPeriod | null> {
    const list = this.periods.get(`${tenant_id}:${company_id}`) || [];
    return list.find((p) => p.id === id) || null;
  }

  async updateStatus(tenant_id: string, company_id: string, periodId: string, status: FiscalPeriodStatus): Promise<FinanceFiscalPeriod> {
    const scopeKey = `${tenant_id}:${company_id}`;
    const list = this.periods.get(scopeKey) || [];
    const index = list.findIndex((p) => p.id === periodId);
    if (index === -1) throw new Error('Period not found');

    list[index] = { ...list[index], status, updated_at: new Date() };
    this.periods.set(scopeKey, list);
    return list[index];
  }

  async createYear(tenant_id: string, company_id: string, data: Partial<FinanceFiscalYear>): Promise<FinanceFiscalYear> {
    const scopeKey = `${tenant_id}:${company_id}`;
    const list = this.years.get(scopeKey) || [];
    const newYear: FinanceFiscalYear = {
      id: data.id || Math.random().toString(36).substr(2, 9),
      tenant_id,
      company_id,
      year: data.year || new Date().getFullYear(),
      start_date: data.start_date || new Date(),
      end_date: data.end_date || new Date(),
      isClosed: false,
      created_at: new Date(),
      updated_at: new Date(),
    };
    list.push(newYear);
    this.years.set(scopeKey, list);
    return newYear;
  }

  async createPeriod(tenant_id: string, company_id: string, data: Partial<FinanceFiscalPeriod>): Promise<FinanceFiscalPeriod> {
    const scopeKey = `${tenant_id}:${company_id}`;
    const list = this.periods.get(scopeKey) || [];
    const newPeriod: FinanceFiscalPeriod = {
      id: data.id || Math.random().toString(36).substr(2, 9),
      tenant_id,
      company_id,
      fiscalYearId: (data as any).fiscalYearId || '',
      periodNumber: (data as any).periodNumber || 1,
      start_date: data.start_date || new Date(),
      end_date: data.end_date || new Date(),
      status: data.status || FiscalPeriodStatus.OPEN,
      created_at: new Date(),
      updated_at: new Date(),
    } as any;
    list.push(newPeriod);
    this.periods.set(scopeKey, list);
    return newPeriod;
  }

  async saveClosingRecord(tenant_id: string, company_id: string, record: PeriodClosingRecord): Promise<PeriodClosingRecord> {
    const scopeKey = `${tenant_id}:${company_id}`;
    const list = this.closingRecords.get(scopeKey) || [];
    list.push(record);
    this.closingRecords.set(scopeKey, list);
    return record;
  }

  async getClosingRecord(tenant_id: string, company_id: string, periodId: string): Promise<PeriodClosingRecord | null> {
    const list = this.closingRecords.get(`${tenant_id}:${company_id}`) || [];
    return list.find((r: any) => r.periodId === periodId) || null;
  }

  async acquireLock(tenant_id: string, company_id: string, periodId: string): Promise<void> {
    const key = `${tenant_id}:${company_id}:${periodId}`;
    if (this.activeLocks.has(key)) {
      throw new Error(`Concurrency Lock Error: Period ${periodId} is currently being processed by another worker.`);
    }
    this.activeLocks.add(key);
  }

  async getExecutionLock(tenant_id: string, company_id: string, periodId: string): Promise<ClosingExecutionLock | null> {
    const list = this.executionLocks.get(`${tenant_id}:${company_id}`) || [];
    return list.find((l) => l.periodId === periodId) || null;
  }

  async saveExecutionLock(tenant_id: string, company_id: string, lock: ClosingExecutionLock): Promise<void> {
    const scopeKey = `${tenant_id}:${company_id}`;
    const list = this.executionLocks.get(scopeKey) || [];
    const index = list.findIndex((l) => l.id === lock.id);
    if (index !== -1) {
      list[index] = { ...lock, updated_at: new Date() };
    } else {
      list.push(lock);
    }
    this.executionLocks.set(scopeKey, list);
    
    if (lock.status === 'COMPLETED') {
      this.activeLocks.delete(`${tenant_id}:${company_id}:${lock.periodId}`);
    }
  }

  async releaseExecutionLock(tenant_id: string, company_id: string, periodId: string): Promise<void> {
    this.activeLocks.delete(`${tenant_id}:${company_id}:${periodId}`);
    const scopeKey = `${tenant_id}:${company_id}`;
    const list = this.executionLocks.get(scopeKey) || [];
    this.executionLocks.set(scopeKey, list.filter(l => l.periodId !== periodId));
  }
}
