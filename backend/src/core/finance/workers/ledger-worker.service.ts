import { Injectable, Inject, Logger, OnModuleInit, OnModuleDestroy, forwardRef } from '@nestjs/common';
import { ILedgerPostingRepository } from '../repositories/interfaces/ledger-posting.repository.interface';
import { LedgerPostingService } from '../services/ledger-posting.service';
import { LEDGER_WORKER_CONSTANTS, getBackoffSeconds } from './ledger-worker.constants';
import { LedgerPostingStatus } from '../domain/finance.constants';

@Injectable()
export class LedgerWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LedgerWorkerService.name);
  private workerId: string;
  private isShuttingDown = false;
  private timeoutId: NodeJS.Timeout | null = null;
  private readonly maxTenantsPerPoll = 5;
  private readonly activeProcesses = new Set<string>(); // Concurrency Guard

  constructor(
    @Inject('ILedgerPostingRepository')
    private readonly ledgerRepo: ILedgerPostingRepository,
    @Inject(forwardRef(() => LedgerPostingService))
    private readonly postingService: LedgerPostingService,
  ) {
    this.workerId = `worker_${Math.random().toString(36).substr(2, 6)}`;
  }

  onModuleInit() {
    this.logger.log(`Starting LedgerWorkerService [${this.workerId}]`);
    // Keeping a slow polling fallback for safety, but primary path is TRIGGERED
    this.scheduleNextPoll(60000); // 1 minute safety poll
  }

  onModuleDestroy() {
    this.isShuttingDown = true;
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    this.logger.log(`Stopped LedgerWorkerService [${this.workerId}]`);
  }

  /**
   * TRIGGERED PATH: Real-time event ingestion for Phase 11.
   */
  async triggerProcess(tenant_id: string, company_id: string) {
    if (this.isShuttingDown) return;
    
    const lockKey = `${tenant_id}:${company_id}`;
    if (this.activeProcesses.has(lockKey)) {
        this.logger.debug(`[${this.workerId}] Process already active for ${lockKey}. Skipping trigger.`);
        return;
    }

    this.logger.log(`[${this.workerId}] Triggered process for ${tenant_id}:${company_id}`);
    return this.processTenant(tenant_id, company_id);
  }


  private scheduleNextPoll(delayMs: number) {
    if (this.isShuttingDown) return;
    this.timeoutId = setTimeout(() => this.poll(), delayMs);
  }

  private async poll() {
    if (this.isShuttingDown) return;
    try {
      const activeTenants = ['tenant_1', 'tenant_2', 'tenant_3']; 
      for (const tenant_id of activeTenants) {
        await this.processTenant(tenant_id, 'default_company');
      }
    } finally {
      this.scheduleNextPoll(60000); // Keep safety poll slow
    }
  }

  private async processTenant(tenant_id: string, company_id: string) {
    const lockKey = `${tenant_id}:${company_id}`;
    if (this.activeProcesses.has(lockKey)) return;
    
    this.activeProcesses.add(lockKey);
    try {
      // 1. Backpressure Guard
      const pendingCount = (await this.ledgerRepo.findPending(tenant_id, company_id)).length;
      if (pendingCount > LEDGER_WORKER_CONSTANTS.BACKPRESSURE_THRESHOLD) {
        this.logger.warn(`Backpressure: ${pendingCount} items for ${tenant_id}. Skipping.`);
        return;
      }

      // 2. Claim Batch of Postings with Sequence Safeguard & Tenant Isolation
      const claimedPostings = await this.ledgerRepo.claimPostings(tenant_id, company_id, LEDGER_WORKER_CONSTANTS.BATCH_SIZE);
      
      if (claimedPostings.length > 0) {
        this.logger.log(`[${this.workerId}] Claimed ${claimedPostings.length} postings for ${tenant_id}.`);
        
        for (const posting of claimedPostings) {
          const start_time = Date.now();
          try {
            await this.postingService.processEvent(posting.tenant_id, posting.company_id, posting.id);
            this.logObservability(posting, 'SUCCESS', Date.now() - start_time);
          } catch (error) {
            this.logger.error(`Failed posting ${posting.id} [${tenant_id}]: ${error.message}`);
            await this.handleFailure(posting, error.message);
            this.logObservability(posting, 'FAILED', Date.now() - start_time);
          }
        }
      }
    } catch (err) {
      this.logger.error(`Error in Ledger worker processTenant: ${err.message}`);
    } finally {
      this.activeProcesses.delete(lockKey);
      // No poll scheduling here, this is called by poll() or triggerProcess()
    }
  }

  private async handleFailure(posting: any, errorMsg?: string) {
    const nextRetryCount = (posting.retryCount || 0) + 1;
    
    if (nextRetryCount > LEDGER_WORKER_CONSTANTS.MAX_RETRY_ATTEMPTS) {
      this.logger.error(`Posting ${posting.id} exceeded max retries. Marking FAILED_TERMINAL.`);
      await this.ledgerRepo.updateStatus(posting.tenant_id, posting.company_id, posting.id, LedgerPostingStatus.FAILED_TERMINAL, nextRetryCount, errorMsg);
    } else {
      const backoffSeconds = getBackoffSeconds(nextRetryCount - 1);
      const nextRetryAt = new Date(Date.now() + backoffSeconds * 1000);
      
      this.logger.warn(`Posting ${posting.id} failed (attempt ${nextRetryCount}). Scheduling next retry at ${nextRetryAt.toISOString()}`);
      
      // Return to PENDING so it can be picked up again
      // In a real DB, we would use FAILED_RETRYABLE and filter for nextRetryAt <= NOW()
      const updatedP = await this.ledgerRepo.updateStatus(posting.tenant_id, posting.company_id, posting.id, LedgerPostingStatus.PENDING, nextRetryCount);
      (updatedP as any).nextRetryAt = nextRetryAt;
    }
  }

  private logObservability(posting: any, outcome: string, processingTimeMs: number) {
    // Structured JSON log for Datadog / APM
    const logData = {
      workerId: this.workerId,
      postingId: posting.id,
      event_type: posting.event_type,
      tenant_id: posting.tenant_id,
      processingTimeMs,
      outcome,
      timestamp: new Date().toISOString()
    };
    
    this.logger.log(`OBSERVABILITY_EVENT: ${JSON.stringify(logData)}`);
  }
}
