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

  async create(tenantId: string, companyId: string, data: any): Promise<LedgerEventLog> {
    const created = await this.db.ledgerEventLog.create({
      data: {
        id: 'radzh1s1',
        updatedAt: new Date(),
        tenantId,
        companyId, // Correctly including companyId
        eventType: data.eventType,
        sourceEventId: data.sourceEventId,
        status: data.status || 'PENDING',
        payload: data.payload,
      }
    });
    return created as unknown as LedgerEventLog;
  }

  async findBySourceEventId(tenantId: string, companyId: string, sourceEventId: string): Promise<LedgerEventLog | null> {
    const res = await this.db.ledgerEventLog.findUnique({
      where: { tenantId_companyId_sourceEventId: { tenantId, companyId, sourceEventId } }
    });
    return res as unknown as LedgerEventLog;
  }

  async updateStatus(tenantId: string, companyId: string, id: string, status: 'PENDING' | 'POSTED' | 'FAILED'): Promise<void> {
    await this.db.ledgerEventLog.update({
      where: { id },
      data: { status }
    });
  }

  async findUnprocessed(tenantId: string, companyId: string, batchSize: number): Promise<LedgerEventLog[]> {
    const list = await this.db.ledgerEventLog.findMany({
      where: { tenantId, companyId, status: 'PENDING' },
      take: batchSize,
      orderBy: { createdAt: 'asc' }
    });
    return list as unknown as LedgerEventLog[];
  }

  async markProcessed(tenantId: string, companyId: string, id: string): Promise<void> {
    await this.updateStatus(tenantId, companyId, id, 'POSTED');
  }

  async findProcessedBefore(tenantId: string, companyId: string, date: Date): Promise<LedgerEventLog[]> {
    const list = await this.db.ledgerEventLog.findMany({
      where: { tenantId, companyId, status: 'POSTED', createdAt: { lt: date } }
    });
    return list as unknown as LedgerEventLog[];
  }

  async deleteMany(tenantId: string, companyId: string, ids: string[]): Promise<void> {
    await this.db.ledgerEventLog.deleteMany({
      where: { id: { in: ids } }
    });
  }
}
