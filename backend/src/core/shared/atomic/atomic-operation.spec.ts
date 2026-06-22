// Feature: core-departments-stabilization, Task 1.2: Atomic_Operation helper
import { describe, it, expect } from "vitest";
import { AtomicOperationService } from "./atomic-operation.service";

/**
 * Unit tests for the shared Atomic_Operation helper (Requirements 4.1, 4.2, 4.4,
 * 6.5, 6.6).
 *
 * The helper threads ONE transaction client through repository writes, the
 * Audit_Trail entry, the Integration_Log outbox event (`sys_outbox_events`), the
 * domain event, and any cross-module record. These tests verify that:
 *   - all enrolled writes commit together on success, and
 *   - a failure at ANY write point rolls the whole operation back, persisting
 *     nothing (no record, audit log, outbox event, or domain event).
 *
 * The transaction boundary is faked: `$transaction` stages writes and only
 * flushes them to the persistent store when the callback resolves; if the
 * callback throws, the staged writes are discarded (rollback). The `tx`-bound
 * `sys_outbox_events.create` enrols the outbox row in the same staging buffer,
 * exercising the real `writeOutbox` code path.
 */

/** A persistent store standing in for the live database. */
class FakeDatabase {
  committed: Array<Record<string, unknown>> = [];
}

/**
 * Build a fake PrismaService whose `$transaction` mimics an interactive
 * transaction: staged writes flush to the store on success, are discarded on any
 * thrown error. The `tx` exposes `sys_outbox_events.create` so the helper's real
 * outbox write participates in the staging buffer.
 */
function makeFakePrisma(db: FakeDatabase) {
  return {
    async $transaction<T>(
      cb: (tx: any) => Promise<T>,
      _options?: unknown,
    ): Promise<T> {
      const staging: Array<Record<string, unknown>> = [];
      const tx = {
        recordWrite(record: Record<string, unknown>) {
          staging.push(record);
        },
        sys_outbox_events: {
          create: async ({ data }: { data: Record<string, unknown> }) => {
            staging.push({ kind: "outbox", ...data });
            return { id: "outbox-1", ...data };
          },
        },
      };
      const result = await cb(tx); // throws -> staging never flushed (rollback)
      db.committed.push(...staging); // commit only on success
      return result;
    },
  } as any;
}

function makeFakeAudit() {
  return {
    log: async (_params: any, tx: any) => {
      tx.recordWrite({ kind: "audit" });
      return { ok: true };
    },
  } as any;
}

function makeFakeEventBus() {
  return {
    publish: async (_event: any, tx: any) => {
      tx.recordWrite({ kind: "event" });
      return { ok: true };
    },
  } as any;
}

describe("AtomicOperationService", () => {
  it("commits the repo write, audit entry, outbox event, and domain event together", async () => {
    const db = new FakeDatabase();
    const svc = new AtomicOperationService(
      makeFakePrisma(db),
      makeFakeAudit(),
      makeFakeEventBus(),
    );

    const result = await svc.run(async ({ tx, audit, outbox, publish }) => {
      (tx as any).recordWrite({ kind: "repo" });
      await audit({
        tenant_id: "t1",
        user_id: "u1",
        module: "PROCUREMENT",
        action: "RELEASE",
        entity_type: "PURCHASE_ORDER",
        entity_id: "po1",
      });
      await outbox({
        tenant_id: "t1",
        type: "procurement.po.released.v1",
        payload: { purchase_order_id: "po1" },
        company_id: "c1",
      });
      await publish({
        event_type: "procurement.po.released.v1",
        tenant_id: "t1",
        entity_id: "po1",
        entity_type: "PURCHASE_ORDER",
        source_module: "PROCUREMENT",
        payload: {},
      });
      return "released";
    });

    expect(result).toBe("released");
    expect(db.committed).toHaveLength(4);
    const kinds = db.committed.map((w) => w.kind);
    expect(kinds).toEqual(["repo", "audit", "outbox", "event"]);
    // The outbox row carries the originating tenant/company scope and payload.
    const outboxRow = db.committed.find((w) => w.kind === "outbox")!;
    expect(outboxRow).toMatchObject({
      tenant_id: "t1",
      type: "procurement.po.released.v1",
      company_id: "c1",
    });
  });

  it("rolls back every write when the outbox (Integration_Log) write fails", async () => {
    const db = new FakeDatabase();
    const failingPrisma = {
      async $transaction<T>(cb: (tx: any) => Promise<T>): Promise<T> {
        const staging: Array<Record<string, unknown>> = [];
        const tx = {
          recordWrite(record: Record<string, unknown>) {
            staging.push(record);
          },
          sys_outbox_events: {
            create: async () => {
              throw new Error("outbox write failed");
            },
          },
        };
        const result = await cb(tx);
        db.committed.push(...staging);
        return result;
      },
    } as any;

    const svc = new AtomicOperationService(
      failingPrisma,
      makeFakeAudit(),
      makeFakeEventBus(),
    );

    await expect(
      svc.run(async ({ tx, audit, outbox }) => {
        (tx as any).recordWrite({ kind: "repo" });
        await audit({
          tenant_id: "t1",
          user_id: "u1",
          module: "IT",
          action: "CREATE",
          entity_type: "DEVICE",
          entity_id: "d1",
        });
        await outbox({
          tenant_id: "t1",
          type: "it.device.created.v1",
          payload: {},
        });
        return "done";
      }),
    ).rejects.toThrow("outbox write failed");
    // Requirement 6.6: failing to record the cross-module event rolls back the
    // originating operation — nothing persists.
    expect(db.committed).toEqual([]);
  });

  it("rolls back when a repository write fails after the audit entry", async () => {
    const db = new FakeDatabase();
    const svc = new AtomicOperationService(
      makeFakePrisma(db),
      makeFakeAudit(),
      makeFakeEventBus(),
    );

    await expect(
      svc.run(async ({ tx, audit }) => {
        await audit({
          tenant_id: "t1",
          user_id: "u1",
          module: "SALES",
          action: "CONVERT",
          entity_type: "LEAD",
          entity_id: "l1",
        });
        (tx as any).recordWrite({ kind: "repo" });
        throw new Error("second write failed");
      }),
    ).rejects.toThrow("second write failed");
    expect(db.committed).toEqual([]);
  });

  it("forwards transaction options to prisma.$transaction", async () => {
    let captured: unknown;
    const capturingPrisma = {
      async $transaction<T>(
        cb: (tx: any) => Promise<T>,
        options?: unknown,
      ): Promise<T> {
        captured = options;
        return cb({
          recordWrite() {},
          sys_outbox_events: { create: async () => ({}) },
        });
      },
    } as any;

    const svc = new AtomicOperationService(
      capturingPrisma,
      makeFakeAudit(),
      makeFakeEventBus(),
    );

    await svc.run(async () => "ok", { isolationLevel: "Serializable" as any });
    expect(captured).toEqual({ isolationLevel: "Serializable" });
  });
});
