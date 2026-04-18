import { Injectable, Logger, Inject } from '@nestjs/common';
import { 
  FinancialPostingRequest, 
  FinancialPostingResult, 
  PostingState 
} from '../domain/posting-gateway.interfaces';
import { PostingLockManager } from '../guards/posting-lock';
import { ILedgerEventLogRepository } from '../repositories/interfaces/ledger-event-log.repository.interface';
import { FinancialEventRegistryService } from './financial-event-registry.service';
import { AccountResolverService } from './account-resolver.service';
import { DimensionResolverService } from './dimension-resolver.service';
import { PostingValidatorService } from './posting-validator.service';
import { FiscalPeriodGuard } from '../guards/fiscal-period.guard';
import { LedgerPostingAdapter } from '../adapters/ledger-posting.adapter';
import { PostingAuditService } from './posting-audit.service';
import { JournalDraftStore } from './journal-draft-store';
import { ExchangeRateService } from './exchange-rate.service';
import { PostingSide } from '../domain/finance.constants';

@Injectable()
export class PostingGatewayService {
  private readonly logger = new Logger(PostingGatewayService.name);

  constructor(
    private readonly lockManager: PostingLockManager,
    private readonly registry: FinancialEventRegistryService,
    private readonly accountResolver: AccountResolverService,
    private readonly dimensionResolver: DimensionResolverService,
    private readonly validator: PostingValidatorService,
    private readonly fiscalGuard: FiscalPeriodGuard,
    private readonly adapter: LedgerPostingAdapter,
    private readonly audit: PostingAuditService,
    private readonly draftStore: JournalDraftStore,
    private readonly exchangeRateService: ExchangeRateService,
    @Inject('ILedgerEventLogRepository')
    private readonly eventLogRepo: ILedgerEventLogRepository,
  ) {}

  /**
   * Main entry point for all financial postings.
   */
  async postEvent(request: FinancialPostingRequest): Promise<FinancialPostingResult> {
    const start_time = Date.now();
    const { tenant_id, company_id, sourceEventId, event_type, eventVersion } = request;
    let currentState = PostingState.RECEIVED;

    // 1. Guard: Event Registry
    if (!this.registry.isValid(event_type, eventVersion)) {
      return this.failResult(request, 'ERR-UNREGISTERED', `Access denied: ${event_type}`);
    }

    // 2. Acquire Concurrency Lock
    const lockAcquired = await this.lockManager.acquire(tenant_id, company_id, sourceEventId);
    if (!lockAcquired) {
      return this.failResult(request, 'ERR-LOCKED', 'Concurrent processing detected.');
    }

    try {
      // 3. Idempotency Guard
      const existing = await this.eventLogRepo.findBySourceEventId(tenant_id, company_id, sourceEventId);
      if (existing && existing.status === 'POSTED') {
          return { request_id: request.request_id, status: PostingState.POSTED, attempts: 1 };
      }

      await this.audit.recordTransition(request.request_id, PostingState.RECEIVED, PostingState.VALIDATED);
      currentState = PostingState.VALIDATED;

      // 4. Resolve Currencies & Rates
      const transactionCurrency = request.payload.currency || 'USD';
      const baseCurrency = 'USD'; // Centralized tenant base
      const rateInfo = await this.exchangeRateService.getRate(transactionCurrency, baseCurrency);

      // 5. Account & Dimension Resolution
      const dimensions = await this.dimensionResolver.resolveDimensions(request.payload, request.metadata);
      
      // 6. Journal Drafting
      const draftLines = [
        { 
          accountId: await this.accountResolver.resolve(tenant_id, company_id, 'revenue', request.payload), 
          side: PostingSide.CREDIT, 
          amount: request.payload.total,
          baseAmount: request.payload.total * rateInfo.rate,
          ...dimensions 
        },
        { 
          accountId: await this.accountResolver.resolve(tenant_id, company_id, 'cash', request.payload), 
          side: PostingSide.DEBIT, 
          amount: request.payload.total,
          baseAmount: request.payload.total * rateInfo.rate,
          ...dimensions 
        }
      ];

      const draft: any = {
        draftId: `DRF-${request.request_id}`,
        request_id: request.request_id,
        tenant_id,
        company_id,
        fiscalPeriodId: request.payload.fiscalPeriodId,
        transactionCurrency,
        baseCurrency,
        exchangeRate: rateInfo.rate,
        lines: draftLines,
        totalDebitBase: request.payload.total * rateInfo.rate,
        totalCreditBase: request.payload.total * rateInfo.rate,
      };

      // 7. PERSISTENCE PATCH: Save draft before final validation/commit
      await this.draftStore.save(draft);

      await this.audit.recordTransition(request.request_id, currentState, PostingState.DRAFT_CREATED);
      currentState = PostingState.DRAFT_CREATED;

      // 8. Double-Entry & Period Validation
      const valResult = await this.validator.validate(draft);
      if (!valResult.isValid) {
        return this.failResult(request, 'ERR-INVALID-DRAFT', valResult.errors.join('|'));
      }

      const periodOk = await this.fiscalGuard.canPost(tenant_id, company_id, draft.fiscalPeriodId);
      if (!periodOk) {
        return this.failResult(request, 'ERR-PERIOD-LOCKED', `Fiscal period ${draft.fiscalPeriodId} is closed.`);
      }

      // 9. Submit to Ledger Core
      const result = await this.adapter.submit(draft);

      // 10. CLEANUP PATCH: Remove draft from store on success
      await this.draftStore.remove(draft.draftId);

      await this.audit.recordTransition(request.request_id, currentState, PostingState.POSTED);
      this.audit.recordMetric('posting_latency_ms', Date.now() - start_time);

      return {
        request_id: request.request_id,
        status: PostingState.POSTED,
        journalId: result.journalId,
        ledgerSequence: result.sequence,
        attempts: 1,
      };

    } catch (error) {
      this.logger.error(`Gateway pipeline failure: ${error.message}`);
      await this.audit.recordTransition(request.request_id, currentState, PostingState.FAILED, error.message);
      return this.failResult(request, 'ERR-SYSTEM', error.message);
    } finally {
      await this.lockManager.release(tenant_id, company_id, sourceEventId);
    }
  }

  private failResult(req: FinancialPostingRequest, code: string, msg: string): FinancialPostingResult {
    return {
      request_id: req.request_id,
      status: PostingState.FAILED,
      errorCode: code,
      errorMessage: msg,
      attempts: 1,
    };
  }
}
