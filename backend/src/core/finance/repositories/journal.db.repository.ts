import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../persistence/prisma.service';
import { IJournalRepository } from './interfaces/journal.repository.interface';
import { JournalEntry, JournalLine, JournalStatus, JournalType, PostingSide } from '../domain/finance.interfaces';
import { LedgerPostingContext } from '../domain/ledger-posting-context';

@Injectable()
export class JournalDbRepository implements IJournalRepository {
  constructor(private readonly prisma: PrismaService | Prisma.TransactionClient) {}

  private get db(): Prisma.TransactionClient {
    return this.prisma as Prisma.TransactionClient;
  }

  async findById(tenantId: string, companyId: string, id: string): Promise<JournalEntry | null> {
    const res = await this.db.journalEntry.findUnique({
      where: { id },
    });
    if (!res) return null;
    return this.mapToDomain(res);
  }

  async findByRef(tenantId: string, companyId: string, ref: string): Promise<JournalEntry | null> {
    const res = await this.db.journalEntry.findUnique({
      where: { tenantId_ref: { tenantId, ref } },
    });
    if (!res) return null;
    return this.mapToDomain(res);
  }

  async findBySequence(tenantId: string, companyId: string, sequence: number): Promise<JournalEntry | null> {
    const res = await this.db.journalEntry.findFirst({
      where: { tenantId, ledgerSequence: BigInt(sequence) }
    });
    if (!res) return null;
    return this.mapToDomain(res);
  }

  async findBySequenceRange(tenantId: string, companyId: string, fromSeq: number, toSeq: number): Promise<JournalEntry[]> {
    const list = await this.db.journalEntry.findMany({
      where: {
        tenantId,
        ledgerSequence: { gte: BigInt(fromSeq), lte: BigInt(toSeq) }
      },
      orderBy: { ledgerSequence: 'asc' }
    });
    return list.map(this.mapToDomain);
  }

  async findLines(entryId: string): Promise<JournalLine[]> {
    const list = await this.db.journalLine.findMany({
      where: { journalEntryId: entryId }
    });
    return list as unknown as JournalLine[];
  }

  async findAllOrderedByDate(tenantId: string, companyId: string): Promise<JournalEntry[]> {
    const list = await this.db.journalEntry.findMany({
      where: { tenantId },
      orderBy: { postingDate: 'asc' }
    });
    return list.map(this.mapToDomain);
  }

  async getLastEntryHash(tenantId: string, companyId: string): Promise<string | null> {
    const res = await this.db.journalEntry.findFirst({
      where: { tenantId },
      orderBy: { ledgerSequence: 'desc' },
      select: { entryHash: true }
    });
    return res?.entryHash || null;
  }

  async createEntry(ctx: LedgerPostingContext, entry: Partial<JournalEntry>): Promise<JournalEntry> {
    const created = await this.db.journalEntry.create({
      data: {
        
        tenantId: ctx.tenantId,
        ref: entry.ref!,
        fiscalPeriodId: entry.fiscalPeriodId!,
        postingDate: entry.postingDate || new Date(),
        effectiveDate: entry.effectiveDate || new Date(),
        status: (entry.status as string) || 'DRAFT',
        journalType: (entry.journalType as string) || 'NORMAL',
        description: entry.memo,
        memo: entry.memo,
        sourceEventId: entry.sourceEventId,
        previousHash: entry.previousHash,
        entryHash: entry.entryHash,
        ledgerSequence: entry.ledgerSequence ? BigInt(entry.ledgerSequence) : undefined,
        updatedAt: new Date(),
      }
    });
    return this.mapToDomain(created);
  }

  async createLines(ctx: LedgerPostingContext, entryId: string, lines: Partial<JournalLine>[]): Promise<void> {
    await Promise.all(
      lines.map(line => 
        this.db.journalLine.create({
          data: {
        
            tenantId: ctx.tenantId,
            journalEntryId: entryId,
            accountId: line.accountId!,
            accountCode: line.accountCode!,
            side: line.side as string,
            amount: new Prisma.Decimal(line.amount!.toString()),
            debit: line.side === PostingSide.DEBIT ? new Prisma.Decimal(line.amount!.toString()) : new Prisma.Decimal(0),
            credit: line.side === PostingSide.CREDIT ? new Prisma.Decimal(line.amount!.toString()) : new Prisma.Decimal(0),
            description: line.description,
            branchId: line.branchId || line.dimensionBranchId,
            locationId: line.locationId || line.dimensionBranchId,
            departmentId: line.departmentId || line.dimensionDepartmentId,
            costCenterId: line.costCenterId || line.dimensionCostCenterId,
            projectId: line.projectId || line.dimensionProjectId,
          }
        })
      )
    );
  }

  async updateStatus(tenantId: string, companyId: string, id: string, status: JournalStatus): Promise<JournalEntry> {
    const updated = await this.db.journalEntry.update({
      where: { id },
      data: { status: status as string }
    });
    return this.mapToDomain(updated);
  }

  async getRawBalances(tenantId: string, companyId: string, periodId: string, startDate: Date, endDate: Date): Promise<Record<string, Prisma.Decimal>> {
    const lines = await this.db.journalLine.findMany({
      where: {
        tenantId,
        financeJournalEntry: {
          fiscalPeriodId: periodId,
          postingDate: { gte: startDate, lte: endDate },
          status: 'POSTED'
        }
      },
      select: { accountId: true, amount: true, side: true }
    });

    const balances: Record<string, Prisma.Decimal> = {};
    for (const line of lines) {
      const amount = line.side === PostingSide.DEBIT ? line.amount : line.amount.negated();
      if (!balances[line.accountId]) balances[line.accountId] = new Prisma.Decimal(0);
      balances[line.accountId] = balances[line.accountId].plus(amount);
    }
    return balances;
  }

  async countDraftsInPeriod(tenantId: string, companyId: string, periodId: string): Promise<number> {
    return this.db.journalEntry.count({
      where: {
        tenantId,
        fiscalPeriodId: periodId,
        status: JournalStatus.DRAFT,
      }
    });
  }

  async voidDraftsInPeriod(tenantId: string, companyId: string, periodId: string): Promise<void> {
    await this.db.journalEntry.updateMany({
      where: {
        tenantId,
        fiscalPeriodId: periodId,
        status: JournalStatus.DRAFT,
      },
      data: {
        status: 'VOID' as JournalStatus, // VOID is standard for rejected drafts in ERP
      }
    });
  }

  private mapToDomain(item: any): JournalEntry {
    return {
      ...item,
      ledgerSequence: item.ledgerSequence ? Number(item.ledgerSequence) : 0,
    } as JournalEntry;
  }
}
