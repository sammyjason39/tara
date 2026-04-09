import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CashTransaction, TransactionType } from '../domain/cash.interfaces';
import { PostingGatewayService } from './posting-gateway.service';
import { FiscalPeriodService } from './fiscal-period.service';
import { AccountingMappingService } from './accounting-mapping.service';
import { SubledgerEntryStatus, SubledgerEntryType, FinanceSubledgerEntry, AccountingDirection } from '../entities/finance-subledger.entity';
import { v4 as uuid } from 'uuid';

@Injectable()
export class CashTransactionService {
  private readonly logger = new Logger(CashTransactionService.name);

  constructor(
    private readonly gateway: PostingGatewayService,
    private readonly fiscalPeriodService: FiscalPeriodService,
    private readonly mappingService: AccountingMappingService,
  ) {}

  /**
   * Records a cash inflow or outflow and triggers financial posting.
   * Standardized Lifecycle: PENDING -> VALIDATED -> POSTING -> POSTED
   */
  async recordTransaction(transaction: CashTransaction): Promise<void> {
    this.logger.log(`Recording Cash ${transaction.type} transaction of ${transaction.amount} ${transaction.currency}`);

    // 1. Resolve Fiscal Period
    const currentPeriodId = await this.fiscalPeriodService.validatePeriodOpenForPosting(
      transaction.tenantId,
      transaction.companyId,
      'SYS_AUTO',
      'SYS_USER'
    );

    // 2. Resolve Accounting Mapping
    const entryType = transaction.type === TransactionType.IN 
        ? SubledgerEntryType.CASH_RECEIPT 
        : SubledgerEntryType.CASH_DISBURSEMENT;
        
    const mapping = await this.mappingService.resolveAccounts(
        transaction.tenantId,
        transaction.companyId,
        entryType,
        'BANK_TX'
    );

    const postingRequestId = uuid();

    // 3. Create Subledger Entry (VALIDATED)
    // Micro-Hardened with Source Module, Direction, and FX context
    const subledgerEntry: Partial<FinanceSubledgerEntry> = {
        id: uuid(),
        tenantId: transaction.tenantId,
        companyId: transaction.companyId,
        sourceModule: 'CASH_MANAGEMENT',
        referenceType: 'BANK_TX',
        referenceId: transaction.id,
        postingRequestId,
        entryType,
        status: SubledgerEntryStatus.VALIDATED,
        direction: transaction.type === TransactionType.IN 
            ? AccountingDirection.DEBIT 
            : AccountingDirection.CREDIT,
        amount: new Prisma.Decimal(transaction.amount),
        currency: transaction.currency,
        baseAmount: new Prisma.Decimal(transaction.amount),
        baseCurrency: 'USD',
        exchangeRate: new Prisma.Decimal(1.0),
        debitAccountId: mapping.debitAccountId,
        creditAccountId: mapping.creditAccountId,
        accountingPeriodId: currentPeriodId,
        effectiveDate: new Date(), // Business date (Audit Hardening)
        createdAt: new Date(),
    };

    // 4. Trigger Financial Posting (POSTING)
    subledgerEntry.status = SubledgerEntryStatus.POSTING;

    const postingRequest = {
        requestId: postingRequestId,
        tenantId: transaction.tenantId,
        companyId: transaction.companyId,
        sourceModule: subledgerEntry.sourceModule,
        sourceEventId: transaction.id,
        eventType: entryType,
        payload: {
          bankAccountId: transaction.bankAccountId,
          amount: transaction.amount,
          currency: transaction.currency,
          description: transaction.description,
          fiscalPeriodId: currentPeriodId,
          debitAccountId: mapping.debitAccountId,
          creditAccountId: mapping.creditAccountId,
          direction: subledgerEntry.direction,
          baseAmount: subledgerEntry.baseAmount,
          exchangeRate: subledgerEntry.exchangeRate,
        },
        createdAt: new Date(),
    };

    const result = await this.gateway.postEvent(postingRequest as any);
    
    if (result.status === 'POSTED') {
      transaction.status = 'POSTED';
      subledgerEntry.status = SubledgerEntryStatus.POSTED;
      subledgerEntry.glJournalId = result.journalId;
      subledgerEntry.postedAt = new Date();
      this.logger.log(`Cash transaction ${transaction.id} successfully posted: ${result.journalId}`);
    } else {
      transaction.status = 'FAILED';
      subledgerEntry.status = SubledgerEntryStatus.FAILED;
      subledgerEntry.failureMessage = result.errorMessage;
      this.logger.error(`Cash posting failed: ${result.errorMessage}`);
      throw new Error(`Financial posting failed: ${result.errorMessage}`);
    }
  }

  /**
   * VOID Logic: Allowed ONLY before POSTED
   */
  async voidTransaction(transaction: CashTransaction): Promise<void> {
    if (transaction.status === 'POSTED') {
        throw new Error('Cannot VOID a posted transaction. Use REVERSAL workflow.');
    }
    
    transaction.status = 'VOIDED' as any;
    this.logger.log(`Cash transaction ${transaction.id} marked as VOIDED.`);
  }
}
