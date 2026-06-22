import {
  GatewayTimeoutException,
  HttpException,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import { LoggerService } from "../../../shared/logger/logger.service";
import { prismaErrorToHttpException } from "../../_shared/errors/prisma-error.mapper";

/**
 * Identifies the asynchronous operation being supervised so that any failure can
 * be recorded against it in the Integration_Log / Audit_Trail with enough context
 * to diagnose the cause (Requirement 7.5).
 */
export interface AsyncOperationDescriptor {
  /** Owning core module, e.g. "MARKETING", "IT", "PAYMENT". */
  module: string;
  /**
   * Stable identifier of the operation, e.g. "marketing.oauth.callback" or
   * "payment.reconciliation.job". Recorded as the failed-operation id (Req 7.5).
   */
  operation: string;
  /** Originating tenant, when known. Sourced from the verified Tenant_Context. */
  tenant_id?: string;
  /** Acting user, when known. Sourced from the verified Tenant_Context. */
  user_id?: string;
  /** Correlation/request id to tie the failure back to its originating request. */
  correlation_id?: string;
  /** Optional structured detail recorded alongside the failure. */
  metadata?: Record<string, unknown>;
}

/**
 * Options for {@link AsyncRejectionService.runWithDeadline}.
 */
export interface DeadlineOptions {
  /**
   * Maximum time the asynchronous work may take before it is abandoned and a
   * typed 5xx is returned (Requirement 7.3). Defaults to 30 000 ms.
   */
  timeoutMs?: number;
}

/**
 * Outcome of processing a single item inside {@link AsyncRejectionService.runBatch}.
 */
export interface BatchItemOutcome<TResult> {
  /** Zero-based index of the item within the input collection. */
  index: number;
  /** True when the item handler resolved, false when it rejected. */
  ok: boolean;
  /** Handler result when `ok` is true. */
  result?: TResult;
  /** Error message when `ok` is false. */
  error?: string;
}

/**
 * Summary returned by {@link AsyncRejectionService.runBatch}: every item is
 * attempted regardless of individual failures (Requirement 7.4).
 */
export interface BatchRunResult<TResult> {
  total: number;
  succeeded: number;
  failed: number;
  results: TResult[];
  outcomes: BatchItemOutcome<TResult>[];
}

/**
 * Async-rejection discipline helper (BUG-13) — a shared correctness primitive for
 * the five core departments (IT, Procurement, Sales, Marketing, Payment).
 *
 * Asynchronous work across the modules (Marketing OAuth callbacks / social-sync,
 * IT webhooks / device events, Payment expiry & reconciliation jobs) was being
 * initiated without an attached rejection handler, risking unhandled rejections
 * that crash the process or silently drop work. This service centralises three
 * disciplines so no initiated promise escapes unguarded (Requirement 7):
 *
 *   - {@link fireAndForget} — attaches a rejection handler BEFORE the work begins
 *     executing, so a rejection is always caught, recorded, and never reaches the
 *     process level (Requirements 7.1, 7.2).
 *   - {@link runWithDeadline} — bounds endpoint-initiated async work so it always
 *     resolves within a deadline (default 30 s) as a typed 4xx/5xx rather than
 *     hanging (Requirement 7.3).
 *   - {@link runBatch} — runs a background/scheduled job item-by-item, recording
 *     each per-item failure and continuing with the remaining items rather than
 *     aborting the whole run (Requirement 7.4).
 *
 * Every captured failure is recorded in the Integration_Log with the failure
 * timestamp, the failed operation's identifier, and an error description of the
 * cause (Requirement 7.5).
 */
@Injectable()
export class AsyncRejectionService {
  constructor(private readonly logger: LoggerService) {}

  /**
   * Initiate fire-and-forget asynchronous work (webhook, OAuth callback, social
   * sync) with a rejection handler attached BEFORE the work begins executing.
   *
   * The work is deferred to a microtask via `Promise.resolve().then(...)` and the
   * `.catch` handler is attached synchronously in the same tick, so no rejection
   * can ever surface at the process level as an unhandled rejection
   * (Requirements 7.1, 7.2). A rejection is captured, recorded in the
   * Integration_Log, and swallowed so the process keeps running.
   *
   * Returns the supervised promise (always resolved, never rejected) for callers
   * that wish to await completion in tests; production callers may ignore it.
   */
  fireAndForget(
    descriptor: AsyncOperationDescriptor,
    work: () => Promise<unknown>,
  ): Promise<void> {
    // Defer execution to a microtask and attach the rejection handler in the
    // SAME synchronous tick, guaranteeing the handler is in place before `work`
    // runs (Requirement 7.1).
    return Promise.resolve()
      .then(() => work())
      .then(
        () => undefined,
        (error: unknown) => this.recordFailure(descriptor, error),
      );
  }

  /**
   * Run endpoint-initiated asynchronous work under a hard deadline so the request
   * always resolves within the deadline as a typed response (Requirement 7.3).
   *
   * - If `work` resolves first, its value is returned.
   * - If the deadline elapses first, the failure is recorded and a 504
   *   {@link GatewayTimeoutException} (a 5xx, server-caused) is thrown.
   * - If `work` rejects, the failure is recorded and the error is normalised to a
   *   typed {@link HttpException}: an already-typed HttpException (4xx/5xx) is
   *   rethrown unchanged, a mappable Prisma error becomes its mapped 4xx, and any
   *   other error becomes a 500 — never an untyped leak.
   */
  async runWithDeadline<T>(
    descriptor: AsyncOperationDescriptor,
    work: () => Promise<T>,
    options?: DeadlineOptions,
  ): Promise<T> {
    const timeoutMs = options?.timeoutMs ?? 30_000;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(
          new GatewayTimeoutException(
            `Operation '${descriptor.operation}' did not complete within ${timeoutMs}ms.`,
          ),
        );
      }, timeoutMs);
    });

    try {
      // Both branches have a rejection handler via the surrounding try/catch, so
      // neither can leak an unhandled rejection (Requirement 7.1).
      return await Promise.race([work(), timeout]);
    } catch (error) {
      await this.recordFailure(descriptor, error);
      throw this.toHttpException(descriptor, error);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  /**
   * Process a background/scheduled job item-by-item. Each item is attempted; a
   * per-item failure is recorded in the Integration_Log and processing continues
   * with the remaining items, so one bad item never aborts the run
   * (Requirements 7.4, 7.5).
   */
  async runBatch<TItem, TResult>(
    descriptor: AsyncOperationDescriptor,
    items: readonly TItem[],
    handler: (item: TItem, index: number) => Promise<TResult>,
  ): Promise<BatchRunResult<TResult>> {
    const outcomes: BatchItemOutcome<TResult>[] = [];
    const results: TResult[] = [];

    for (let index = 0; index < items.length; index++) {
      try {
        const result = await handler(items[index], index);
        results.push(result);
        outcomes.push({ index, ok: true, result });
      } catch (error) {
        await this.recordFailure(descriptor, error, { item_index: index });
        outcomes.push({
          index,
          ok: false,
          error: this.describe(error),
        });
      }
    }

    const failed = outcomes.filter((o) => !o.ok).length;
    return {
      total: items.length,
      succeeded: results.length,
      failed,
      results,
      outcomes,
    };
  }

  /**
   * Record a captured asynchronous failure in the Integration_Log with the
   * failure timestamp (the log row's `created_at`), the failed operation's
   * identifier, and an error description of the cause (Requirement 7.5). Logging
   * never throws — the underlying {@link LoggerService} swallows its own errors —
   * so recording a failure can never itself crash the process (Requirement 7.2).
   */
  private async recordFailure(
    descriptor: AsyncOperationDescriptor,
    error: unknown,
    extra?: Record<string, unknown>,
  ): Promise<void> {
    await this.logger.log({
      tenant_id: descriptor.tenant_id,
      module: descriptor.module,
      level: "ERROR",
      event: "ASYNC_REJECTION",
      message: `Async operation '${descriptor.operation}' failed: ${this.describe(error)}`,
      user_id: descriptor.user_id,
      correlation_id: descriptor.correlation_id,
      errorStack: error instanceof Error ? error.stack : undefined,
      payload: {
        operation: descriptor.operation,
        failed_at: new Date().toISOString(),
        cause: this.describe(error),
        ...descriptor.metadata,
        ...extra,
      },
    });
  }

  /**
   * Normalise an arbitrary thrown value into a typed {@link HttpException} so a
   * failing endpoint resolves as a typed 4xx/5xx rather than an untyped 500 leak
   * (Requirement 7.3).
   */
  private toHttpException(
    descriptor: AsyncOperationDescriptor,
    error: unknown,
  ): HttpException {
    if (error instanceof HttpException) {
      return error;
    }
    const mapped = prismaErrorToHttpException(error, descriptor.operation);
    if (mapped) {
      return mapped;
    }
    return new InternalServerErrorException(
      `Operation '${descriptor.operation}' failed unexpectedly.`,
    );
  }

  /** Best-effort human-readable description of a thrown value. */
  private describe(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === "string") return error;
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }
}
