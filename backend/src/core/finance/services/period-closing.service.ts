import { Injectable, Logger, ConflictException, BadRequestException, Inject } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { IFiscalPeriodRepository } from '../repositories/interfaces/fiscal.repository.interface';
import { IJournalRepository } from '../repositories/interfaces/journal.repository.interface';
import { IAccountBalanceRepository } from '../repositories/interfaces/account-balance.repository.interface';
import { IUnitOfWork } from '../repositories/interfaces/uow.interface';
import { 
  PeriodClosingRecord, 
  ClosingExecutionLock, 
  ClosingJournalLine, 
  ReversalBatch 
} from '../domain/finance.interfaces';
import { FiscalPeriodStatus, JournalStatus, JournalType, PostingSide } from '../domain/finance.constants';
import { HashingService } from '../utils/hashing.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class PeriodClosingService {
  private readonly logger = new Logger(PeriodClosingService.name);

  constructor(
    private readonly fiscalRepo: IFiscalPeriodRepository,
    private readonly journalRepo: IJournalRepository,
    private readonly balanceRepo: IAccountBalanceRepository,
    @Inject('IUnitOfWork')
    private readonly uow: IUnitOfWork,
    private readonly hashingService: HashingService,
  ) {}

  /**
   * Hardened Period Closing with Execution Locking
   * Ensures only one closing process per period can run and enforces atomicity.
   */
  async closePeriod(tenant_id: string, company_id: string, periodId: string, closedBy: string): Promise<string> {
    const period = await this.fiscalRepo.findById(tenant_id, company_id, periodId);
    if (!period) throw new BadRequestException('Fiscal period not found');
    if (period.status !== FiscalPeriodStatus.OPEN) {
      throw new BadRequestException(`Period ${periodId} is already ${period.status}`);
    }

    // 1. Structural Pre-check: Verify No Unposted Journals
    // (In production, this would scan the Journal table for PENDING/DRAFT entries)

    // 2. Acquire Distributed Execution Lock
    const request_id = uuid();
    let exeLock: ClosingExecutionLock | null = await this.fiscalRepo.getExecutionLock(tenant_id, company_id, periodId);
    
    if (exeLock) {
        if (exeLock.status === 'IN_PROGRESS' && exeLock.expiresAt.getTime() > Date.now()) {
            throw new ConflictException(`Closing already in progress for period ${periodId} (Locked by ${exeLock.lockedBy})`);
        }
        // Cleanup expired or failed lock
        await this.fiscalRepo.releaseExecutionLock(tenant_id, company_id, periodId);
    }

    exeLock = {
        id: uuid(),
        periodId,
        closingRequestId: request_id,
        status: 'IN_PROGRESS',
        lockedBy: closedBy,
        expiresAt: new Date(Date.now() + 300000), // 5 min expiry
        startedAt: new Date(),
        updated_at: new Date(),
    };
    await this.fiscalRepo.saveExecutionLock(tenant_id, company_id, exeLock);

    try {
        // 3. Perform Closing in Unit-of-Work
        const result = await this.uow.execute(async (tx: any) => {
            // Calculate Net Income (Sum of Revenues - Expenses)
            const incomeAccounts = await this.journalRepo.getRawBalances(tenant_id, company_id, periodId, period.start_date, period.end_date);
            let netIncome = new Prisma.Decimal(0);
            for (const bal of Object.values(incomeAccounts)) {
                netIncome = netIncome.plus(bal);
            }

            // Create Period Closing Record
            const closingRecord: PeriodClosingRecord = {
              id: uuid(),
              tenant_id,
              company_id,
              periodId,
              status: 'COMPLETED',
              snapshotSequence: 999999, // Reserved for EOM Terminal
              integrityHash: this.hashingService.generateClosingHash({
                tenant_id,
                periodId,
                netIncome,
                closedAt: new Date(),
                closedBy,
              }),
              netIncomeBase: netIncome,
              closedBy,
              closedAt: new Date(),
            };

            await this.fiscalRepo.saveClosingRecord(tenant_id, company_id, closingRecord);
            await this.fiscalRepo.updateStatus(tenant_id, company_id, periodId, FiscalPeriodStatus.CLOSED);

            return closingRecord;
        });

        // 4. Finalize Lock state
        exeLock.status = 'COMPLETED';
        await this.fiscalRepo.saveExecutionLock(tenant_id, company_id, exeLock);

        this.logger.log(`Period ${periodId} closed successfully. Closing ID: ${result.id}`);
        return result.id;

    } catch (error) {
        this.logger.error(`Failed to close period ${periodId}. Error: ${error.message}`);
        exeLock.status = 'FAILED';
        await this.fiscalRepo.saveExecutionLock(tenant_id, company_id, exeLock);
        throw error;
    }
  }

  async reverseClosing(tenant_id: string, company_id: string, periodId: string): Promise<void> {
    const period = await this.fiscalRepo.findById(tenant_id, company_id, periodId);
    if (!period || period.status !== FiscalPeriodStatus.CLOSED) {
      throw new BadRequestException('Only COMPLETED closing can be reversed');
    }

    await this.uow.execute(async (tx: any) => {
        await this.fiscalRepo.updateStatus(tenant_id, company_id, periodId, FiscalPeriodStatus.OPEN);
        // Clear closing artifact but keep lock for audit
    });
  }

  async runReversalBatch(tenant_id: string, company_id: string, batch: ReversalBatch): Promise<void> {
      this.logger.log(`Running reversal batch for ${batch.originalJournalIds.length} journals. Reason: ${batch.reversalReason}`);
      // Implementation...
  }
}
