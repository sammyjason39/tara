import { Injectable, Inject, BadRequestException, Logger } from '@nestjs/common';
import { AuditService } from '../../../shared/audit/audit.service';
import { IJournalRepository } from '../repositories/interfaces/journal.repository.interface';
import { IAccountBalanceRepository } from '../repositories/interfaces/account-balance.repository.interface';
import { IJournalReversalRepository } from '../repositories/interfaces/journal-reversal.repository.interface';
import { IFiscalPeriodRepository } from '../repositories/interfaces/fiscal.repository.interface';
import { IUnitOfWork } from '../repositories/interfaces/uow.interface';
import { JournalStatus, FiscalPeriodStatus, PostingSide } from '../domain/finance.constants';
import { Prisma } from '@prisma/client';
import { JournalDbRepository } from '../repositories/journal.db.repository';
import { AccountBalanceDbRepository } from '../repositories/account-balance.db.repository';
import { JournalReversalDbRepository } from '../repositories/journal-reversal.db.repository';
import { FiscalPeriodDbRepository } from '../repositories/fiscal-period.db.repository';

@Injectable()
export class JournalReversalService {
  private readonly logger = new Logger(JournalReversalService.name);

  constructor(
    @Inject('IJournalRepository')
    private readonly journalRepo: IJournalRepository,
    @Inject('IAccountBalanceRepository')
    private readonly balanceRepo: IAccountBalanceRepository,
    @Inject('IJournalReversalRepository')
    private readonly reversalRepo: IJournalReversalRepository,
    @Inject('IFiscalPeriodRepository')
    private readonly fiscalRepo: IFiscalPeriodRepository,
    @Inject('IUnitOfWork')
    private readonly uow: IUnitOfWork,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Reverses a POSTED journal entry atomically.
   *
   * ATOMICITY CONTRACT:
   *   All validation reads AND writes execute inside a single RepeatableRead
   *   transaction, using tx-bound repository instances (NOT the injected
   *   singletons, which are bound to the base connection and would auto-commit
   *   independently). Either the full reversal commits — reversal entry, its
   *   lines, balance updates, trace record, and the original status flip — or
   *   nothing does. Audit logging happens AFTER commit so an audit failure can
   *   never roll back a valid financial reversal.
   */
  async reverseJournal(
    tenant_id: string,
    company_id: string,
    journalId: string,
    reason: string,
    requested_by: string,
  ): Promise<string> {
    let reversalJournalId = '';

    await this.uow.execute(async (tx: Prisma.TransactionClient) => {
      // tx-bound repositories: every read/write below participates in THIS transaction.
      const journalRepoTx = new JournalDbRepository(tx);
      const balanceRepoTx = new AccountBalanceDbRepository(tx);
      const reversalRepoTx = new JournalReversalDbRepository(tx);
      const fiscalRepoTx = new FiscalPeriodDbRepository(tx as any);

      // 1. Load + validate the original journal (inside tx → race-safe snapshot).
      const originalJournal = await journalRepoTx.findById(tenant_id, company_id, journalId);
      if (!originalJournal) {
        throw new BadRequestException(`Journal ${journalId} not found`);
      }
      if (originalJournal.status === JournalStatus.REVERSED) {
        throw new BadRequestException(`Journal ${journalId} is already REVERSED.`);
      }
      if (originalJournal.status !== JournalStatus.POSTED) {
        throw new BadRequestException(
          `Only POSTED journals can be reversed. Current status is ${originalJournal.status}`,
        );
      }

      // 2. Guard against double reversal (inside tx).
      const existingReversal = await reversalRepoTx.findByOriginalJournalId(
        tenant_id,
        company_id,
        journalId,
      );
      if (existingReversal) {
        throw new BadRequestException(
          `Journal ${journalId} has already been reversed by Reversal ID ${existingReversal.id}`,
        );
      }

      // 3. Fiscal period must be open enough to accept a reversal.
      const fiscalPeriod = await fiscalRepoTx.findById(
        tenant_id,
        company_id,
        originalJournal.fiscalPeriodId,
      );
      if (
        !fiscalPeriod ||
        fiscalPeriod.status === FiscalPeriodStatus.HARD_LOCK ||
        fiscalPeriod.status === FiscalPeriodStatus.CLOSED
      ) {
        throw new BadRequestException(
          `Cannot reverse journal. Fiscal period ${originalJournal.fiscalPeriodId} is ${fiscalPeriod?.status || 'NOT_FOUND'}.`,
        );
      }

      const originalLines = await journalRepoTx.findLines(journalId);
      if (originalLines.length === 0) {
        throw new BadRequestException('Original journal has no lines.');
      }

      // Issue HMAC posting context for the reversal.
      const postingCtx = (await import('../domain/posting-context-factory')).PostingContextFactory.issue(
        tenant_id,
        company_id,
      );

      // 4. Create the reversal journal header.
      const reversalJournal = await journalRepoTx.createEntry(postingCtx, {
        tenant_id,
        company_id,
        ref: `REV-${originalJournal.id}-${Date.now()}`,
        fiscalPeriodId: originalJournal.fiscalPeriodId,
        postingDate: new Date(),
        status: JournalStatus.POSTED,
        sourceEventId: `reversal_${originalJournal.sourceEventId || originalJournal.id}`,
      });

      // 5. Transpose lines (Debit -> Credit, Credit -> Debit).
      // NOTE: findLines returns raw snake_case DB rows, so we read snake_case
      // fields (with camelCase fallback) and must carry account_code.
      const reversalLines = originalLines.map((line: any) => ({
        accountId: line.account_id ?? line.accountId,
        accountCode: line.account_code ?? line.accountCode,
        side: line.side === PostingSide.DEBIT ? PostingSide.CREDIT : PostingSide.DEBIT,
        amount: line.amount,
        currency: line.currency ?? 'IDR',
        branch_id: line.branch_id,
        dimensionBranchId: line.branch_id ?? line.dimensionBranchId,
        dimensionChannelId: line.dimension_channel_id ?? line.dimensionChannelId,
        location_id: line.location_id,
        departmentId: line.department_id ?? line.departmentId,
        costCenterId: line.cost_center_id ?? line.costCenterId,
        projectId: line.project_id ?? line.projectId,
        dimensionCostCenterId: line.cost_center_id ?? line.dimensionCostCenterId,
        dimensionDepartmentId: line.department_id ?? line.dimensionDepartmentId,
        dimensionProjectId: line.project_id ?? line.dimensionProjectId,
      }));

      await journalRepoTx.createLines(postingCtx, reversalJournal.id, reversalLines);

      // 6. Update account balances (tx-bound).
      for (const line of reversalLines) {
        await this.updateAccountBalance(
          balanceRepoTx,
          tenant_id,
          company_id,
          originalJournal.fiscalPeriodId,
          line,
        );
      }

      // 7. Create the reversal trace record.
      await reversalRepoTx.createReversalRecord(tenant_id, company_id, {
        originalJournalId: originalJournal.id,
        reversalJournalId: reversalJournal.id,
        reversalReason: reason,
        requested_by,
      });

      // 8. Flip the original journal to REVERSED.
      await journalRepoTx.updateStatus(
        tenant_id,
        company_id,
        originalJournal.id,
        JournalStatus.REVERSED,
      );

      reversalJournalId = reversalJournal.id;
      this.logger.log(
        `Successfully reversed journal ${originalJournal.id} into ${reversalJournal.id}`,
      );
    });

    // 9. Audit logging AFTER commit — must not be able to roll back the reversal.
    if (this.auditService?.log) {
      try {
        await this.auditService.log({
          tenant_id,
          user_id: requested_by || 'SYSTEM',
          module: 'FINANCE',
          action: 'REVERSE_JOURNAL',
          entity_type: 'JournalEntry',
          entity_id: journalId,
          metadata: { company_id, reversalJournalId, reason, requested_by },
        });
      } catch (err: any) {
        this.logger.error(`Reversal audit log failed (reversal already committed): ${err?.message}`);
      }
    }

    return reversalJournalId;
  }

  private async updateAccountBalance(
    balanceRepo: IAccountBalanceRepository,
    tenant_id: string,
    company_id: string,
    fiscalPeriodId: string,
    line: any,
  ): Promise<void> {
    const params = {
      fiscalPeriodId,
      accountId: line.accountId,
      currency: line.currency,
      branch_id: line.dimensionBranchId || line.branch_id || '',
      location_id: line.location_id || '',
      departmentId: line.dimensionDepartmentId || line.departmentId,
      costCenterId: line.dimensionCostCenterId || line.costCenterId,
      projectId: line.dimensionProjectId || line.projectId,
    };

    const isDebit = line.side === PostingSide.DEBIT;
    // Using Decimal for all math.
    const amount = new Prisma.Decimal(line.amount);

    // Atomic increment via the tx-bound repository.
    await balanceRepo.incrementBalance(tenant_id, company_id, params, {
      debit: isDebit ? amount : undefined,
      credit: !isDebit ? amount : undefined,
      net: isDebit ? amount : amount.negated(),
    });
  }
}
