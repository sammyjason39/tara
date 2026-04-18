import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../persistence/prisma.service';
import { IFiscalPeriodRepository } from './interfaces/fiscal.repository.interface';
import { FinanceFiscalYear, FinanceFiscalPeriod, PeriodClosingRecord, ClosingExecutionLock } from '../domain/finance.interfaces';
import { FiscalPeriodStatus } from '../domain/finance.constants';

@Injectable()
export class FiscalPeriodDbRepository implements IFiscalPeriodRepository {
  constructor(private readonly prisma: PrismaService) {}

  private get db(): Prisma.TransactionClient {
    return this.prisma as Prisma.TransactionClient;
  }

  async findYear(tenant_id: string, company_id: string, year: number): Promise<FinanceFiscalYear | null> {
    const period = await this.db.finance_fiscal_periods.findFirst({
      where: { tenant_id: tenant_id, name: { startsWith: year.toString() } }
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
      where: { tenant_id: tenant_id, name: { startsWith: yearId } }
    });
    return list as unknown as FinanceFiscalPeriod[];
  }

  async findById(tenant_id: string, company_id: string, id: string): Promise<FinanceFiscalPeriod | null> {
    const res = await this.db.finance_fiscal_periods.findUnique({
      where: { id }
    });
    return res as unknown as FinanceFiscalPeriod;
  }

  async updateStatus(tenant_id: string, company_id: string, periodId: string, status: FiscalPeriodStatus): Promise<FinanceFiscalPeriod> {
    const updated = await this.db.finance_fiscal_periods.update({
      where: { id: periodId },
      data: { status: status as any }
    });
    return updated as unknown as FinanceFiscalPeriod;
  }

  async createYear(tenant_id: string, company_id: string, data: Partial<FinanceFiscalYear>): Promise<FinanceFiscalYear> {
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
        id: 'bj15i9qd',
        updated_at: new Date(),
        tenant_id: tenant_id,
        name: data.id || '', 
        start_date: data.start_date || new Date(),
        end_date: data.end_date || new Date(),
        status: (data.status as any) || FiscalPeriodStatus.OPEN,
      }
    });
    return created as unknown as FinanceFiscalPeriod;
  }

  async saveClosingRecord(tenant_id: string, company_id: string, record: PeriodClosingRecord): Promise<PeriodClosingRecord> {
    return record;
  }

  async getClosingRecord(tenant_id: string, company_id: string, periodId: string): Promise<PeriodClosingRecord | null> {
    return null;
  }

  async acquireLock(tenant_id: string, company_id: string, periodId: string): Promise<void> {
  }

  async getExecutionLock(tenant_id: string, company_id: string, periodId: string): Promise<ClosingExecutionLock | null> {
    return null;
  }

  async saveExecutionLock(tenant_id: string, company_id: string, lock: ClosingExecutionLock): Promise<void> {
  }

  async releaseExecutionLock(tenant_id: string, company_id: string, periodId: string): Promise<void> {
  }
}
