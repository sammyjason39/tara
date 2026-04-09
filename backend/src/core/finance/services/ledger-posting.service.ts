import { Injectable, Inject, BadRequestException, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { ILedgerPostingRepository } from '../repositories/interfaces/ledger-posting.repository.interface';
import { IJournalRepository } from '../repositories/interfaces/journal.repository.interface';
import { IAccountBalanceRepository } from '../repositories/interfaces/account-balance.repository.interface';
import { IPostingRuleRepository } from '../repositories/interfaces/posting-rule.repository.interface';
import { IFiscalPeriodRepository } from '../repositories/interfaces/fiscal.repository.interface';
import { 
  LedgerPostingStatus, 
  FiscalPeriodStatus, 
  JournalStatus,
  JournalType,
  PostingSide 
} from '../domain/finance.constants';
import { AccountBalance, FiscalPeriodLockedError } from '../domain/finance.interfaces';
import { IUnitOfWork } from '../repositories/interfaces/uow.interface';
import { JournalValidationService } from './journal-validation.service';
import { DimensionValidationService } from './dimension-validation.service';
import { HashingService } from '../utils/hashing.service';
import { IChartOfAccountRepository } from '../repositories/interfaces/coa.repository.interface';
import { PostingContextFactory } from '../domain/posting-context-factory';
import { LedgerInvariantService } from './ledger-invariant.service';
import { ILedgerEventLogRepository } from '../repositories/interfaces/ledger-event-log.repository.interface';
import { FinancialProjectionWorkerService } from './financial-projection-worker.service';
import { LedgerWorkerService } from '../workers/ledger-worker.service';
import { PostingAuditService } from './posting-audit.service';
import { PostingMonitoringService } from './posting-monitoring.service';
import { forwardRef } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { JournalDbRepository } from '../repositories/journal.db.repository';
import { LedgerPostingDbRepository } from '../repositories/ledger-posting.db.repository';
import { LedgerEventLogDbRepository } from '../repositories/ledger-event-log.db.repository';
import { AccountBalanceDbRepository } from '../repositories/account-balance.db.repository';

@Injectable()
export class LedgerPostingService {
  private readonly logger = new Logger(LedgerPostingService.name);

  constructor(
    @Inject('ILedgerPostingRepository')
    private readonly ledgerRepo: ILedgerPostingRepository,
    @Inject('IJournalRepository')
    private readonly journalRepo: IJournalRepository,
    @Inject('IAccountBalanceRepository')
    private readonly balanceRepo: IAccountBalanceRepository,
    @Inject('IPostingRuleRepository')
    private readonly ruleRepo: IPostingRuleRepository,
    @Inject('IFiscalPeriodRepository')
    private readonly fiscalRepo: IFiscalPeriodRepository,
    @Inject('IChartOfAccountRepository')
    private readonly coaRepo: IChartOfAccountRepository,
    @Inject('ILedgerEventLogRepository')
    private readonly eventLogRepo: ILedgerEventLogRepository,
    @Inject('IUnitOfWork')
    private readonly uow: IUnitOfWork,
    private readonly journalValidator: JournalValidationService,
    private readonly dimensionValidator: DimensionValidationService,
    private readonly ledgerInvariant: LedgerInvariantService,
    private readonly auditService: PostingAuditService,
    @Inject(forwardRef(() => FinancialProjectionWorkerService))
    private readonly projectionWorker: FinancialProjectionWorkerService,
    @Inject(forwardRef(() => LedgerWorkerService))
    private readonly worker: LedgerWorkerService,
    private readonly monitor: PostingMonitoringService,
    private readonly hashingService: HashingService,
  ) {}

  async enqueuePosting(tenantId: string, companyId: string, eventType: string, sourceEventId: string, payload: any, sequenceKey?: string, sequenceNumber?: number, tx?: Prisma.TransactionClient): Promise<string> {
    const isDuplicate = await this.ledgerRepo.checkIdempotency(tenantId, companyId, sourceEventId, tx);
    if (isDuplicate) {
      this.logger.warn(`Idempotency trigger: ignoring duplicate event ${sourceEventId}`);
      return 'DUPLICATE_IGNORED';
    }
    try {
      await this.ledgerRepo.createIdempotency(tenantId, companyId, sourceEventId, tx);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        this.logger.warn(`Idempotency race: duplicate caught by constraint for ${sourceEventId}`);
        return 'DUPLICATE_IGNORED';
      }
      throw err;
    }

    const posting = await this.ledgerRepo.createPosting(tenantId, companyId, {
      eventType,
      sourceEventId,
      status: LedgerPostingStatus.PENDING,
      payload,
      sequenceKey,
      sequenceNumber,
    }, tx);
    
    this.worker.triggerProcess(tenantId, companyId).catch(() => {});
    return posting.id;
  }

  async processEvent(tenantId: string, companyId: string, postingId: string): Promise<void> {
    const startTime = Date.now();
    const posting = await this.ledgerRepo.findById(tenantId, companyId, postingId);
    if (!posting || posting.status !== LedgerPostingStatus.PENDING) return;

    try {
      let eventLog = await this.eventLogRepo.findBySourceEventId(tenantId, companyId, posting.sourceEventId);
      if (eventLog && eventLog.status === 'POSTED') {
        await this.ledgerRepo.updateStatus(tenantId, companyId, posting.id, LedgerPostingStatus.COMPLETED);
        return;
      }

      // Status is already PROCESSING due to repo.claimPostings
      const rule = await this.ruleRepo.findRule(tenantId, companyId, posting.eventType);
      if (!rule) throw new Error(`No rule for ${posting.eventType}`);

      const fiscalPeriodId = posting.payload.fiscalPeriodId;
      const fiscalPeriod = await this.fiscalRepo.findById(tenantId, companyId, fiscalPeriodId);
      if (!fiscalPeriod || 
          fiscalPeriod.status === FiscalPeriodStatus.HARD_LOCK || 
          fiscalPeriod.status === FiscalPeriodStatus.CLOSED ||
          fiscalPeriod.status === FiscalPeriodStatus.CLOSING) {
        throw new FiscalPeriodLockedError(fiscalPeriodId);
      }

      const postingLines = rule.lines.map((line: any) => ({
        accountId: line.accountId,
        side: line.side,
        amount: new Prisma.Decimal(posting.payload[line.amountExpression.split('.')[1]] || 0),
        currency: posting.payload.currency || 'USD',
      }));

      let totalDebit = new Prisma.Decimal(0);
      let totalCredit = new Prisma.Decimal(0);
      for (const line of postingLines) {
        if (line.side === PostingSide.DEBIT) totalDebit = totalDebit.plus(line.amount);
        else totalCredit = totalCredit.plus(line.amount);
      }

      await this.journalValidator.validate({ tenantId, companyId, lines: postingLines, totalDebit, totalCredit, sourceEventId: posting.sourceEventId });

      let postedJournal: any;
      await this.uow.execute(async (tx: Prisma.TransactionClient) => {
        const journalRepoTx = new JournalDbRepository(tx);
        const lastHash = await journalRepoTx.getLastEntryHash(tenantId, companyId);
        const journalId = crypto.randomUUID();
        const timestamp = new Date();
        
        const entryHash = this.hashingService.generateJournalHash({
          previousHash: lastHash || 'GENESIS',
          journalId,
          timestamp,
          lines: postingLines.map((l: { accountId: string; side: PostingSide; amount: Prisma.Decimal }) => ({
            accountId: l.accountId,
            side: l.side,
            amount: l.amount,
          })),
        });

        postedJournal = await journalRepoTx.createEntry({ tenantId, companyId } as any, {
          id: journalId,
          tenantId,
          companyId,
          fiscalPeriodId,
          status: JournalStatus.POSTED,
          journalType: JournalType.NORMAL,
          sourceEventId: posting.sourceEventId,
          previousHash: lastHash || 'GENESIS',
          entryHash,
          effectiveDate: timestamp,
          postingDate: timestamp,
        });

        await journalRepoTx.createLines({ tenantId, companyId } as any, postedJournal.id, postingLines);
        await this.ledgerRepo.updateStatus(tenantId, companyId, posting.id, LedgerPostingStatus.COMPLETED);
      });

      if (postedJournal) {
          this.projectionWorker.onJournalPosted({
              tenantId,
              companyId,
              journalId: postedJournal.id,
              fiscalPeriodId: postedJournal.fiscalPeriodId,
              ledgerSequence: postedJournal.ledgerSequence,
              postingDate: postedJournal.postingDate,
          }).catch(err => this.logger.error(`Projection Worker Failed: ${err.message}`));
      }

    } catch (error) {
       this.logger.error(`Process Failed: ${error.message}`);
       await this.ledgerRepo.updateStatus(tenantId, companyId, postingId, LedgerPostingStatus.FAILED, 0, error.message);
       throw error;
    }
  }
}
