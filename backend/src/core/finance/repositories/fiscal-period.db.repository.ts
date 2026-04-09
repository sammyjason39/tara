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

  async findYear(tenantId: string, companyId: string, year: number): Promise<FinanceFiscalYear | null> {
    const period = await this.db.fiscalPeriod.findFirst({
      where: { tenantId, name: { startsWith: year.toString() } }
    });
    
    if (!period) return null;
    
    return {
      id: year.toString(),
      tenantId,
      companyId,
      year,
      startDate: period.startDate,
      endDate: period.endDate,
      isClosed: false,
      createdAt: period.createdAt,
      updatedAt: period.updatedAt,
    };
  }

  async findPeriods(tenantId: string, companyId: string, yearId: string): Promise<FinanceFiscalPeriod[]> {
    const list = await this.db.fiscalPeriod.findMany({
      where: { tenantId, name: { startsWith: yearId } }
    });
    return list as unknown as FinanceFiscalPeriod[];
  }

  async findById(tenantId: string, companyId: string, id: string): Promise<FinanceFiscalPeriod | null> {
    const res = await this.db.fiscalPeriod.findUnique({
      where: { id }
    });
    return res as unknown as FinanceFiscalPeriod;
  }

  async updateStatus(tenantId: string, companyId: string, periodId: string, status: FiscalPeriodStatus): Promise<FinanceFiscalPeriod> {
    const updated = await this.db.fiscalPeriod.update({
      where: { id: periodId },
      data: { status: status as any }
    });
    return updated as unknown as FinanceFiscalPeriod;
  }

  async createYear(tenantId: string, companyId: string, data: Partial<FinanceFiscalYear>): Promise<FinanceFiscalYear> {
    return {
      ...data,
      id: data.id || data.year?.toString() || '',
      tenantId,
      companyId,
      isClosed: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as FinanceFiscalYear;
  }

  async createPeriod(tenantId: string, companyId: string, data: Partial<FinanceFiscalPeriod>): Promise<FinanceFiscalPeriod> {
    const created = await this.db.fiscalPeriod.create({
      data: {
        id: 'bj15i9qd',
        updatedAt: new Date(),
        tenantId,
        name: data.id || '', 
        startDate: data.startDate || new Date(),
        endDate: data.endDate || new Date(),
        status: (data.status as any) || FiscalPeriodStatus.OPEN,
      }
    });
    return created as unknown as FinanceFiscalPeriod;
  }

  async saveClosingRecord(tenantId: string, companyId: string, record: PeriodClosingRecord): Promise<PeriodClosingRecord> {
    return record;
  }

  async getClosingRecord(tenantId: string, companyId: string, periodId: string): Promise<PeriodClosingRecord | null> {
    return null;
  }

  async acquireLock(tenantId: string, companyId: string, periodId: string): Promise<void> {
  }

  async getExecutionLock(tenantId: string, companyId: string, periodId: string): Promise<ClosingExecutionLock | null> {
    return null;
  }

  async saveExecutionLock(tenantId: string, companyId: string, lock: ClosingExecutionLock): Promise<void> {
  }

  async releaseExecutionLock(tenantId: string, companyId: string, periodId: string): Promise<void> {
  }
}
