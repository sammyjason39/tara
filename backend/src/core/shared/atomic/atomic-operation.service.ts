import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../../persistence/prisma.service";
import {
  AuditService,
  AuditLogParams,
} from "../../../shared/audit/audit.service";
import {
  EventBusService,
  DomainEvent,
} from "../../../shared/events/event-bus.service";

/**
 * Options accepted by an Atomic_Operation, mirroring the subset of
 * `prisma.$transaction` interactive-transaction options the core modules use.
 */
export interface AtomicOperationOptions {
  maxWait?: number;
  timeout?: number;
  isolationLevel?: Prisma.TransactionIsolationLevel;
}

/**
 * Input shape for an Integration_Log outbox event written inside the current
 * Atomic_Operation. Persists to the durable `sys_outbox_events` table so the
 * cross-module domain event commits or rolls back together with the originating
 * write (Requirements 6.5, 6.6).
 */
export interface OutboxEventInput {
  /** Originating tenant. Sourced from the verified Tenant_Context. */
  tenant_id: string;
  /** Event type, e.g. `procurement.po.released.v1`. */
  type: string;
  /** Event payload (scoped to the originating Tenant_Scope). */
  payload: Prisma.InputJsonValue;
  /** Optional originating company scope. */
  company_id?: string;
}

/**
 * The context handed to the body of an Atomic_Operation. It carries the active
 * transaction client plus `tx`-bound convenience wrappers so that repository
 * writes, the Audit_Trail entry, the Integration_Log outbox event, the domain
 * event, and any cross-module record all enrol in the SAME transaction and
 * therefore commit or roll back together (Requirements 4.1, 4.2, 4.4, 6.5, 6.6).
 */
export interface AtomicContext {
  /**
   * The active Prisma transaction client. Pass this as the `tx?` argument to
   * every repository write so the write enrols in the Atomic_Operation.
   */
  tx: Prisma.TransactionClient;
  /** Write an Audit_Trail entry inside the current transaction. */
  audit: (params: AuditLogParams) => Promise<any>;
  /**
   * Record an Integration_Log event in the durable outbox (`sys_outbox_events`)
   * inside the current transaction. The originating operation only reports
   * success once this row is committed (Requirement 6.5); a failure here rolls
   * back the whole operation (Requirement 6.6).
   */
  outbox: (event: OutboxEventInput) => Promise<any>;
  /** Publish a domain event (event store + deliveries) inside the current transaction. */
  publish: (event: DomainEvent) => Promise<any>;
}

/**
 * Atomic_Operation helper — a shared correctness primitive for the five core
 * departments (IT, Procurement, Sales, Marketing, Payment).
 *
 * A thin convention around `prisma.$transaction(async (tx) => …)` that threads a
 * single transaction client through every write a Core_Module operation performs:
 *
 *   - repository writes (via {@link AtomicContext.tx}),
 *   - the {@link AuditService.log} Audit_Trail entry,
 *   - the Integration_Log outbox event in `sys_outbox_events` (via
 *     {@link AtomicContext.outbox}),
 *   - the {@link EventBusService.publish} domain event, and
 *   - any cross-module record (Payable_Record, Finance settlement record,
 *     lead-handoff record, …) written through the same `tx`.
 *
 * If any write inside the body throws, the whole operation rolls back and no
 * record, audit log, integration event, or cross-module record is persisted
 * (Requirements 4.1, 4.2, 4.4, 6.5, 6.6).
 *
 * Every core repository write method accepts an optional `tx?:
 * Prisma.TransactionClient`; passing {@link AtomicContext.tx} enrols the write in
 * this Atomic_Operation, while omitting it preserves the standalone write path.
 *
 * @example
 * return this.atomic.run(async ({ tx, audit, outbox }) => {
 *   const po = await this.poRepo.release(scope.tenant_id, id, tx);
 *   await this.payableRepo.create(scope.tenant_id, toPayable(po), tx);
 *   await audit({
 *     tenant_id: scope.tenant_id, user_id, module: "PROCUREMENT",
 *     action: "RELEASE", entity_type: "PURCHASE_ORDER", entity_id: po.id,
 *     after_state: po,
 *   });
 *   await outbox({
 *     tenant_id: scope.tenant_id, type: "procurement.po.released.v1",
 *     payload: { purchase_order_id: po.id }, company_id: scope.company_id,
 *   });
 *   return po;
 * });
 */
@Injectable()
export class AtomicOperationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly eventBus: EventBusService,
  ) {}

  /**
   * Execute `work` inside a single database transaction. The supplied
   * {@link AtomicContext} exposes the transaction client and `tx`-bound audit,
   * outbox, and event helpers, guaranteeing every write shares one
   * Atomic_Operation.
   *
   * Any exception thrown inside `work` rolls back the entire transaction so that
   * zero writes from the operation are persisted.
   */
  async run<T>(
    work: (ctx: AtomicContext) => Promise<T>,
    options?: AtomicOperationOptions,
  ): Promise<T> {
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const ctx: AtomicContext = {
        tx,
        audit: (params: AuditLogParams) => this.auditService.log(params, tx),
        outbox: (event: OutboxEventInput) => this.writeOutbox(tx, event),
        publish: (event: DomainEvent) => this.eventBus.publish(event, tx),
      };
      return work(ctx);
    }, options);
  }

  /**
   * Persist an Integration_Log event to the durable `sys_outbox_events` outbox on
   * the supplied transaction client. The `OutboxWorkerService` later polls and
   * delivers PENDING rows; recording the row inside the Atomic_Operation is what
   * makes "logged before reporting success" and "rollback discards the event"
   * hold (Requirements 6.5, 6.6).
   */
  private async writeOutbox(
    tx: Prisma.TransactionClient,
    event: OutboxEventInput,
  ): Promise<any> {
    return tx.sys_outbox_events.create({
      data: {
        tenant_id: event.tenant_id,
        type: event.type,
        payload: event.payload,
        company_id: event.company_id ?? null,
      },
    });
  }
}
