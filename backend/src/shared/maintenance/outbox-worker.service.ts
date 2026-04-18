import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../persistence/prisma.service';
import { EventBusService } from '../events/event-bus.service';

/**
 * OutboxWorkerService
 * Reliable event emission using the Outbox Pattern.
 * Polling events from sys_outbox_events and publishing to the EventBus.
 */
@Injectable()
export class OutboxWorkerService {
  private readonly logger = new Logger(OutboxWorkerService.name);
  private isProcessing = false;
  private readonly MAX_ATTEMPTS = 5;
  private readonly CONCURRENCY_LIMIT = 5;
  private readonly ERROR_THRESHOLD = 0.2; // 20% failure rate
  private errorCount = 0;
  private totalProcessedInWindow = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
  ) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  async handleOutbox() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const now = new Date();
      // PHASE 1-5: Production Guarded Query
      const events = await this.prisma.sys_outbox_events.findMany({
        where: {
          OR: [
            { status: 'PENDING' },
            { 
              status: 'FAILED', 
              attempts: { lt: this.MAX_ATTEMPTS },
              next_retry_at: { lte: now }
            },
          ],
        },
        take: 50, // Batch limit (Backpressure)
        orderBy: { created_at: 'asc' },
      });

      if (events.length === 0) {
        this.isProcessing = false;
        return;
      }

      // PHASE 4: Event Prioritization
      const prioritizedEvents = this.prioritize(events);
      
      // PHASE 5: Degradation Check
      const isDegraded = this.checkDegradation();
      if (isDegraded) {
        this.logger.warn('System in DEGRADED MODE. Suspending non-critical event processing.');
      }

      this.logger.log(`Processing ${prioritizedEvents.length} outbox events (Backpressure: 5 concurrent)...`);

      // PHASE 3: Concurrency Control (Backpressure)
      for (let i = 0; i < prioritizedEvents.length; i += this.CONCURRENCY_LIMIT) {
        const batch = prioritizedEvents.slice(i, i + this.CONCURRENCY_LIMIT);
        await Promise.all(batch.map(event => {
          // In degraded mode, only process HIGH priority
          if (isDegraded && this.getPriority(event.type) > 1) {
             return Promise.resolve(); 
          }
          return this.processEvent(event);
        }));
      }

      // Reset error window counters periodically (simple approach)
      if (this.totalProcessedInWindow > 100) {
        this.errorCount = 0;
        this.totalProcessedInWindow = 0;
      }

    } catch (error) {
      this.logger.error('Error in outbox worker:', error.stack);
    } finally {
      this.isProcessing = false;
    }
  }

  private async processEvent(event: any) {
    this.totalProcessedInWindow++;
    try {
      // Robust JSON Parsing for SQLite/Prisma compatibility
      let payload = event.payload;
      if (typeof payload === 'string') {
        try {
          payload = JSON.parse(payload);
        } catch (e) {
          this.logger.error(`Failed to parse outbox payload for event ${event.id}: ${e.message}`);
        }
      }

      await this.eventBus.publish({
        event_type: event.type,
        tenant_id: event.tenant_id,
        payload: {
          ...(payload as any),
          _metadata: {
            eventId: event.id,
            version: 'v1',
            timestamp: event.created_at,
          },
        },
        source_module: 'HR',
        entity_id: (payload as any).employee_id || (payload as any).payrollRunId || (payload as any).id || event.id,
        entity_type: event.type.split('.')[1]?.toUpperCase() || 'UNKNOWN',
      });

      await this.prisma.sys_outbox_events.update({
        where: { id: event.id },
        data: { status: 'PROCESSED', updated_at: new Date() },
      });
    } catch (error) {
      this.errorCount++;
      const nextAttempt = event.attempts + 1;
      // PHASE 1: Exponential Backoff (2^attempts * 30s)
      const waitSeconds = Math.pow(2, nextAttempt) * 30;
      const nextRetryAt = new Date(Date.now() + waitSeconds * 1000);

      this.logger.error(`Failed to process outbox event ${event.id} (Attempt ${nextAttempt}): ${error.message}`);
      
      await this.prisma.sys_outbox_events.update({
        where: { id: event.id },
        data: { 
          status: 'FAILED', 
          attempts: nextAttempt,
          last_error: error.message,
          next_retry_at: nextRetryAt,
          updated_at: new Date(),
        },
      }).catch(() => {});
    }
  }

  private prioritize(events: any[]) {
    return [...events].sort((a, b) => this.getPriority(a.type) - this.getPriority(b.type));
  }

  private getPriority(type: string): number {
    if (type.includes('payroll') || type.includes('hired')) return 1; // HIGH
    if (type.includes('attendance') || type.includes('leave')) return 2; // MEDIUM
    return 3; // LOW (insights, etc)
  }

  private checkDegradation(): boolean {
    if (this.totalProcessedInWindow < 10) return false;
    return (this.errorCount / this.totalProcessedInWindow) > this.ERROR_THRESHOLD;
  }
}
