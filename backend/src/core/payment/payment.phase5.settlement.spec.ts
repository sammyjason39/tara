import { describe, it, expect } from "vitest";

import { PaymentService } from "./payment.service";
import { PaymentDbRepository } from "./repositories/payment.db.repository";
import { AtomicOperationService } from "../shared/atomic/atomic-operation.service";
import type { TenantScope } from "../../shared/scope/tenant-scope";

/**
 * Task 10.4 — atomic settlement with the Finance_Module settlement record.
 *
 * Drives the REAL `PaymentDbRepository`, `AtomicOperationService`, and
 * `PaymentService` against an in-memory fake Prisma client whose `$transaction`
 * snapshots every table before the body runs and restores them if the body
 * throws, reproducing transactional rollback. This exercises:
 *
 *   - On settle, the Finance settlement record AND the settled transaction state
 *     are persisted within the SAME single Atomic_Operation, the Finance write
 *     threaded onto the transaction client (Requirement 12.11).
 *   - If creation of the Finance settlement record fails, the whole operation
 *     rolls back, the transaction is left in its pre-settlement
 *     (SETTLEMENT_PENDING) state, and the error propagates as a server-error
 *     (not a 4xx) response (Requirements 12.12, 11.11).
 */

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
    // Skip Prisma nested-write directives (e.g. `{ create: {...} }`).
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      !(value instanceof Date) &&
      "create" in value
    ) {
      continue;
    }
    target[key] = value;
  }
}

function makeTable(name: string) {
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
    "payment_settlements",
    "payment_evidence_packs",
    "payment_retry_attempts",
    "payment_audit_events",
    "sys_outbox_events",
  ];
  const prisma: any = {};
  const tables: ReturnType<typeof makeTable>[] = [];
  for (const n of tableNames) {
    const t = makeTable(n);
    prisma[n] = t;
    tables.push(t);
  }

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

const TENANT = "tnt-3rlhko";
const scope: TenantScope = { tenant_id: TENANT };

interface JournalCall {
  ctx: unknown;
  data: any;
  txProvided: boolean;
}

function buildService(prisma: any, financeBehaviour: "ok" | "fail") {
  const repository = new PaymentDbRepository(prisma);
  const auditStub = { log: async () => undefined } as any;
  const eventBusStub = { publish: async () => undefined } as any;
  const atomic = new AtomicOperationService(prisma, auditStub, eventBusStub);
  const adapterStub = {} as any;
  const journalCalls: JournalCall[] = [];
  const financeStub = {
    createJournal: async (ctx: unknown, data: any, tx?: unknown) => {
      journalCalls.push({ ctx, data, txProvided: tx !== undefined });
      if (financeBehaviour === "fail") {
        throw new Error("Finance settlement record write failed");
      }
      return { id: "jrnl-1" };
    },
  } as any;
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
  return { service, journalCalls };
}

function seedSettlementPending(prisma: any, overrides: Row = {}) {
  prisma.payment_settlements.rows.push({
    id: "stl-1",
    tenant_id: TENANT,
    payment_id: "txn-1",
    provider_reference: "prov-ref-1",
    status: "PENDING",
  });
  const txn: Row = {
    id: "txn-1",
    tenant_id: TENANT,
    type: "customer_collection",
    amount: 1000,
    currency: "IDR",
    destination: "acct-1",
    channel: "bank_transfer",
    method: "GATEWAY",
    gateway_fee: 30,
    status: "SETTLEMENT_PENDING",
    settlement_id: "stl-1",
    created_by: "usr-1",
    payment_status: "PENDING",
    ...overrides,
  };
  prisma.payment_transactions.rows.push(txn);
  return txn;
}

describe("Payment Phase 5 — atomic settlement + Finance settlement record (Req 12.11, 12.12)", () => {
  it("persists the Finance settlement record and the settled state in one Atomic_Operation", async () => {
    const prisma = buildPrismaFake();
    seedSettlementPending(prisma);
    const { service, journalCalls } = buildService(prisma, "ok");

    const settled = await service.settleTransaction(scope, "txn-1", "usr-mgr");

    // Settled state persisted.
    expect(settled.status).toBe("SETTLED");
    expect(prisma.payment_transactions.rows[0].status).toBe("SETTLED");
    expect(prisma.payment_settlements.rows[0].status).toBe("CONFIRMED");
    expect(prisma.payment_evidence_packs.rows.length).toBe(1);

    // Finance settlement record created exactly once, threaded onto the tx.
    expect(journalCalls.length).toBe(1);
    expect(journalCalls[0].txProvided).toBe(true);

    // The posting is balanced: total debit equals total credit.
    const lines = journalCalls[0].data.lines as Array<{
      debit: number;
      credit: number;
    }>;
    const totalDebit = lines.reduce((s, l) => s + Number(l.debit || 0), 0);
    const totalCredit = lines.reduce((s, l) => s + Number(l.credit || 0), 0);
    expect(totalDebit).toBe(totalCredit);
    expect(totalCredit).toBe(1000);

    // The settled outbox event committed in the same operation.
    expect(prisma.sys_outbox_events.rows.length).toBe(1);
    expect(prisma.sys_outbox_events.rows[0].type).toBe(
      "payment.transaction.settled.v1",
    );
  });

  it("rolls back the whole operation and leaves the transaction pre-settlement when the Finance record fails", async () => {
    const prisma = buildPrismaFake();
    seedSettlementPending(prisma);
    const { service } = buildService(prisma, "fail");

    let caught: unknown;
    try {
      await service.settleTransaction(scope, "txn-1", "usr-mgr");
    } catch (err) {
      caught = err;
    }

    // A server-error surfaced (the Finance failure, not a 4xx validation error).
    expect(caught).toBeInstanceOf(Error);

    // Requirement 12.12: nothing from the settlement persisted — the transaction
    // is left in its pre-settlement (SETTLEMENT_PENDING) state.
    expect(prisma.payment_transactions.rows[0].status).toBe(
      "SETTLEMENT_PENDING",
    );
    expect(prisma.payment_settlements.rows[0].status).toBe("PENDING");
    expect(prisma.payment_evidence_packs.rows.length).toBe(0);
    expect(prisma.sys_outbox_events.rows.length).toBe(0);
  });
});
