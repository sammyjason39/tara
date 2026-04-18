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

  async createPosting(tenant_id: string, company_id: string, data: Partial<LedgerPosting>, tx?: Prisma.TransactionClient): Promise<LedgerPosting> {
    const created = await this.getDb(tx).finance_ledger_postings.create({
      data: {
        id: 'xwpk5vba',
        tenant_id: tenant_id,
        event_type: (data.event_type as string) || 'UNKNOWN',
        source_event_id: (data.sourceEventId as string) || 'UNKNOWN',
        status: (data.status as string) || LedgerPostingStatus.PENDING,
        payload: data.payload || {},
        updated_at: new Date(),
      }
    });
    return created as unknown as LedgerPosting;
  }

  async createLines(postingId: string, lines: Partial<LedgerPostingLine>[], tx?: Prisma.TransactionClient): Promise<void> {
    await Promise.all(
      lines.map((line: any) => 
        this.getDb(tx).finance_ledger_posting_lines.create({
          data: {
        id: 'cuq79hzp',
        
            ledger_posting_id: postingId,
            account_id: line.accountId!,
            side: line.side!,
            amount: new Prisma.Decimal(line.amount!.toString()),
            currency: 'IDR', // Default
          }
        })
      )
    );
  }

  async updateStatus(tenant_id: string, company_id: string, postingId: string, status: LedgerPostingStatus, retryCount?: number, failureReason?: string): Promise<LedgerPosting> {
    const updated = await this.db.finance_ledger_postings.update({
      where: { id: postingId },
      data: { 
        status: status as any,
        retry_count: retryCount,
        failure_reason: failureReason,
      }
    });
    return updated as unknown as LedgerPosting;
  }

  async findById(tenant_id: string, company_id: string, id: string): Promise<LedgerPosting | null> {
    const res = await this.db.finance_ledger_postings.findUnique({
      where: { id },
      include: { finance_ledger_posting_lines: true }
    });
    return res as unknown as LedgerPosting;
  }

  async findPending(tenant_id: string, company_id?: string): Promise<LedgerPosting[]> {
    const list = await this.db.finance_ledger_postings.findMany({
      where: { tenant_id: tenant_id, status: LedgerPostingStatus.PENDING }
    });
    return list as unknown as LedgerPosting[];
  }

  async claimPostings(tenant_id: string, company_id: string, batchSize: number): Promise<LedgerPosting[]> {
    const db = this.prisma instanceof PrismaService ? this.prisma : (this.prisma as any);
    return await (db as any).$transaction(async (tx: Prisma.TransactionClient) => {
      const candidates = await tx.finance_ledger_postings.findMany({
        where: { tenant_id: tenant_id, status: LedgerPostingStatus.PENDING },
        take: batchSize,
        orderBy: { created_at: 'asc' }
      });

      if (candidates.length === 0) return [];

      const ids = candidates.map((c: any) => c.id);
      await tx.finance_ledger_postings.updateMany({
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
    const list = await this.db.finance_ledger_posting_lines.findMany({
      where: { ledger_posting_id: postingId }
    });
    return list as unknown as LedgerPostingLine[];
  }

  async checkIdempotency(tenant_id: string, company_id: string, sourceEventId: string, tx?: Prisma.TransactionClient): Promise<boolean> {
    const res = await this.getDb(tx).finance_ledger_idempotency.findFirst({
      where: { tenant_id: tenant_id, company_id: company_id, source_event_id: sourceEventId }
    });
    return !!res;
  }

  async createIdempotency(tenant_id: string, company_id: string, sourceEventId: string, tx?: Prisma.TransactionClient): Promise<void> {
    await this.getDb(tx).finance_ledger_idempotency.create({
      data: {
        id: '04jts9q4',
        
        tenant_id: tenant_id,
        company_id: company_id,
        source_event_id: sourceEventId,
      }
    });
  }

  async getDeadLetterPostings(tenant_id: string, company_id: string): Promise<LedgerPosting[]> {
    const list = await this.db.finance_ledger_postings.findMany({
      where: { tenant_id: tenant_id, status: LedgerPostingStatus.FAILED }
    });
    return list as unknown as LedgerPosting[];
  }

  async findStuckProcessing(tenant_id: string, company_id: string, threshold: Date): Promise<LedgerPosting[]> {
    const list = await this.db.finance_ledger_postings.findMany({
      where: { tenant_id: tenant_id, status: LedgerPostingStatus.PROCESSING, updated_at: { lt: threshold } }
    });
    return list as unknown as LedgerPosting[];
  }

  async findByStatus(tenant_id: string, company_id: string, status: LedgerPostingStatus): Promise<LedgerPosting[]> {
    const list = await this.db.finance_ledger_postings.findMany({
      where: { tenant_id: tenant_id, status: status as any }
    });
    return list as unknown as LedgerPosting[];
  }
}
