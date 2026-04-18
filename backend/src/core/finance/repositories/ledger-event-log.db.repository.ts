import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../persistence/prisma.service';
import { ILedgerEventLogRepository } from './interfaces/ledger-event-log.repository.interface';
import { LedgerEventLog } from '../domain/finance.interfaces';

@Injectable()
export class LedgerEventLogDbRepository implements ILedgerEventLogRepository {
  constructor(private readonly prisma: PrismaService | Prisma.TransactionClient) {}

  private get db(): Prisma.TransactionClient {
    return this.prisma as Prisma.TransactionClient;
  }

  async create(tenant_id: string, company_id: string, data: any): Promise<LedgerEventLog> {
    const created = await this.db.finance_ledger_event_log.create({
      data: {
        id: require('crypto').randomUUID(),
        updated_at: new Date(),
        tenant_id,
        company_id,
        event_type: data.event_type,
        source_event_id: data.sourceEventId,
        status: data.status || 'PENDING',
        payload: data.payload,
      }
    });
    return created as unknown as LedgerEventLog;
  }

  async findBySourceEventId(tenant_id: string, company_id: string, sourceEventId: string): Promise<LedgerEventLog | null> {
    const res = await this.db.finance_ledger_event_log.findUnique({
      where: { tenant_id_company_id_source_event_id: { tenant_id: tenant_id, company_id: company_id, source_event_id: sourceEventId } }
    });
    return res as unknown as LedgerEventLog;
  }

  async updateStatus(tenant_id: string, company_id: string, id: string, status: 'PENDING' | 'POSTED' | 'FAILED'): Promise<void> {
    await this.db.finance_ledger_event_log.update({
      where: { id },
      data: { status }
    });
  }

  async findUnprocessed(tenant_id: string, company_id: string, batchSize: number): Promise<LedgerEventLog[]> {
    const list = await this.db.finance_ledger_event_log.findMany({
      where: { tenant_id: tenant_id, company_id: company_id, status: 'PENDING' },
      take: batchSize,
      orderBy: { created_at: 'asc' }
    });
    return list as unknown as LedgerEventLog[];
  }

  async markProcessed(tenant_id: string, company_id: string, id: string): Promise<void> {
    await this.updateStatus(tenant_id, company_id, id, 'POSTED');
  }

  async findProcessedBefore(tenant_id: string, company_id: string, date: Date): Promise<LedgerEventLog[]> {
    const list = await this.db.finance_ledger_event_log.findMany({
      where: { tenant_id: tenant_id, company_id: company_id, status: 'POSTED', created_at: { lt: date } }
    });
    return list as unknown as LedgerEventLog[];
  }

  async deleteMany(tenant_id: string, company_id: string, ids: string[]): Promise<void> {
    await this.db.finance_ledger_event_log.deleteMany({
      where: { id: { in: ids } }
    });
  }
}
