import { Injectable, Inject, BadRequestException, Logger } from '@nestjs/common';
import { AuditService } from '../../../shared/audit/audit.service';
import { IJournalRepository } from '../repositories/interfaces/journal.repository.interface';
import { IAccountBalanceRepository } from '../repositories/interfaces/account-balance.repository.interface';
import { IJournalReversalRepository } from '../repositories/interfaces/journal-reversal.repository.interface';
import { IFiscalPeriodRepository } from '../repositories/interfaces/fiscal.repository.interface';
import { IUnitOfWork } from '../repositories/interfaces/uow.interface';
import { JournalStatus, FiscalPeriodStatus, PostingSide } from '../domain/finance.constants';
import { Prisma } from '@prisma/client';

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

  async reverseJournal(
    tenantId: string, 
    companyId: string,
    journalId: string, 
    reason: string, 
    requestedBy: string
  ): Promise<string> {
    const originalJournal = await this.journalRepo.findById(tenantId, companyId, journalId);
    if (!originalJournal) {
      throw new BadRequestException(`Journal ${journalId} not found`);
    }

    if (originalJournal.status === JournalStatus.REVERSED) {
      throw new BadRequestException(`Journal ${journalId} is already REVERSED.`);
    }

    if (originalJournal.status !== JournalStatus.POSTED) {
      throw new BadRequestException(`Only POSTED journals can be reversed. Current status is ${originalJournal.status}`);
    }

    const existingReversal = await this.reversalRepo.findByOriginalJournalId(tenantId, companyId, journalId);

    if (existingReversal) {
      throw new BadRequestException(`Journal ${journalId} has already been reversed by Reversal ID ${existingReversal.id}`);
    }



    const fiscalPeriod = await this.fiscalRepo.findById(tenantId, companyId, originalJournal.fiscalPeriodId);
    if (!fiscalPeriod || 
        fiscalPeriod.status === FiscalPeriodStatus.HARD_LOCK || 
        fiscalPeriod.status === FiscalPeriodStatus.CLOSED) {
      throw new BadRequestException(`Cannot reverse journal. Fiscal period ${originalJournal.fiscalPeriodId} is ${fiscalPeriod?.status || 'NOT_FOUND'}.`);
    }

    const originalLines = await this.journalRepo.findLines(journalId);
    if (originalLines.length === 0) {
      throw new BadRequestException('Original journal has no lines.');
    }

    return await this.uow.execute(async () => {
      // Issue HMAC posting context for reversal
      const postingCtx = (await import('../domain/posting-context-factory')).PostingContextFactory.issue(tenantId, companyId);

      // 1. Create the Reversal Journal
      const reversalJournal = await this.journalRepo.createEntry(postingCtx, {
        tenantId,
        companyId,
        fiscalPeriodId: originalJournal.fiscalPeriodId,
        postingDate: new Date(),
        status: JournalStatus.POSTED,
        sourceEventId: `reversal_${originalJournal.sourceEventId || originalJournal.id}`,
      });

      // 2. Transpose Lines (Debit -> Credit, Credit -> Debit)
      const reversalLines = originalLines.map(line => ({
        accountId: line.accountId,
        side: line.side === PostingSide.DEBIT ? PostingSide.CREDIT : PostingSide.DEBIT,
        amount: line.amount,
        currency: line.currency,
        branchId: line.branchId,
        dimensionBranchId: line.dimensionBranchId,
        dimensionChannelId: line.dimensionChannelId,
        locationId: line.locationId,
        departmentId: line.departmentId,
        costCenterId: line.costCenterId,
        projectId: line.projectId,
        dimensionCostCenterId: line.dimensionCostCenterId,
        dimensionDepartmentId: line.dimensionDepartmentId,
        dimensionProjectId: line.dimensionProjectId,
      }));

      await this.journalRepo.createLines(postingCtx, reversalJournal.id, reversalLines);

      // 3. Update Balances
      for (const line of reversalLines) {
        await this.updateAccountBalance(tenantId, companyId, originalJournal.fiscalPeriodId, line);
      }

      // 4. Create Trace Record
      await this.reversalRepo.createReversalRecord(tenantId, companyId, {
        originalJournalId: originalJournal.id,
        reversalJournalId: reversalJournal.id,
        reversalReason: reason,
        requestedBy,
      });

      // 5. Update Original Journal Status
      await this.journalRepo.updateStatus(tenantId, companyId, originalJournal.id, JournalStatus.REVERSED);

      // 6. Audit Logging
      if (this.auditService?.log) {
        await this.auditService.log({
          tenantId,
          userId: requestedBy || 'SYSTEM',
          module: 'FINANCE',
          action: 'REVERSE_JOURNAL',
          entityType: 'JournalEntry',
          entityId: originalJournal.id,
          metadata: { companyId, reversalJournalId: reversalJournal.id, reason, requestedBy },
        });
      }

      this.logger.log(`Successfully reversed journal ${originalJournal.id} into ${reversalJournal.id}`);
      return reversalJournal.id;
    });
  }

  private async updateAccountBalance(tenantId: string, companyId: string, fiscalPeriodId: string, line: any): Promise<void> {
    const params = {
      fiscalPeriodId,
      accountId: line.accountId,
      currency: line.currency,
      branchId: line.dimensionBranchId || line.branchId || '',
      locationId: line.locationId || '',
      departmentId: line.dimensionDepartmentId || line.departmentId,
      costCenterId: line.dimensionCostCenterId || line.costCenterId,
      projectId: line.dimensionProjectId || line.projectId,
    };

    const isDebit = line.side === PostingSide.DEBIT;
    // Area 1: Using Decimal for all math
    const amount = new Prisma.Decimal(line.amount);
    
    // Area 1: Perform atomic increment via repository
    await this.balanceRepo.incrementBalance(tenantId, companyId, params, {
      debit: isDebit ? amount : undefined,
      credit: !isDebit ? amount : undefined,
      net: isDebit ? amount : amount.negated(),
    });
  }
}
