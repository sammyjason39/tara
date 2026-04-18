import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
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

  async findById(tenant_id: string, company_id: string, id: string): Promise<JournalEntry | null> {
    const res = await this.db.finance_journal_entries.findUnique({
      where: { id },
    });
    if (!res) return null;
    return this.mapToDomain(res);
  }

  async findByRef(tenant_id: string, company_id: string, ref: string): Promise<JournalEntry | null> {
    const res = await this.db.finance_journal_entries.findUnique({
      where: { tenant_id_ref: { tenant_id: tenant_id, ref } },
    });
    if (!res) return null;
    return this.mapToDomain(res);
  }

  async findBySequence(tenant_id: string, company_id: string, sequence: number): Promise<JournalEntry | null> {
    const res = await this.db.finance_journal_entries.findFirst({
      where: { tenant_id: tenant_id, ledger_sequence: BigInt(sequence) }
    });
    if (!res) return null;
    return this.mapToDomain(res);
  }

  async findBySequenceRange(tenant_id: string, company_id: string, fromSeq: number, toSeq: number): Promise<JournalEntry[]> {
    const list = await this.db.finance_journal_entries.findMany({
      where: {
        tenant_id: tenant_id,
        ledger_sequence: { gte: BigInt(fromSeq), lte: BigInt(toSeq) }
      },
      orderBy: { ledger_sequence: 'asc' }
    });
    return list.map((item: any) => this.mapToDomain(item));
  }

  async findLines(entryId: string): Promise<JournalLine[]> {
    const list = await this.db.finance_journal_lines.findMany({
      where: { journal_entry_id: entryId }
    });
    return list as unknown as JournalLine[];
  }

  async findAllOrderedByDate(tenant_id: string, company_id: string): Promise<JournalEntry[]> {
    const list = await this.db.finance_journal_entries.findMany({
      where: { tenant_id: tenant_id },
      orderBy: { posting_date: 'asc' }
    });
    return list.map((item: any) => this.mapToDomain(item));
  }

  async getLastEntryHash(tenant_id: string, company_id: string): Promise<string | null> {
    const res = await this.db.finance_journal_entries.findFirst({
      where: { tenant_id: tenant_id },
      orderBy: { ledger_sequence: 'desc' },
      select: { entry_hash: true }
    });
    return res?.entry_hash || null;
  }

  async createEntry(ctx: LedgerPostingContext, entry: Partial<JournalEntry>): Promise<JournalEntry> {
    const created = await this.db.finance_journal_entries.create({
      data: {
        id: randomUUID(),
        tenant_id: ctx.tenant_id,
        ref: entry.ref!,
        fiscal_period_id: entry.fiscalPeriodId!,
        posting_date: entry.postingDate || new Date(),
        effective_date: entry.effectiveDate || new Date(),
        status: (entry.status as string) || 'DRAFT',
        journal_type: (entry.journalType as string) || 'NORMAL',
        description: entry.memo,
        memo: entry.memo,
        source_event_id: entry.sourceEventId,
        previous_hash: entry.previousHash,
        entry_hash: entry.entryHash,
        ledger_sequence: entry.ledgerSequence ? BigInt(entry.ledgerSequence) : undefined,
        updated_at: new Date(),
      }
    });
    return this.mapToDomain(created);
  }

  async createLines(ctx: LedgerPostingContext, entryId: string, lines: Partial<JournalLine>[]): Promise<void> {
    await Promise.all(
      lines.map((line: any) => 
        this.db.finance_journal_lines.create({
          data: {
            id: randomUUID(),
            tenant_id: ctx.tenant_id,
            journal_entry_id: entryId,
            account_id: line.accountId!,
            account_code: line.accountCode!,
            side: line.side as string,
            amount: new Prisma.Decimal(line.amount!.toString()),
            debit: line.side === PostingSide.DEBIT ? new Prisma.Decimal(line.amount!.toString()) : new Prisma.Decimal(0),
            credit: line.side === PostingSide.CREDIT ? new Prisma.Decimal(line.amount!.toString()) : new Prisma.Decimal(0),
            description: line.description,
            branch_id: line.branch_id || line.dimensionBranchId,
            location_id: line.location_id || line.dimensionBranchId,
            department_id: line.departmentId || line.dimensionDepartmentId,
            cost_center_id: line.costCenterId || line.dimensionCostCenterId,
            project_id: line.projectId || line.dimensionProjectId,
          }
        })
      )
    );
  }

  async updateStatus(tenant_id: string, company_id: string, id: string, status: JournalStatus): Promise<JournalEntry> {
    const updated = await this.db.finance_journal_entries.update({
      where: { id },
      data: { status: status as string }
    });
    return this.mapToDomain(updated);
  }

  async getRawBalances(tenant_id: string, company_id: string, periodId: string, start_date: Date, end_date: Date): Promise<Record<string, Prisma.Decimal>> {
    const lines = await this.db.finance_journal_lines.findMany({
      where: {
        tenant_id: tenant_id,
        finance_journal_entries: {
          fiscal_period_id: periodId,
          posting_date: { gte: start_date, lte: end_date },
          status: 'POSTED'
        }
      },
      select: { account_id: true, amount: true, side: true }
    });

    const balances: Record<string, Prisma.Decimal> = {};
    for (const line of lines) {
      const amount = line.side === PostingSide.DEBIT ? line.amount : line.amount.negated();
      if (!balances[line.account_id]) balances[line.account_id] = new Prisma.Decimal(0);
      balances[line.account_id] = balances[line.account_id].plus(amount);
    }
    return balances;
  }

  async countDraftsInPeriod(tenant_id: string, company_id: string, periodId: string): Promise<number> {
    return this.db.finance_journal_entries.count({
      where: {
        tenant_id: tenant_id,
        fiscal_period_id: periodId,
        status: JournalStatus.DRAFT,
      }
    });
  }

  async voidDraftsInPeriod(tenant_id: string, company_id: string, periodId: string): Promise<void> {
    await this.db.finance_journal_entries.updateMany({
      where: {
        tenant_id: tenant_id,
        fiscal_period_id: periodId,
        status: JournalStatus.DRAFT,
      },
      data: {
        status: 'VOID' as JournalStatus, 
      }
    });
  }

  private mapToDomain(item: any): JournalEntry {
    return {
      ...item,
      ledgerSequence: item.ledger_sequence ? Number(item.ledger_sequence) : 0,
      tenant_id: item.tenant_id,
      fiscalPeriodId: item.fiscal_period_id,
      postingDate: item.posting_date,
      effectiveDate: item.effective_date,
      journalType: item.journal_type,
      sourceEventId: item.source_event_id,
      previousHash: item.previous_hash,
      entryHash: item.entry_hash,
    };
  }
}
