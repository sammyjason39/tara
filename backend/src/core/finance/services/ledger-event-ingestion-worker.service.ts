import { Injectable, Logger, Inject } from '@nestjs/common';
import { LedgerPostingService } from './ledger-posting.service';
import { LedgerEventLogMockRepository } from '../repositories/ledger-event-log.mock.repository';

@Injectable()
export class LedgerEventIngestionWorker {
  private readonly logger = new Logger(LedgerEventIngestionWorker.name);
  private isProcessing = false;

  constructor(
    private readonly ledgerPostingService: LedgerPostingService,
    @Inject('ILedgerEventLogRepository')
    private readonly eventLogRepo: any, // Using any for mock or interface
  ) {}

  /**
   * Polls for unprocessed financial events and ingests them into the ledger posting queue.
   */
  async pollAndIngest(batchSize: number = 100): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const events = await this.eventLogRepo.findUnprocessed(batchSize);
      if (events.length === 0) return;

      this.logger.log(`Ingesting ${events.length} financial events from log to ledger posting queue...`);

      // Phase 6: Ingestion Ordering Safety
      // Group by sequenceKey and sort by sequenceNumber
      const groupedEvents: Map<string, any[]> = new Map();
      const independentEvents: any[] = [];

      for (const event of events) {
        if (event.sequenceKey) {
          const group = groupedEvents.get(event.sequenceKey) || [];
          group.push(event);
          groupedEvents.set(event.sequenceKey, group);
        } else {
          independentEvents.push(event);
        }
      }

      // Process independent events concurrently
      await Promise.allSettled(independentEvents.map((event: any) => this.ingestEvent(event)));

      // Process grouped events sequentially per group
      for (const [key, group] of groupedEvents.entries()) {
        const sortedGroup = group.sort((a, b) => Number(a.sequenceNumber) - Number(b.sequenceNumber));
        for (const event of sortedGroup) {
          await this.ingestEvent(event);
        }
      }

      this.logger.log(`Successfully ingested ${events.length} events.`);
    } catch (error) {
      this.logger.error(`Event Ingestion Failed: ${error.message}`);
    } finally {
      this.isProcessing = false;
    }
  }

  private async ingestEvent(event: any): Promise<void> {
    // 1. Convert to LedgerPosting
    await this.ledgerPostingService.enqueuePosting(
      event.tenant_id,
      event.company_id || 'COMP_DEFAULT',
      event.event_type,
      event.id,
      event.payload,
      event.sequenceKey,
      event.sequenceNumber ? Number(event.sequenceNumber) : undefined
    );

    // 2. Mark as processed
    await this.eventLogRepo.markProcessed(event.id);
  }
}
