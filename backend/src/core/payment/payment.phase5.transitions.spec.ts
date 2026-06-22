import { describe, it, expect } from "vitest";
import { BadRequestException, NotFoundException } from "@nestjs/common";

import { PaymentService } from "./payment.service";
import { PaymentDbRepository } from "./repositories/payment.db.repository";
import { AtomicOperationService } from "../shared/atomic/atomic-operation.service";
import type { TenantScope } from "../../shared/scope/tenant-scope";

/**
 * Task 10.3 — Phase 5 (Payment) atomic lifecycle transition example/edge tests.
 *
 * Drives the REAL `PaymentDbRepository`, `AtomicOperationService`, and
 * `PaymentService` against an in-memory fake Prisma client whose `$transaction`
 * snapshots every table before the body runs and restores them if the body
 * throws, reproducing transactional rollback. This exercises:
 *
 *   - Payment transitions request→approve/reject, approve→route, route→execute,
 *     execute→settle (Requirements 12.3, 12.4).
 *   - Refund transitions create→approve, approve→execute (Requirements 12.7, 12.8).
 *   - Dispute transitions open→progress, progress→resolve (Requirements 12.9, 12.10).
 *   - Invalid transitions rejected with a 400 naming current+target, leaving the
 *     entity unchanged with nothing persisted (Requirements 12.4, 12.8, 12.10).
 *   - The transition + its payment_audit_events record + the Integration_Log
 *     outbox event commit or roll back together (Requirements 4.1, 4.2, 6.5).
 */

/* -------------------------------------------------------------------------- */
/* In-memory fake Prisma client with rollback-capable $transaction            */
/* -------------------------------------------------------------------------- */

type Row = Record<string, any>;

function matchesWhere(row: Row, where: Row | undefined): boolean {
  if (!where) return true;
  return Object.entries(where).every(([key, cond]) => {
    if (cond && typeof cond === "object" && !Array.isArray(cond)) {
      if ("in" in cond) return (cond.in as unknown[]).includes(row[key]);
      if ("notIn" in cond) return !(cond.notIn as unknown[]).includes(row[key]);
      return true;
    }
    return row[key] === cond;
  });
}

function applyData(target: Row, data: Row): void {
  for (const [key, value] of Object.entries(data)) {
    // Skip Prisma nested-write directives (e.g. `{ create: {...} }`) — they are
    // not plain column values and are irrelevant to the transition assertions.
    if (value && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date) && "create" in value) {
      continue;
    }
    target[key] = value;
  }
}

interface FakeTable {
  rows: Row[];
  create: (args: { data: Row }) => Promise<Row>;
  update: (args: { where: Row; data: Row }) => Promise<Row>;
  findFirst: (args?: { where?: Row; orderBy?: unknown }) => Promise<Row | null>;
  findUnique: (args?: { where?: Row }) => Promise<Row | null>;
  findMany: (args?: { where?: Row }) => Promise<Row[]>;
  count: (args?: { where?: Row }) => Promise<number>;
  __snapshot: () => Row[];
  __restore: (rows: Row[]) => void;
}

function makeTable(name: string): FakeTable {
  const rows: Row[] = [];
  let seq = 0;
  return {
    rows,
    create: async ({ data }: { data: Row }) => {
      const clean: Row = {};
      applyData(clean, data);
      const row: Row = {
        id: data.id ?? `${name}-${++seq}`,
        created_at: data.created_at ?? new Date(),
        ...clean,
      };
      rows.push(row);
      return { ...row };
    },
    update: async ({ where, data }: { where: Row; data: Row }) => {
      const row = rows.find((r) => matchesWhere(r, where));
      if (!row) throw new Error(`Record not found for update in ${name}`);
      applyData(row, data);
      return { ...row };
    },
    findFirst: async ({ where }: { where?: Row } = {}) => {
      const row = rows.find((r) => matchesWhere(r, where));
      return row ? { ...row } : null;
    },
    findUnique: async ({ where }: { where?: Row } = {}) => {
      const row = rows.find((r) => matchesWhere(r, where));
      return row ? { ...row } : null;
    },
    findMany: async ({ where }: { where?: Row } = {}) =>
      rows.filter((r) => matchesWhere(r, where)).map((r) => ({ ...r })),
    count: async ({ where }: { where?: Row } = {}) =>
      rows.filter((r) => matchesWhere(r, where)).length,
    __snapshot: () => rows.map((r) => ({ ...r })),
    __restore: (snapshot: Row[]) => {
      rows.length = 0;
      rows.push(...snapshot.map((r) => ({ ...r })));
    },
  };
}

function buildPrismaFake() {
  const tableNames = [
    "payment_transactions",
    "payment_refunds",
    "payment_disputes",
    "payment_chargebacks",
    "payment_settlements",
    "payment_evidence_packs",
    "payment_retry_attempts",
    "payment_routing_policies",
    "payment_audit_events",
    "sys_outbox_events",
  ];
  const prisma: any = {};
  const tables: FakeTable[] = [];
  for (const n of tableNames) {
    const t = makeTable(n);
    prisma[n] = t;
    tables.push(t);
  }

  // Rollback-capable interactive transaction: snapshot every table before the
  // body, restore all of them if the body throws so a failed Atomic_Operation
  // persists zero writes (Requirements 4.1, 4.2).
  prisma.$transaction = async (fn: (tx: any) => Promise<unknown>) => {
    const snapshots = tables.map((t) => ({ t, rows: t.__snapshot() }));
    try {
      return await fn(prisma);
    } catch (err) {
      for (const s of snapshots) s.t.__restore(s.rows);
      throw err;
    }
  };

  return prisma;
}

/* -------------------------------------------------------------------------- */
/* Wiring                                                                     */
/* -------------------------------------------------------------------------- */

function buildService(prisma: any) {
  const repository = new PaymentDbRepository(prisma);
  const auditStub = { log: async () => undefined } as any;
  const eventBusStub = { publish: async () => undefined } as any;
  const atomic = new AtomicOperationService(prisma, auditStub, eventBusStub);
  const adapterStub = {} as any;
  const financeStub = { createJournal: async () => undefined } as any;
  const offlineStub = {
    resolve: async () => ({ isOffline: false, reason: "online" }),
  } as any;
  const service = new PaymentService(
    repository as any,
    adapterStub,
    adapterStub,
    adapterStub,
    financeStub,
    offlineStub,
    atomic,
  );
  return { service, repository };
}

const TENANT = "tnt-3rlhko";
const scope: TenantScope = { tenant_id: TENANT };

function seedTransaction(prisma: any, overrides: Row = {}) {
  const txn: Row = {
    id: "txn-1",
    tenant_id: TENANT,
    type: "vendor_payout",
    amount: 1000,
    currency: "IDR",
    destination: "acct-1",
    channel: "bank_transfer",
    method: "GATEWAY",
    status: "REQUEST_CREATED",
    created_by: "usr-1",
    payment_status: "PENDING",
    ...overrides,
  };
  prisma.payment_transactions.rows.push(txn);
  return txn;
}

function seedRefund(prisma: any, overrides: Row = {}) {
  const refund: Row = {
    id: "rfd-1",
    tenant_id: TENANT,
    payment_id: "txn-1",
    type: "FULL",
    amount: 500,
    reason: "customer request",
    status: "REQUESTED",
    requested_by: "usr-1",
    ...overrides,
  };
  prisma.payment_refunds.rows.push(refund);
  return refund;
}

function seedDispute(prisma: any, overrides: Row = {}) {
  const dispute: Row = {
    id: "dsp-1",
    tenant_id: TENANT,
    payment_id: "txn-1",
    reason: "unauthorized",
    amount: 750,
    status: "OPENED",
    opened_by: "usr-1",
    evidence: [],
    ...overrides,
  };
  prisma.payment_disputes.rows.push(dispute);
  return dispute;
}

/* -------------------------------------------------------------------------- */
/* Payment transaction lifecycle (Req 12.3, 12.4)                             */
/* -------------------------------------------------------------------------- */

describe("Payment Phase 5 — transaction lifecycle transitions (Req 12.3, 12.4)", () => {
  it("advances the full request→approve→route→execute→settle lifecycle atomically", async () => {
    const prisma = buildPrismaFake();
    seedTransaction(prisma);
    const { service } = buildService(prisma);

    const approved = await service.approveTransaction(scope, "txn-1", "usr-mgr");
    expect(approved.status).toBe("APPROVED");

    const routed = await service.routeTransaction(
      scope,
      "txn-1",
      { providerId: "prov-1" } as any,
      "usr-mgr",
    );
    expect(routed.status).toBe("PROVIDER_SELECTED");

    const executed = await service.executeTransaction(
      scope,
      "txn-1",
      {} as any,
      "usr-mgr",
    );
    expect(executed.status).toBe("SETTLEMENT_PENDING");
    expect(prisma.payment_settlements.rows.length).toBe(1);

    const settled = await service.settleTransaction(scope, "txn-1", "usr-mgr");
    expect(settled.status).toBe("SETTLED");

    // One outbox event recorded per transition (approve, route, execute, settle).
    expect(prisma.sys_outbox_events.rows.length).toBe(4);
    expect(prisma.sys_outbox_events.rows.every((e: Row) => e.tenant_id === TENANT)).toBe(true);
    // Each transition wrote its payment_audit_events record in the same tx.
    expect(prisma.payment_audit_events.rows.length).toBeGreaterThanOrEqual(4);
  });

  it("rejects a request transaction (request→reject) and leaves it terminal", async () => {
    const prisma = buildPrismaFake();
    seedTransaction(prisma);
    const { service } = buildService(prisma);

    const rejected = await service.rejectTransaction(scope, "txn-1", "usr-mgr");
    expect(rejected.status).toBe("REJECTED");
    expect(prisma.sys_outbox_events.rows.length).toBe(1);
  });

  it("rejects approving a non-request transaction naming current+target, leaving it unchanged", async () => {
    const prisma = buildPrismaFake();
    seedTransaction(prisma, { status: "SETTLED" });
    const { service } = buildService(prisma);

    let caught: unknown;
    try {
      await service.approveTransaction(scope, "txn-1", "usr-mgr");
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(BadRequestException);
    const message = (caught as BadRequestException).message;
    expect(message).toContain("'SETTLED'");
    expect(message).toContain("'APPROVED'");
    // Unchanged, nothing persisted.
    expect(prisma.payment_transactions.rows[0].status).toBe("SETTLED");
    expect(prisma.sys_outbox_events.rows.length).toBe(0);
    expect(prisma.payment_audit_events.rows.length).toBe(0);
  });

  it("rejects routing a request transaction (must be APPROVED first), leaving it unchanged", async () => {
    const prisma = buildPrismaFake();
    seedTransaction(prisma);
    const { service } = buildService(prisma);

    await expect(
      service.routeTransaction(scope, "txn-1", { providerId: "p-1" } as any, "usr-mgr"),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.payment_transactions.rows[0].status).toBe("REQUEST_CREATED");
    expect(prisma.payment_transactions.rows[0].provider_id).toBeUndefined();
    expect(prisma.sys_outbox_events.rows.length).toBe(0);
  });

  it("surfaces a missing/cross-tenant transaction as 404 with nothing persisted", async () => {
    const prisma = buildPrismaFake();
    seedTransaction(prisma, { tenant_id: "tnt-other" });
    const { service } = buildService(prisma);

    await expect(
      service.approveTransaction(scope, "txn-1", "usr-mgr"),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.payment_transactions.rows[0].status).toBe("REQUEST_CREATED");
    expect(prisma.sys_outbox_events.rows.length).toBe(0);
  });

  it("rolls back the transition, its audit record, and the outbox event together when the outbox write fails", async () => {
    const prisma = buildPrismaFake();
    seedTransaction(prisma);
    const { service } = buildService(prisma);

    // Inject a failure in the LAST write of the Atomic_Operation (the outbox
    // event). The whole operation must roll back: status reverts, no audit row.
    prisma.sys_outbox_events.create = async () => {
      throw new Error("outbox write failed");
    };

    await expect(
      service.approveTransaction(scope, "txn-1", "usr-mgr"),
    ).rejects.toThrow(/outbox write failed/);

    expect(prisma.payment_transactions.rows[0].status).toBe("REQUEST_CREATED");
    expect(prisma.payment_audit_events.rows.length).toBe(0);
    expect(prisma.sys_outbox_events.rows.length).toBe(0);
  });
});

/* -------------------------------------------------------------------------- */
/* Refund lifecycle (Req 12.7, 12.8)                                          */
/* -------------------------------------------------------------------------- */

describe("Payment Phase 5 — refund lifecycle transitions (Req 12.7, 12.8)", () => {
  it("advances create→approve→execute atomically", async () => {
    const prisma = buildPrismaFake();
    seedRefund(prisma);
    const { service } = buildService(prisma);

    const approved = await service.approveRefund(scope, "rfd-1", "usr-mgr");
    expect(approved.status).toBe("APPROVED");

    const executed = await service.executeRefund(scope, "rfd-1", "usr-mgr");
    expect(executed.status).toBe("SETTLED");

    expect(prisma.sys_outbox_events.rows.length).toBe(2);
  });

  it("rejects executing a refund that is not yet approved, naming current+target", async () => {
    const prisma = buildPrismaFake();
    seedRefund(prisma); // status REQUESTED
    const { service } = buildService(prisma);

    let caught: unknown;
    try {
      await service.executeRefund(scope, "rfd-1", "usr-mgr");
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(BadRequestException);
    const message = (caught as BadRequestException).message;
    expect(message).toContain("'REQUESTED'");
    expect(message).toContain("'SETTLED'");
    expect(prisma.payment_refunds.rows[0].status).toBe("REQUESTED");
    expect(prisma.sys_outbox_events.rows.length).toBe(0);
  });
});

/* -------------------------------------------------------------------------- */
/* Dispute lifecycle (Req 12.9, 12.10)                                        */
/* -------------------------------------------------------------------------- */

describe("Payment Phase 5 — dispute lifecycle transitions (Req 12.9, 12.10)", () => {
  it("advances open→progress→resolve atomically and writes a chargeback in the same tx", async () => {
    const prisma = buildPrismaFake();
    seedDispute(prisma);
    const { service } = buildService(prisma);

    const progressed = await service.progressDispute(
      scope,
      "dsp-1",
      { status: "finance_review" } as any,
      "usr-mgr",
    );
    expect(progressed.status).toBe("finance_review");

    const resolved = await service.resolveDispute(
      scope,
      "dsp-1",
      { resolution: "won" } as any,
      "usr-mgr",
    );
    expect(resolved.status).toBe("RESOLVED");
    expect(prisma.payment_chargebacks.rows.length).toBe(1);
    expect(prisma.sys_outbox_events.rows.length).toBe(2);
  });

  it("rejects progressing an already-resolved dispute, leaving it unchanged", async () => {
    const prisma = buildPrismaFake();
    seedDispute(prisma, { status: "RESOLVED" });
    const { service } = buildService(prisma);

    let caught: unknown;
    try {
      await service.progressDispute(
        scope,
        "dsp-1",
        { status: "finance_review" } as any,
        "usr-mgr",
      );
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(BadRequestException);
    const message = (caught as BadRequestException).message;
    expect(message).toContain("'RESOLVED'");
    expect(prisma.payment_disputes.rows[0].status).toBe("RESOLVED");
    expect(prisma.sys_outbox_events.rows.length).toBe(0);
  });

  it("rejects resolving an already-resolved dispute, leaving it unchanged with no extra chargeback", async () => {
    const prisma = buildPrismaFake();
    seedDispute(prisma, { status: "RESOLVED" });
    const { service } = buildService(prisma);

    await expect(
      service.resolveDispute(scope, "dsp-1", { resolution: "lost" } as any, "usr-mgr"),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.payment_disputes.rows[0].status).toBe("RESOLVED");
    expect(prisma.payment_chargebacks.rows.length).toBe(0);
    expect(prisma.sys_outbox_events.rows.length).toBe(0);
  });
});
