// Feature: core-departments-stabilization, Task 1.6: async-rejection discipline helper (BUG-13)
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  GatewayTimeoutException,
  BadRequestException,
  HttpException,
} from "@nestjs/common";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

import {
  AsyncRejectionService,
  AsyncOperationDescriptor,
} from "./async-rejection.service";
import type { LogParams } from "../../../shared/logger/logger.service";

/**
 * Unit tests for the shared async-rejection discipline helper (BUG-13).
 *
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5
 *
 * The Integration_Log boundary is a fake LoggerService that records every
 * `log(...)` call so the tests can assert the captured-failure shape (timestamp,
 * operation id, cause) without a live DB.
 */

class FakeLogger {
  public entries: LogParams[] = [];
  // Mirrors LoggerService.log: never throws.
  async log(params: LogParams): Promise<void> {
    this.entries.push(params);
  }
}

function makeService(): { svc: AsyncRejectionService; logger: FakeLogger } {
  const logger = new FakeLogger();
  const svc = new AsyncRejectionService(logger as any);
  return { svc, logger };
}

const descriptor: AsyncOperationDescriptor = {
  module: "MARKETING",
  operation: "marketing.oauth.callback",
  tenant_id: "tnt-3rlhko",
  user_id: "usr-1",
};

describe("AsyncRejectionService.fireAndForget (Req 7.1, 7.2, 7.5)", () => {
  it("attaches the rejection handler before the work begins executing (Req 7.1)", async () => {
    const { svc, logger } = makeService();
    const order: string[] = [];

    // If the handler were attached AFTER work runs, a synchronous-throwing work
    // would escape. The deferred-microtask design guarantees the handler is in
    // place first.
    const supervised = svc.fireAndForget(descriptor, async () => {
      order.push("work-ran");
      throw new Error("boom");
    });
    order.push("returned-synchronously");

    await supervised;
    // The call returned before work executed (work deferred to a microtask).
    expect(order[0]).toBe("returned-synchronously");
    expect(order).toContain("work-ran");
    expect(logger.entries).toHaveLength(1);
  });

  it("captures a rejection, records it, and never rejects the process (Req 7.2)", async () => {
    const { svc, logger } = makeService();

    // The returned promise must resolve (not reject) even though work throws.
    await expect(
      svc.fireAndForget(descriptor, async () => {
        throw new Error("oauth exchange failed");
      }),
    ).resolves.toBeUndefined();

    expect(logger.entries).toHaveLength(1);
    const entry = logger.entries[0];
    expect(entry.level).toBe("ERROR");
    expect(entry.event).toBe("ASYNC_REJECTION");
    expect(entry.message).toContain("oauth exchange failed");
  });

  it("records timestamp, operation id, and cause for the failure (Req 7.5)", async () => {
    const { svc, logger } = makeService();

    await svc.fireAndForget(descriptor, async () => {
      throw new Error("token revoked");
    });

    const payload = logger.entries[0].payload as Record<string, unknown>;
    expect(payload.operation).toBe("marketing.oauth.callback");
    expect(payload.cause).toBe("token revoked");
    expect(typeof payload.failed_at).toBe("string");
    expect(() => new Date(payload.failed_at as string)).not.toThrow();
  });

  it("does not log when the work succeeds", async () => {
    const { svc, logger } = makeService();
    await svc.fireAndForget(descriptor, async () => "ok");
    expect(logger.entries).toHaveLength(0);
  });
});

describe("AsyncRejectionService.runWithDeadline (Req 7.3)", () => {
  it("returns the work result when it resolves within the deadline", async () => {
    const { svc } = makeService();
    const result = await svc.runWithDeadline(
      descriptor,
      async () => 42,
      { timeoutMs: 1000 },
    );
    expect(result).toBe(42);
  });

  it("throws a typed 5xx (504) when the deadline elapses (Req 7.3)", async () => {
    vi.useFakeTimers();
    const { svc, logger } = makeService();

    const promise = svc.runWithDeadline(
      descriptor,
      () => new Promise(() => {}), // never resolves
      { timeoutMs: 30_000 },
    );
    // Attach assertion handler before advancing timers so no unhandled rejection.
    const assertion = expect(promise).rejects.toBeInstanceOf(GatewayTimeoutException);
    await vi.advanceTimersByTimeAsync(30_000);
    await assertion;

    vi.useRealTimers();
    expect(logger.entries[0]?.event).toBe("ASYNC_REJECTION");
  });

  it("rethrows an already-typed HttpException unchanged (Req 7.3)", async () => {
    const { svc } = makeService();
    await expect(
      svc.runWithDeadline(descriptor, async () => {
        throw new BadRequestException("invalid input");
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("maps a Prisma error to its typed 4xx (Req 7.3)", async () => {
    const { svc } = makeService();
    const prismaErr = new PrismaClientKnownRequestError("fk failed", {
      code: "P2003",
      clientVersion: "6.2.1",
      meta: { field_name: "device_id" },
    });
    await expect(
      svc.runWithDeadline(descriptor, async () => {
        throw prismaErr;
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("wraps an untyped error as a typed 5xx rather than leaking it (Req 7.3)", async () => {
    const { svc } = makeService();
    let thrown: unknown;
    try {
      await svc.runWithDeadline(descriptor, async () => {
        throw new Error("kaboom");
      });
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(HttpException);
    expect((thrown as HttpException).getStatus()).toBe(500);
  });
});

describe("AsyncRejectionService.runBatch (Req 7.4, 7.5)", () => {
  it("continues processing remaining items after a per-item failure (Req 7.4)", async () => {
    const { svc, logger } = makeService();
    const items = [1, 2, 3, 4];

    const summary = await svc.runBatch(descriptor, items, async (n) => {
      if (n === 2) throw new Error(`item ${n} failed`);
      return n * 10;
    });

    expect(summary.total).toBe(4);
    expect(summary.succeeded).toBe(3);
    expect(summary.failed).toBe(1);
    expect(summary.results).toEqual([10, 30, 40]);
    // The failed item is recorded; the run was not aborted.
    expect(logger.entries).toHaveLength(1);
    expect(logger.entries[0].payload).toMatchObject({ item_index: 1 });
  });

  it("processes every item when none fail", async () => {
    const { svc, logger } = makeService();
    const summary = await svc.runBatch(descriptor, [1, 2, 3], async (n) => n);
    expect(summary.succeeded).toBe(3);
    expect(summary.failed).toBe(0);
    expect(logger.entries).toHaveLength(0);
  });

  it("records each per-item failure with its cause (Req 7.5)", async () => {
    const { svc, logger } = makeService();
    await svc.runBatch(descriptor, ["a", "b"], async () => {
      throw new Error("always fails");
    });
    expect(logger.entries).toHaveLength(2);
    for (const entry of logger.entries) {
      const payload = entry.payload as Record<string, unknown>;
      expect(payload.cause).toBe("always fails");
      expect(payload.operation).toBe("marketing.oauth.callback");
    }
  });
});
