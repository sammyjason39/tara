import { v4 as uuidv4 } from 'uuid';
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../persistence/prisma.service';
import { validateEventPayload } from './event.registry';

export interface DomainEvent {
  eventType: string;
  tenantId: string;
  entityId: string;
  entityType: string;
  sourceModule: string;
  payload: any;
  userId?: string;
  correlationId?: string;
  idempotencyKey?: string;
  aggregateId?: string;
  eventReferenceId?: string;
  status?: string;
  processingStartedAt?: Date;
  version?: number;
  createdAt?: Date;
  id?: string; // Persistent ID from Event Store
  tx?: Prisma.TransactionClient; // Prisma.TransactionClient injected during execution
}

export interface EventSubscription {
  eventType: string;
  handlerName: string;
  callback: (event: DomainEvent) => Promise<void> | void;
}

@Injectable()
export class EventBusService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventBusService.name);
  private subscriptions: EventSubscription[] = [];
  private workerInterval: any;
  private readonly isDebugMode = process.env.EVENT_DEBUG_MODE === 'true';

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    // Start retry worker (sweeper)
    this.workerInterval = setInterval(() => this.sweepPendingEvents(), 10000); // 10s sweep
  }

  onModuleDestroy() {
    if (this.workerInterval) {
      clearInterval(this.workerInterval);
    }
  }

  /**
   * Worker method to process pending/failed events.
   * Enforces sequential execution order per aggregateId.
   */
  private async sweepPendingEvents() {
    try {
      const now = new Date();
      // Find deliveries that are PENDING or (FAILED and ready to retry)
      const pendingDeliveries = await this.prisma.eventDelivery.findMany({
        where: {
          OR: [
            { status: 'PENDING' },
            { 
              status: 'FAILED', 
              attempts: { lt: 5 },
              nextRetryAt: { lte: now } 
            }
          ]
        },
        take: 100, // Process in batches
        include: { domainEvents: true }, // Include DomainEvent to read aggregateId
        orderBy: { createdAt: 'asc' } // Preserve strict chronological ordering
      });

      // Group by aggregateId (or NULL) to enforce strict sequential processing per-aggregate
      const aggregateGroups = new Map<string, typeof pendingDeliveries>();
      for (const d of pendingDeliveries as any[]) {
        const key = d.eventId.aggregateId || `NO_AGGREGATE_${d.id}`; // If no aggregate, they run freely
        if (!aggregateGroups.has(key)) aggregateGroups.set(key, []);
        aggregateGroups.get(key)!.push(d);
      }

      // Process aggregates concurrently, but within the SAME aggregate, sequentially
      await Promise.all(
        Array.from(aggregateGroups.entries() as any).map(async ([_groupKey, groupDeliveries]: [any, any[]]) => {
          for (const delivery of groupDeliveries) {
            const sub = this.subscriptions.find(s => s.handlerName === delivery.handlerName);
            if (!sub) continue; 
            await this.executeHandler(delivery.domainEvents.id, delivery.domainEvents as any, sub);
          }
        })
      );

      // --- NEW: Stuck Event Recovery ---
      const timeoutThreshold = new Date(Date.now() - 60000); // 60 seconds
      const stuckEvents = await this.prisma.domainEvent.findMany({
        where: {
          status: 'PROCESSING',
          processingStartedAt: { lt: timeoutThreshold }
        },
        include: { eventDeliveries: true }
      });

      for (const event of stuckEvents) {
        this.logger.warn(`Recovering stuck event ${event.id} (stuck in PROCESSING since ${event.processingStartedAt})`);
        // We move it to FAILED to allow the standard retry logic to pick up the deliveries
        await this.prisma.$transaction(async (tx: any) => {
          await tx.domainEvent.update({
            where: { id: event.id },
            data: { status: 'FAILED' }
          });
          // Also fail any deliveries that are still in PROCESSING for this event
          await tx.eventDelivery.updateMany({
            where: { eventId: event.id, status: 'PROCESSING', tenantId: event.tenantId },
            data: { status: 'FAILED', lastError: 'PROCESSING_TIMEOUT_RECOVERY' }
          });
        });
      }

    } catch (err) {
      this.logger.error(`SWEEP_FAILED: ${err.message}`);
      this.logTrace('SWEEP_FAILED', { eventType: 'SYSTEM_SWEEP', tenantId: 'SYSTEM' } as any, 'SYSTEM', undefined, { error: err.message });
    }
  }

  /**
   * Structured JSON Logger for full platform traceability.
   */
  private logTrace(status: string, event: DomainEvent, actor: string, durationMs?: number, metadata?: any) {
    const trace = {
      timestamp: new Date().toISOString(),
      status,
      eventId: event.id || 'N/A',
      eventType: event.eventType,
      correlationId: event.correlationId || 'N/A',
      aggregateId: event.aggregateId || 'N/A',
      tenantId: event.tenantId,
      actor,
      durationMs,
      ...metadata,
    };

    if (this.isDebugMode) {
      trace.payload = event.payload;
    }

    this.logger.log(`[EVENT_TRACE] ${JSON.stringify(trace)}`);
  }

  /**
   * Subscribe to specific domain events.
   * @param eventType type of event to listen to (e.g. 'PO_RECEIVED')
   * @param handlerName unique identifier for this listener (for idempotency and retries)
   * @param callback function to execute
   */
  subscribe(eventType: string, handlerName: string, callback: (event: DomainEvent) => Promise<void> | void) {
    this.subscriptions.push({ eventType, handlerName, callback });
    this.logger.log(`Registered listener [${handlerName}] for event [${eventType}]`);
    return () => {
      this.subscriptions = this.subscriptions.filter(s => s.handlerName !== handlerName);
    };
  }

  /**
   * Publish a domain event using the Outbox pattern.
   * Persists to DomainEvent and prepares EventDelivery records atomically.
   */
  async publish(event: DomainEvent, injectedTx?: Prisma.TransactionClient) {
    // 0. Default trace fields
    event.correlationId = event.correlationId || `corr_${Math.random().toString(36).substr(2, 9)}`;
    event.idempotencyKey = event.idempotencyKey || `idem_${Math.random().toString(36).substr(2, 9)}`;

    this.logTrace('PUBLISH_STARTED', event, event.sourceModule);

    try {
      // 0. Validate Schema Contract
      validateEventPayload(event.eventType, event.version ?? 1, event.payload);

      const matchingSubs = this.subscriptions.filter(s => s.eventType === event.eventType || s.eventType === '*');

      const execute = async (tx: any) => {
        // 1. Check idempotency if a key was provided
        if (event.idempotencyKey) {
          const existing = await tx.domainEvent.findUnique({
            where: {
              tenantId_idempotencyKey: {
                tenantId: event.tenantId,
                idempotencyKey: event.idempotencyKey,
              }
            }
          });
          if (existing) {
            this.logTrace('PUBLISH_SKIPPED_IDEMPOTENT', event, event.sourceModule);
            return existing;
          }
        }

        // 2. Persist event to the Event Store
        const domainEventRecord = await tx.domainEvent.create({
          data: {
        id: uuidv4(),
        updatedAt: new Date(),
            tenantId: event.tenantId,
            eventType: event.eventType,
            sourceModule: event.sourceModule,
            entityType: event.entityType,
            entityId: event.entityId,
            payload: event.payload as any,
            userId: event.userId ?? null,
            idempotencyKey: event.idempotencyKey ?? null,
            correlationId: event.correlationId ?? null,
            aggregateId: event.aggregateId ?? null,
            eventReferenceId: event.eventReferenceId ?? null,
            status: 'PENDING',
            version: event.version ?? 1,
          },
        });

        // 3. Create EventDelivery rows for all matched subscriptions
        if (matchingSubs.length > 0) {
          await tx.eventDelivery.createMany({
            data: matchingSubs.map(sub => ({
              tenantId: event.tenantId,
              eventId: domainEventRecord.id,
              handlerName: sub.handlerName,
              status: 'PENDING',
              attempts: 0,
            })),
            skipDuplicates: true,
          });
        }

        return domainEventRecord;
      };

      // We perform DomainEvent insertion and EventDelivery tracking in one transaction
      const record = injectedTx 
        ? await execute(injectedTx)
        : await this.prisma.$transaction(async (tx: any) => await execute(tx));

      // 4. Attach generated ID for immediate listener execution wrapper
      (event as any).id = record.id;
      
      // Fire execution asynchronously without awaiting its complete retry cycle
      if (matchingSubs.length > 0) {
        this.processEventDeliveries(record.id, event, matchingSubs).catch(err => {
          this.logTrace('INITIAL_DELIVERY_TRIGGER_FAILED', record as any, 'SYSTEM', undefined, { error: err.message });
        });
      }

      return record;
    } catch (error) {
      this.logTrace('PUBLISH_FAILED', event, event.sourceModule, undefined, { error: error.message });
      throw error;
    }
  }

  /**
   * Immediately attempts execution of an event for its listeners
   */
  private async processEventDeliveries(eventId: string, event: DomainEvent, subscriptions: EventSubscription[]) {
    // Process sequentially by aggregate if they share the identical event
    for (const sub of subscriptions) {
      await this.executeHandler(eventId, event, sub);
    }
  }

  /**
   * Wraps handler execution with atomic status updates, retry tracking, and exponential backoff.
   * Executes business logic inside an active Prisma $transaction.
   */
  async executeHandler(eventId: string, event: DomainEvent, sub: EventSubscription) {
    let delivery: any = null;
    let startTime = Date.now();

    try {
      // 1. Lock delivery
      delivery = await this.prisma.eventDelivery.update({
        where: {
          tenantId_eventId_handlerName: { tenantId: event.tenantId, eventId, handlerName: sub.handlerName }
        },
        data: { status: 'PROCESSING' }
      });

      // 2. Mark parent DomainEvent as PROCESSING
      await this.prisma.domainEvent.update({
        where: { id: eventId },
        data: { status: 'PROCESSING', processingStartedAt: new Date() }
      });

      startTime = Date.now();

      // 3. Open a dedicated TX Wrapper for execution atomicity
      // 2. Start trace
      this.logTrace('HANDLER_STARTED', event, sub.handlerName);

      try {
        // 3. Mark processing started to allow recovery from stuck states
        await this.prisma.domainEvent.update({
          where: { id: eventId },
          data: { status: 'PROCESSING', processingStartedAt: new Date() }
        });

        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('HANDLER_TIMEOUT')), 30000)
        );

        await Promise.race([
          this.prisma.$transaction(async (tx: any) => {
            const transactionalEvent: DomainEvent = { ...event, tx };
            await sub.callback(transactionalEvent);
            await tx.eventDelivery.update({
              where: { id: delivery.id },
              data: { status: 'PROCESSED', updatedAt: new Date() }
            });
          }, { timeout: 15000 }),
          timeoutPromise
        ]);

        const durationMs = Date.now() - startTime;
        this.logTrace('HANDLER_SUCCESS', event, sub.handlerName, durationMs, { retryCount: delivery.attempts });
        
        // 4. Evaluate and collapse parent state 
        await this.resolveDomainEventIfComplete(eventId);

      } catch (innerError) {
        throw innerError; // Rethrow to be caught by the outer catch
      }

    } catch (error) {
      const durationMs = Date.now() - startTime;
      const retryAttempts = delivery?.attempts ?? 0;
      this.logTrace('HANDLER_FAILED', event, sub.handlerName, durationMs, { retryCount: retryAttempts, error: error.message });
      
      // Failure / Retry logic
      this.logger.error(`Error in event listener [${sub.handlerName}]: ${error.message}`);
      
      const currentDelivery = await this.prisma.eventDelivery.findUnique({
        where: { tenantId_eventId_handlerName: { tenantId: event.tenantId, eventId, handlerName: sub.handlerName } }
      });

      if (currentDelivery) {
        const newAttempts = currentDelivery.attempts + 1;
        const maxRetries = 5;
        
        if (newAttempts >= maxRetries) {
          // Dead Letter Queue
          await this.prisma.eventDelivery.update({
            where: { id: currentDelivery.id },
            data: { status: 'DLQ', attempts: newAttempts, lastError: error.message, updatedAt: new Date() }
          });
          // Also mark parent parent FAILED permanently 
          await this.prisma.domainEvent.update({ where: { id: eventId }, data: { status: 'FAILED' }});
          this.logger.error(`Event ${eventId} for [${sub.handlerName}] moved to DEAD LETTER QUEUE (DLQ).`);

          // Emit internal failure event for Workflow Engine
          await this.publish({
            tenantId: event.tenantId,
            eventType: 'WORKFLOW_STEP_FAILED',
            entityId: eventId,
            entityType: 'EVENT_DELIVERY',
            sourceModule: 'EVENT_BUS',
            payload: {
              originalEventType: event.eventType,
              handlerName: sub.handlerName,
              error: error.message,
              correlationId: event.correlationId,
            },
            correlationId: event.correlationId || 'root',
          });
        } else {
          // Retry with exponential backoff (2^attempts * 5 seconds)
          const backoffSeconds = Math.pow(2, newAttempts) * 5;
          const nextRetryAt = new Date(Date.now() + backoffSeconds * 1000);
          
          await this.prisma.eventDelivery.update({
            where: { id: delivery.id },
            data: { status: 'FAILED', attempts: newAttempts, lastError: error.message, nextRetryAt, updatedAt: new Date() }
          });
          this.logger.warn(`Event ${eventId} for [${sub.handlerName}] failed. Retry ${newAttempts}/${maxRetries} scheduled at ${nextRetryAt.toISOString()}`);
        }
      }
    }
  }

  /**
   * If all listeners successfully process, mark overall status PROCESSED.
   */
  private async resolveDomainEventIfComplete(eventId: string) {
    const remainingDeliveries = await this.prisma.eventDelivery.count({
      where: { eventId, status: { not: 'PROCESSED' } }
    });
    if (remainingDeliveries === 0) {
      await this.prisma.domainEvent.update({
        where: { id: eventId },
        data: { status: 'PROCESSED' }
      });
    }
  }

  /**
   * Safe replay capability for failed events
   */
  async replayEvent(eventId: string, force: boolean = false) {
    const event = await this.prisma.domainEvent.findUnique({ where: { id: eventId } });
    if (!event) throw new Error(`Event ${eventId} not found`);

    if (event.status === 'PROCESSED' && !force) {
      this.logger.warn(`Event ${eventId} is already PROCESSED. Skipping replay unless forced.`);
      return;
    }

    this.logger.log(`Replaying event ${eventId} (${event.eventType})`);

    await this.prisma.$transaction(async (tx: any) => {
      // 1. Reset parent status
      await tx.domainEvent.update({
        where: { id: eventId },
        data: { status: 'PENDING', processingStartedAt: null }
      });

      // 2. Reset all deliveries to PENDING
      await tx.eventDelivery.updateMany({
        where: { eventId },
        data: { status: 'PENDING', attempts: 0, lastError: null, nextRetryAt: null }
      });
    });
  }

  /**
   * Visibility: Query failed events (DLQ)
   */
  async getFailedEvents() {
    return this.prisma.domainEvent.findMany({
      where: { status: 'FAILED' },
      include: { eventDeliveries: { where: { status: 'DLQ' } } },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Visibility: Query deliveries for an event
   */
  async getEventDeliveries(eventId: string) {
    return this.prisma.eventDelivery.findMany({
      where: { eventId },
      orderBy: { createdAt: 'asc' }
    });
  }

  // PLATFORM INSPECTION HELPERS
  async getEventChain(correlationId: string) {
    const events = await this.prisma.domainEvent.findMany({
      where: { correlationId },
      include: { eventDeliveries: true },
      orderBy: { createdAt: 'asc' }
    });

    return events.map((e: any) => ({
      eventId: e.id,
      eventType: e.eventType,
      status: e.status,
      createdAt: e.createdAt,
      deliveries: e.eventDeliveries.map((d: any) => ({
        handler: d.handlerName,
        status: d.status,
        attempts: d.attempts,
        lastError: d.lastError
      }))
    }));
  }
}
