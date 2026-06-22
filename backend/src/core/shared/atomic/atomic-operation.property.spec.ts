// Feature: core-departments-stabilization, Property 5: Multi-write operations are atomic
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { AtomicOperationService } from "./atomic-operation.service";

/**
 * Property 5: Multi-write operations are atomic
 *
 * Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.6, 4.7, 6.5, 6.6, 9.4, 9.5,
 * 9.10, 10.3, 10.4, 11.5, 11.6, 11.7, 11.8, 12.11, 12.12
 *
 * For any core operation (IT, Procurement, Sales, Marketing, Payment) that
 * performs more than one database write — repository writes, the Audit_Trail
 * entry, the Integration_Log outbox event (`sys_outbox_events`), the domain
 * event, and any cross-module record (Payable_Record, Finance settlement
 * record, lead-handoff record, creative-asset blob+record, inventory+rating on
 * receipt) — injecting a failure at ANY write point leaves the database
 * unchanged: no record, audit log, integration event, or cross-module record
 * from that operation persists, and the operation surfaces an error.
 *
 * Strategy (per design Testing Strategy "Isolation & atomicity"): use a
 * mockable transaction/repository boundary. We fake `PrismaService.$transaction`
 * so the callback runs against a fake `tx` that stages every write — including
 * the real `writeOutbox` path through `tx.sys_outbox_events.create`. The
 * transaction only commits the staged writes to the persistent store when the
 * callback resolves; if the callback throws, the staged writes are discarded
 * (rollback) and the error is re-thrown. We generate a random sequence of writes
 * and a random failing write index and assert: when a write throws, `run`
 * rejects and NOTHING is committed.
 */

/** A persistent store standing in for the live database. */
class FakeDatabase {
  committed: Array<Record<string, unknown>> = [];
}

/**
 * The kinds of writes an Atomic_Operation can enrol.
 *  - "repo":       a core repository write (the originating entity)
 *  - "audit":      the Audit_Trail entry (Requirement 6.6)
 *  - "outbox":     the Integration_Log event in sys_outbox_events (Req 6.5, 6.6)
 *  - "event":      the published domain event
 *  - "crossModule": a cross-module record written through the same tx — e.g. a
 *                   Payable_Record (9.4, 9.10), Finance settlement record
 *                   (12.11, 12.12), lead-handoff record (11.5, 11.6),
 *                   creative-asset blob+record (11.7, 11.8), or inventory+rating
 *                   on goods receipt (9.5).
 */
type WriteKind = "repo" | "audit" | "outbox" | "event" | "crossModule";

/**
 * Build a fake PrismaService whose `$transaction` mimics an interactive
 * transaction: staged writes flush to the persistent store on success and are
 * discarded on any thrown error. The `tx` exposes `sys_outbox_events.create` so
 * the helper's real `writeOutbox` participates in the same staging buffer.
 */
function makeFakePrisma(db: FakeDatabase) {
  return {
    async $transaction<T>(
      cb: (tx: any) => Promise<T>,
      _options?: unknown,
    ): Promise<T> {
      // Each transaction gets its own staging buffer. Every enrolled write —
      // repo, cross-module, audit, outbox, event — pushes here via the shared
      // `tx` so they share one unit of work.
      const staging: Array<Record<string, unknown>> = [];
      const tx = {
        __staging: staging,
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

/** Fake AuditService.log(params, tx): enrols the audit log in the passed tx. */
function makeFakeAudit() {
  return {
    log: async (_params: any, tx: any) => {
      tx.recordWrite({ kind: "audit" });
      return { ok: true };
    },
  } as any;
}

/** Fake EventBusService.publish(event, tx): enrols the event in the passed tx. */
function makeFakeEventBus() {
  return {
    publish: async (_event: any, tx: any) => {
      tx.recordWrite({ kind: "event" });
      return { ok: true };
    },
  } as any;
}

describe("Property 5: Multi-write operations are atomic", () => {
  it("never partially persists: a failure at any write point rolls back every write", async () => {
    await fc.assert(
      fc.asyncProperty(
        // A multi-write operation: a sequence of >= 2 writes of varied kinds,
        // covering repo, audit, outbox (Integration_Log), domain event, and
        // cross-module records.
        fc.array(
          fc.constantFrom<WriteKind>(
            "repo",
            "audit",
            "outbox",
            "event",
            "crossModule",
          ),
          { minLength: 2, maxLength: 12 },
        ),
        // Where the failure is injected: an index, or null for the success path.
        fc.option(fc.nat({ max: 11 }), { nil: null }),
        async (writeKinds, rawFailIndex) => {
          const numWrites = writeKinds.length;
          // A failure is only injected when the index lands within the sequence.
          const failIndex =
            rawFailIndex !== null && rawFailIndex < numWrites
              ? rawFailIndex
              : null;

          const db = new FakeDatabase();
          const svc = new AtomicOperationService(
            makeFakePrisma(db),
            makeFakeAudit(),
            makeFakeEventBus(),
          );

          // The operation body performs each write through the shared tx-bound
          // helpers, throwing exactly at the injected failure point.
          const work = async ({ tx, audit, outbox, publish }: any) => {
            for (let i = 0; i < numWrites; i++) {
              if (failIndex !== null && i === failIndex) {
                throw new Error(`injected failure at write ${i}`);
              }
              switch (writeKinds[i]) {
                case "repo":
                  tx.recordWrite({ kind: "repo", i });
                  break;
                case "crossModule":
                  // A cross-module record written through the same tx, e.g. a
                  // Payable_Record or Finance settlement record.
                  tx.recordWrite({ kind: "crossModule", i });
                  break;
                case "audit":
                  await audit({
                    tenant_id: "tnt-3rlhko",
                    user_id: "u1",
                    module: "PROCUREMENT",
                    action: "RELEASE",
                    entity_type: "TEST",
                    entity_id: `e${i}`,
                  });
                  break;
                case "outbox":
                  await outbox({
                    tenant_id: "tnt-3rlhko",
                    type: "core.test.v1",
                    payload: { i },
                    company_id: "c1",
                  });
                  break;
                case "event":
                  await publish({
                    event_type: "core.test.v1",
                    tenant_id: "tnt-3rlhko",
                    entity_id: `e${i}`,
                    entity_type: "TEST",
                    source_module: "PROCUREMENT",
                    user_id: "u1",
                    payload: {},
                  });
                  break;
              }
            }
            return "committed";
          };

          if (failIndex !== null) {
            // A write threw: the operation must reject and commit NOTHING.
            await expect(svc.run(work)).rejects.toThrow(
              `injected failure at write ${failIndex}`,
            );
            expect(db.committed).toEqual([]);
          } else {
            // No failure: the whole operation commits exactly its writes.
            await expect(svc.run(work)).resolves.toBe("committed");
            expect(db.committed).toHaveLength(numWrites);
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it("rolls back the entity, audit, outbox, and cross-module record when the Integration_Log (outbox) write fails", async () => {
    // Concrete example (Req 6.6, 9.10, 12.12): the originating repo write and a
    // cross-module record succeed, then the Integration_Log outbox write throws —
    // the whole operation must roll back, persisting nothing.
    const db = new FakeDatabase();
    const failingOutboxPrisma = {
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
      failingOutboxPrisma,
      makeFakeAudit(),
      makeFakeEventBus(),
    );

    await expect(
      svc.run(async ({ tx, audit, outbox }: any) => {
        tx.recordWrite({ kind: "repo", i: 0 });
        tx.recordWrite({ kind: "crossModule", i: 1 }); // e.g. Payable_Record
        await audit({ tenant_id: "tnt-3rlhko" });
        await outbox({ tenant_id: "tnt-3rlhko", type: "core.test.v1", payload: {} });
        return "committed";
      }),
    ).rejects.toThrow("outbox write failed");
    expect(db.committed).toEqual([]);
  });

  it("rolls back when a cross-module record write fails after the originating write (e.g. Finance settlement record)", async () => {
    // Concrete example (Req 12.11, 12.12): the payment transition repo write
    // succeeds, then creating the Finance settlement record fails — the
    // transaction must remain pre-settlement with nothing persisted.
    const db = new FakeDatabase();
    const svc = new AtomicOperationService(
      makeFakePrisma(db),
      makeFakeAudit(),
      makeFakeEventBus(),
    );

    await expect(
      svc.run(async ({ tx }: any) => {
        tx.recordWrite({ kind: "repo", i: 0 }); // payment settled state
        throw new Error("finance settlement record failed");
      }),
    ).rejects.toThrow("finance settlement record failed");
    expect(db.committed).toEqual([]);
  });

  it("commits the repo write, cross-module record, audit, outbox, and domain event together when no failure is injected", async () => {
    const db = new FakeDatabase();
    const svc = new AtomicOperationService(
      makeFakePrisma(db),
      makeFakeAudit(),
      makeFakeEventBus(),
    );

    await expect(
      svc.run(async ({ tx, audit, outbox, publish }: any) => {
        tx.recordWrite({ kind: "repo", i: 0 });
        tx.recordWrite({ kind: "crossModule", i: 1 });
        await audit({ tenant_id: "tnt-3rlhko" });
        await outbox({ tenant_id: "tnt-3rlhko", type: "core.test.v1", payload: {} });
        await publish({ event_type: "core.test.v1" });
        return "committed";
      }),
    ).resolves.toBe("committed");
    expect(db.committed).toHaveLength(5);
  });
});
