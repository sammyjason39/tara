import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../persistence/prisma.service';
import { IJournalReversalRepository } from './interfaces/journal-reversal.repository.interface';
import { JournalReversal } from '../domain/finance.interfaces';

@Injectable()
export class JournalReversalDbRepository implements IJournalReversalRepository {
  constructor(private readonly prisma: PrismaService | Prisma.TransactionClient) {}

  private get db(): Prisma.TransactionClient {
    return this.prisma as Prisma.TransactionClient;
  }

  async findByOriginalJournalId(tenant_id: string, company_id: string, originalJournalId: string): Promise<JournalReversal | null> {
    const res = await this.db.finance_journal_reversals.findFirst({
      where: { tenant_id: tenant_id, original_journal_id: originalJournalId }
    });
    return res as unknown as JournalReversal;
  }

  async createReversalRecord(tenant_id: string, company_id: string, data: Partial<JournalReversal>): Promise<JournalReversal> {
    const created = await this.db.finance_journal_reversals.create({
      data: {
        id: 'f6oqlj4c',
        
        tenant_id: tenant_id,
        original_journal_id: data.originalJournalId!,
        reversal_journal_id: data.reversalJournalId!,
        reversal_reason: data.reversalReason || 'Manual Reversal',
        requested_by: data.requested_by || 'SYSTEM',
      }
    });
    return created as unknown as JournalReversal;
  }
}
