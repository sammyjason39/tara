import { Injectable, Inject } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../persistence/prisma.service';
import { IFiscalPeriodRepository } from './interfaces/fiscal.repository.interface';
import { FinanceFiscalYear, FinanceFiscalPeriod, PeriodClosingRecord, ClosingExecutionLock } from '../domain/finance.interfaces';
import { FiscalPeriodStatus } from '../domain/finance.constants';
import { v4 as uuid } from 'uuid';

@Injectable()
export class FiscalPeriodDbRepository implements IFiscalPeriodRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService | Prisma.TransactionClient) {}

  private get db(): Prisma.TransactionClient {
    return this.prisma as Prisma.TransactionClient;
  }

  async findYear(tenant_id: string, company_id: string, year: number): Promise<FinanceFiscalYear | null> {
    const period = await this.db.finance_fiscal_periods.findFirst({
      where: { 
        tenant_id: tenant_id, 
        company_id: company_id,
        name: { startsWith: year.toString() } 
      }
    });
    
    if (!period) return null;
    
    return {
      id: year.toString(),
      tenant_id,
      company_id,
      year,
      start_date: period.start_date,
      end_date: period.end_date,
      isClosed: false,
      created_at: period.created_at,
      updated_at: period.updated_at,
    };
  }

  async findPeriods(tenant_id: string, company_id: string, yearId: string): Promise<FinanceFiscalPeriod[]> {
    const list = await this.db.finance_fiscal_periods.findMany({
      where: { 
        tenant_id: tenant_id, 
        company_id: company_id,
        fiscal_year_id: yearId 
      },
      orderBy: { period_number: 'asc' }
    });
    return list.map(p => this.mapEntity(p));
  }

  async findById(tenant_id: string, company_id: string, id: string): Promise<FinanceFiscalPeriod | null> {
    const res = await this.db.finance_fiscal_periods.findUnique({
      where: { id }
    });
    if (!res) return null;
    // Enforce tenant isolation strictly.
    if (res.tenant_id !== tenant_id) return null;
    // Company scoping is best-effort: periods may be created with a null/empty
    // company_id (tenant-level), so only reject when BOTH sides are concrete and differ.
    if (res.company_id && company_id && res.company_id !== company_id) return null;
    return this.mapEntity(res);
  }

  async updateStatus(tenant_id: string, company_id: string, periodId: string, status: FiscalPeriodStatus): Promise<FinanceFiscalPeriod> {
    const updated = await this.db.finance_fiscal_periods.update({
      where: { id: periodId },
      data: { status: status as any }
    });
    return this.mapEntity(updated);
  }

  async createYear(tenant_id: string, company_id: string, data: Partial<FinanceFiscalYear>): Promise<FinanceFiscalYear> {
    // This is mostly a domain object in this repo, but we could persist it if there was a year table
    return {
      ...data,
      id: data.id || data.year?.toString() || '',
      tenant_id,
      company_id,
      isClosed: false,
      created_at: new Date(),
      updated_at: new Date(),
    } as FinanceFiscalYear;
  }

  async createPeriod(tenant_id: string, company_id: string, data: Partial<FinanceFiscalPeriod>): Promise<FinanceFiscalPeriod> {
    const created = await this.db.finance_fiscal_periods.create({
      data: {
        id: data.id || uuid(),
        tenant_id: tenant_id,
        company_id: company_id,
        fiscal_year_id: data.fiscalYearId || '',
        period_number: data.periodNumber || 0,
        name: data.name || data.id || '', 
        start_date: data.start_date || new Date(),
        end_date: data.end_date || new Date(),
        status: (data.status as any) || FiscalPeriodStatus.OPEN,
        updated_at: new Date(),
      }
    });
    return this.mapEntity(created);
  }

  async saveClosingRecord(tenant_id: string, company_id: string, record: PeriodClosingRecord): Promise<PeriodClosingRecord> {
    return record;
  }

  async getClosingRecord(tenant_id: string, company_id: string, periodId: string): Promise<PeriodClosingRecord | null> {
    return null;
  }

  async acquireLock(tenant_id: string, company_id: string, periodId: string): Promise<void> {
    // Implement SELECT FOR UPDATE if needed
  }

  async getExecutionLock(tenant_id: string, company_id: string, periodId: string): Promise<ClosingExecutionLock | null> {
    return null;
  }

  async saveExecutionLock(tenant_id: string, company_id: string, lock: ClosingExecutionLock): Promise<void> {
  }

  async releaseExecutionLock(tenant_id: string, company_id: string, periodId: string): Promise<void> {
  }

  private mapEntity(raw: any): FinanceFiscalPeriod {
    return {
      id: raw.id,
      tenant_id: raw.tenant_id,
      company_id: raw.company_id,
      fiscalYearId: raw.fiscal_year_id,
      periodNumber: raw.period_number,
      name: raw.name,
      start_date: raw.start_date,
      end_date: raw.end_date,
      status: raw.status as FiscalPeriodStatus,
      created_at: raw.created_at,
      updated_at: raw.updated_at,
    };
  }
}
