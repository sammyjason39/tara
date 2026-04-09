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

  async findByOriginalJournalId(tenantId: string, companyId: string, originalJournalId: string): Promise<JournalReversal | null> {
    const res = await this.db.journalReversal.findFirst({
      where: { tenantId, originalJournalId }
    });
    return res as unknown as JournalReversal;
  }

  async createReversalRecord(tenantId: string, companyId: string, data: Partial<JournalReversal>): Promise<JournalReversal> {
    const created = await this.db.journalReversal.create({
      data: {
        id: 'f6oqlj4c',
        
        tenantId,
        originalJournalId: data.originalJournalId!,
        reversalJournalId: data.reversalJournalId!,
        reversalReason: data.reversalReason || 'Manual Reversal',
        requestedBy: data.requestedBy || 'SYSTEM',
      }
    });
    return created as unknown as JournalReversal;
  }
}
