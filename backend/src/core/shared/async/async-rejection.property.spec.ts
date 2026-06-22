// Feature: core-departments-stabilization, Property 10: Asynchronous failures are caught, logged, and non-fatal
import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import fc from "fast-check";
import { HttpException } from "@nestjs/common";

import {
  AsyncRejectionService,
  AsyncOperationDescriptor,
} from "./async-rejection.service";
import type { LogParams } from "../../../shared/logger/logger.service";

/**
 * Property 10: Asynchronous failures are caught, logged, and non-fatal
 *
 * Validates: Requirements 7.1, 7.2, 7.4, 7.5, 11.10
 *
 * For any asynchronous operation a core module initiates (webhook, OAuth
 * callback, social sync, background/scheduled job), the shared
 * {@link AsyncRejectionService} guarantees:
 *
 *  - a rejection handler is attached BEFORE execution so no unhandled rejection
 *    reaches the process level (Req 7.1);
 *  - a rejection is captured and recorded in the Integration_Log with the
 *    failure timestamp, the failed operation's identifier, and an error
 *    description of the cause (Req 7.2, 7.5);
 *  - the supervised work never crashes the process — the returned promise
 *    always settles as resolved, never rejected (Req 7.2, 11.10);
 *  - a background/scheduled job that fails on one item records the failure and
 *    continues processing the remaining items rather than aborting the run
 *    (Req 7.4).
 *
 * Strategy: the Integration_Log boundary is a fake LoggerService (mirroring the
 * existing unit spec) that records every `log(...)` call so the assertions can
 * inspect the captured-failure shape without a live DB. fast-check drives at
 * least 100 generated cases over arbitrary modules, operation identifiers,
 * failure shapes (Error / thrown string / thrown object), and — for the batch
 * path — arbitrary per-item success/failure sequences.
 */

/** Fake Integration_Log boundary: records every log call; never throws. */
class FakeLogger {
  public entries: LogParams[] = [];
  async log(params: LogParams): Promise<void> {
    this.entries.push(params);
  }
}

function makeService(): { svc: AsyncRejectionService; logger: FakeLogger } {
  const logger = new FakeLogger();
  const svc = new AsyncRejectionService(logger as any);
  return { svc, logger };
}

/** Representative async operations a core module initiates. */
const descriptorArb: fc.Arbitrary<AsyncOperationDescriptor> = fc.record({
  module: fc.constantFrom("IT", "PROCUREMENT", "SALES", "MARKETING", "PAYMENT"),
  operation: fc.constantFrom(
    "it.webhook.device-event",
    "marketing.oauth.callback",
    "marketing.social.sync",
    "payment.reconciliation.job",
    "payment.expiry.job",
  ),
  tenant_id: fc.constantFrom("tnt-3rlhko", "tnt-other"),
  user_id: fc.constantFrom("usr-1", "usr-2"),
});

/**
 * Arbitrary thrown value plus the cause string the helper is expected to record
 * for it. Covers an Error (message), a thrown string (itself), and a thrown
 * object (JSON-stringified).
 */
const failureArb: fc.Arbitrary<{ throwIt: unknown; expectedCause: string }> =
  fc.oneof(
    fc
      .string({ minLength: 1, maxLength: 40 })
      .map((m) => ({ throwIt: new Error(m), expectedCause: m })),
    fc
      .string({ minLength: 1, maxLength: 40 })
      .map((s) => ({ throwIt: s, expectedCause: s })),
    fc
      .record({ code: fc.string({ minLength: 1, maxLength: 10 }) })
      .map((o) => ({ throwIt: o, expectedCause: JSON.stringify(o) })),
  );

describe("Property 10: Asynchronous failures are caught, logged, and non-fatal", () => {
  // Detect any unhandled rejection that escapes to the process level (Req 7.1).
  const leaked: unknown[] = [];
  const onUnhandled = (reason: unknown) => leaked.push(reason);
  beforeAll(() => {
    process.on("unhandledRejection", onUnhandled);
  });
  afterAll(() => {
    process.off("unhandledRejection", onUnhandled);
  });
  afterEach(() => {
    leaked.length = 0;
  });

  it("fire-and-forget: captures any rejection, records it with timestamp/operation/cause, and never rejects (Req 7.1, 7.2, 7.5, 11.10)", async () => {
    await fc.assert(
      fc.asyncProperty(
        descriptorArb,
        failureArb,
        async (descriptor, failure) => {
          const { svc, logger } = makeService();

          // The supervised promise MUST resolve (process keeps running),
          // never reject, even though the work throws.
          await expect(
            svc.fireAndForget(descriptor, async () => {
              throw failure.throwIt;
            }),
          ).resolves.toBeUndefined();

          // Exactly one failure recorded in the Integration_Log.
          expect(logger.entries).toHaveLength(1);
          const entry = logger.entries[0];
          expect(entry.level).toBe("ERROR");
          expect(entry.event).toBe("ASYNC_REJECTION");
          expect(entry.module).toBe(descriptor.module);
          expect(entry.tenant_id).toBe(descriptor.tenant_id);

          const payload = entry.payload as Record<string, unknown>;
          // Failed operation identifier (Req 7.5).
          expect(payload.operation).toBe(descriptor.operation);
          // Error description of the cause (Req 7.5).
          expect(payload.cause).toBe(failure.expectedCause);
          // Failure timestamp as a valid ISO 8601 string (Req 7.5).
          expect(typeof payload.failed_at).toBe("string");
          expect(Number.isNaN(Date.parse(payload.failed_at as string))).toBe(
            false,
          );
        },
      ),
      { numRuns: 150 },
    );

    // No rejection ever escaped to the process level (Req 7.1).
    await new Promise((r) => setImmediate(r));
    expect(leaked).toEqual([]);
  });

  it("fire-and-forget: records nothing when the work succeeds", async () => {
    await fc.assert(
      fc.asyncProperty(descriptorArb, fc.anything(), async (descriptor, value) => {
        const { svc, logger } = makeService();
        await expect(
          svc.fireAndForget(descriptor, async () => value),
        ).resolves.toBeUndefined();
        expect(logger.entries).toHaveLength(0);
      }),
      { numRuns: 100 },
    );
  });

  it("runBatch: a failure on any item is recorded and the run continues over all remaining items (Req 7.4, 7.5)", async () => {
    await fc.assert(
      fc.asyncProperty(
        descriptorArb,
        // A background job's items: each either succeeds (carrying a value) or
        // fails. minLength 0 covers the empty-job edge case.
        fc.array(
          fc.record({ fail: fc.boolean(), value: fc.integer() }),
          { minLength: 0, maxLength: 25 },
        ),
        async (descriptor, items) => {
          const { svc, logger } = makeService();

          let attempted = 0;
          const summary = await svc.runBatch(descriptor, items, async (item) => {
            attempted++;
            if (item.fail) throw new Error(`item failed: ${item.value}`);
            return item.value;
          });

          const expectedFailed = items.filter((i) => i.fail).length;
          const expectedResults = items
            .filter((i) => !i.fail)
            .map((i) => i.value);

          // EVERY item was attempted — one bad item never aborts the run.
          expect(attempted).toBe(items.length);
          expect(summary.total).toBe(items.length);
          expect(summary.failed).toBe(expectedFailed);
          expect(summary.succeeded).toBe(items.length - expectedFailed);
          // Successful results preserved in order.
          expect(summary.results).toEqual(expectedResults);

          // Each per-item failure is recorded with its cause and operation id.
          expect(logger.entries).toHaveLength(expectedFailed);
          for (const entry of logger.entries) {
            const payload = entry.payload as Record<string, unknown>;
            expect(payload.operation).toBe(descriptor.operation);
            expect(typeof payload.cause).toBe("string");
            expect((payload.cause as string).startsWith("item failed:")).toBe(
              true,
            );
            expect(typeof payload.item_index).toBe("number");
          }

          // Per-item outcomes line up with the input sequence.
          expect(summary.outcomes).toHaveLength(items.length);
          summary.outcomes.forEach((outcome, idx) => {
            expect(outcome.index).toBe(idx);
            expect(outcome.ok).toBe(!items[idx].fail);
            if (items[idx].fail) {
              expect(typeof outcome.error).toBe("string");
            } else {
              expect(outcome.result).toBe(items[idx].value);
            }
          });
        },
      ),
      { numRuns: 100 },
    );

    await new Promise((r) => setImmediate(r));
    expect(leaked).toEqual([]);
  });

  it("runWithDeadline: an endpoint-initiated rejection always resolves as a typed HttpException, never an untyped leak (Req 7.2, 7.5)", async () => {
    await fc.assert(
      fc.asyncProperty(
        descriptorArb,
        failureArb,
        async (descriptor, failure) => {
          const { svc, logger } = makeService();

          let thrown: unknown;
          try {
            await svc.runWithDeadline(
              descriptor,
              async () => {
                throw failure.throwIt;
              },
              { timeoutMs: 1000 },
            );
          } catch (e) {
            thrown = e;
          }

          // Failure surfaces as a typed HttpException (no untyped 500 leak).
          expect(thrown).toBeInstanceOf(HttpException);
          // And it was recorded in the Integration_Log with its cause.
          expect(logger.entries).toHaveLength(1);
          const payload = logger.entries[0].payload as Record<string, unknown>;
          expect(payload.operation).toBe(descriptor.operation);
          expect(payload.cause).toBe(failure.expectedCause);
        },
      ),
      { numRuns: 100 },
    );

    await new Promise((r) => setImmediate(r));
    expect(leaked).toEqual([]);
  });
});
