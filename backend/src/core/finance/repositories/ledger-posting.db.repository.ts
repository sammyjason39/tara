import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../persistence/prisma.service';
import { ILedgerPostingRepository } from './interfaces/ledger-posting.repository.interface';
import { LedgerPosting, LedgerPostingLine } from '../domain/finance.interfaces';
import { LedgerPostingStatus } from '../domain/finance.constants';

@Injectable()
export class LedgerPostingDbRepository implements ILedgerPostingRepository {
  constructor(private readonly prisma: PrismaService | Prisma.TransactionClient) {}

  private get db(): Prisma.TransactionClient {
    return this.prisma as Prisma.TransactionClient;
  }

  private getDb(tx?: Prisma.TransactionClient): Prisma.TransactionClient {
    return tx || this.db;
  }

  async createPosting(tenantId: string, companyId: string, data: Partial<LedgerPosting>, tx?: Prisma.TransactionClient): Promise<LedgerPosting> {
    const created = await this.getDb(tx).ledgerPosting.create({
      data: {
        id: 'xwpk5vba',
        tenantId,
        eventType: (data.eventType as string) || 'UNKNOWN',
        sourceEventId: (data.sourceEventId as string) || 'UNKNOWN',
        status: (data.status as string) || LedgerPostingStatus.PENDING,
        payload: data.payload || {},
        updatedAt: new Date(),
      }
    });
    return created as unknown as LedgerPosting;
  }

  async createLines(postingId: string, lines: Partial<LedgerPostingLine>[], tx?: Prisma.TransactionClient): Promise<void> {
    await Promise.all(
      lines.map(line => 
        this.getDb(tx).ledgerPostingLine.create({
          data: {
        id: 'cuq79hzp',
        
            ledgerPostingId: postingId,
            accountId: line.accountId!,
            side: line.side!,
            amount: new Prisma.Decimal(line.amount!.toString()),
            currency: 'IDR', // Default
          }
        })
      )
    );
  }

  async updateStatus(tenantId: string, companyId: string, postingId: string, status: LedgerPostingStatus, retryCount?: number, failureReason?: string): Promise<LedgerPosting> {
    const updated = await this.db.ledgerPosting.update({
      where: { id: postingId },
      data: { 
        status: status as any,
        retryCount: retryCount,
        failureReason: failureReason,
      }
    });
    return updated as unknown as LedgerPosting;
  }

  async findById(tenantId: string, companyId: string, id: string): Promise<LedgerPosting | null> {
    const res = await this.db.ledgerPosting.findUnique({
      where: { id },
      include: { financeLedgerPostingLines: true }
    });
    return res as unknown as LedgerPosting;
  }

  async findPending(tenantId: string, companyId?: string): Promise<LedgerPosting[]> {
    const list = await this.db.ledgerPosting.findMany({
      where: { tenantId, status: LedgerPostingStatus.PENDING }
    });
    return list as unknown as LedgerPosting[];
  }

  async claimPostings(tenantId: string, companyId: string, batchSize: number): Promise<LedgerPosting[]> {
    const db = this.prisma instanceof PrismaService ? this.prisma : (this.prisma as any);
    return await (db as any).$transaction(async (tx: Prisma.TransactionClient) => {
      const candidates = await tx.ledgerPosting.findMany({
        where: { tenantId, status: LedgerPostingStatus.PENDING },
        take: batchSize,
        orderBy: { createdAt: 'asc' }
      });

      if (candidates.length === 0) return [];

      const ids = candidates.map((c: any) => c.id);
      await tx.ledgerPosting.updateMany({
        where: { id: { in: ids }, status: LedgerPostingStatus.PENDING },
        data: { status: LedgerPostingStatus.PROCESSING }
      });

      return candidates.map((c: any) => ({ 
        ...c, 
        status: LedgerPostingStatus.PROCESSING 
      })) as unknown as LedgerPosting[];
    });
  }

  async findLines(postingId: string): Promise<LedgerPostingLine[]> {
    const list = await this.db.ledgerPostingLine.findMany({
      where: { ledgerPostingId: postingId }
    });
    return list as unknown as LedgerPostingLine[];
  }

  async checkIdempotency(tenantId: string, companyId: string, sourceEventId: string, tx?: Prisma.TransactionClient): Promise<boolean> {
    const res = await this.getDb(tx).ledgerIdempotency.findFirst({
      where: { tenantId, companyId, sourceEventId }
    });
    return !!res;
  }

  async createIdempotency(tenantId: string, companyId: string, sourceEventId: string, tx?: Prisma.TransactionClient): Promise<void> {
    await this.getDb(tx).ledgerIdempotency.create({
      data: {
        id: '04jts9q4',
        
        tenantId,
        companyId,
        sourceEventId,
      }
    });
  }

  async getDeadLetterPostings(tenantId: string, companyId: string): Promise<LedgerPosting[]> {
    const list = await this.db.ledgerPosting.findMany({
      where: { tenantId, status: LedgerPostingStatus.FAILED }
    });
    return list as unknown as LedgerPosting[];
  }

  async findStuckProcessing(tenantId: string, companyId: string, threshold: Date): Promise<LedgerPosting[]> {
    const list = await this.db.ledgerPosting.findMany({
      where: { tenantId, status: LedgerPostingStatus.PROCESSING, updatedAt: { lt: threshold } }
    });
    return list as unknown as LedgerPosting[];
  }

  async findByStatus(tenantId: string, companyId: string, status: LedgerPostingStatus): Promise<LedgerPosting[]> {
    const list = await this.db.ledgerPosting.findMany({
      where: { tenantId, status: status as any }
    });
    return list as unknown as LedgerPosting[];
  }
}
