import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class PostingMonitoringService {
  private readonly logger = new Logger(PostingMonitoringService.name);
  
  // Area 5: Real-time metrics store
  private metrics = {
    ledger_posting_total: 0,
    ledger_posting_success: 0,
    ledger_posting_errors: 0,
    ledger_posting_latency_ms_total: 0,
    retryCountAtRepo: 0,
    retryCountAtWorker: 0,
    ledger_reconciliation_mismatches: 0,
    ledger_reconciliation_drift_detected: false,
    ledger_idempotency_rejections: 0,
    selfHealingRepairs: 0,
    dlqSize: 0,
  };

  /**
   * Area 5: Metrics Collection
   */
  recordPosting(success: boolean, latencyMs: number) {
    this.metrics.ledger_posting_total++;
    if (success) this.metrics.ledger_posting_success++;
    else this.metrics.ledger_posting_errors++;
    this.metrics.ledger_posting_latency_ms_total += latencyMs;
  }

  recordRepoRetry() {
    this.metrics.retryCountAtRepo++;
  }

  recordWorkerRetry(attempt: number) {
    this.metrics.retryCountAtWorker++;
    if (attempt > 3) {
      this.logger.warn(`[ALERT] Abnormal retry spike: worker at attempt ${attempt}`);
    }
  }

  recordReconciliationResult(tenant_id: string, company_id: string, accountId: string, journalSum: any, balanceRecord: any, status: 'MATCH' | 'MISMATCH', currency: string) {
    if (status === 'MISMATCH') {
      this.metrics.ledger_reconciliation_mismatches++;
      this.metrics.ledger_reconciliation_drift_detected = true;
      const drift = journalSum.minus ? journalSum.minus(balanceRecord).abs().toString() : 'UNKNOWN';
      this.logger.error(`[CRITICAL_DRIFT_ALERT] Reconciliation mismatch detected for Account ${accountId} (${currency}) in Company ${company_id}. Drift: ${drift}`);
    }
  }

  recordSelfHealing() {
    this.metrics.selfHealingRepairs++;
  }

  recordIdempotencyRejection() {
    this.metrics.ledger_idempotency_rejections++;
  }

  /**
   * Provides a summary of the Posting Gateway's health and throughput.
   */
  async getDashboardSummary() {
    const avgLatency = this.metrics.ledger_posting_total > 0 
      ? Math.round(this.metrics.ledger_posting_latency_ms_total / this.metrics.ledger_posting_total) 
      : 0;
    
    const successRate = this.metrics.ledger_posting_total > 0
      ? ((this.metrics.ledger_posting_success / this.metrics.ledger_posting_total) * 100).toFixed(1) + '%'
      : '100%';
 
    return {
      totalPostings: this.metrics.ledger_posting_total,
      successRate,
      avgLatencyMs: avgLatency,
      repoRetries: this.metrics.retryCountAtRepo,
      workerRetries: this.metrics.retryCountAtWorker,
      idempotencyRejections: this.metrics.ledger_idempotency_rejections,
      reconciliationMismatches: this.metrics.ledger_reconciliation_mismatches,
      selfHealingRepairs: this.metrics.selfHealingRepairs,
      dlqSize: this.metrics.dlqSize,
      criticalAlerts: this.metrics.ledger_reconciliation_mismatches > 0 ? [
        { id: Date.now(), type: 'RECON_MISMATCH', message: `${this.metrics.ledger_reconciliation_mismatches} mismatches detected. DRIFT detected.` }
      ] : [],
      stateDistribution: {
        POSTED: this.metrics.ledger_posting_success,
        FAILED: this.metrics.ledger_posting_errors,
        DLQ: this.metrics.dlqSize,
      }
    };
  }

  /**
   * Triggers a manual notification for DLQ intervention.
   */
  async notifyOperator(request_id: string, message: string) {
    this.logger.error(`[ALERT] Operator notified for Request ${request_id}: ${message}`);
  }
}
