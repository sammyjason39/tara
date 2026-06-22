import { describe, it, expect } from "vitest";

import { MarketingService } from "./marketing.service";
import { Customer360Service } from "./customer-360.service";
import { MarketingDbRepository } from "./repositories/marketing.db.repository";
import { AtomicOperationService } from "../shared/atomic/atomic-operation.service";
import { NotFoundException } from "../_shared";
import type { TenantScope } from "../../shared/scope/tenant-scope";

/**
 * Task 8.4 — Atomic creative-asset upload and Customer 360.
 *
 * These example/edge tests drive the REAL `MarketingDbRepository`,
 * `AtomicOperationService`, `MarketingService`, and `Customer360Service`
 * against an in-memory fake Prisma client whose `$transaction` snapshots every
 * table before the body runs and restores them if the body throws, reproducing
 * the atomicity guarantees the live `tnt-3rlhko` run asserts:
 *
 *   - A creative-asset upload registers the record together with its
 *     Audit_Trail entry and Integration_Log outbox event in ONE
 *     Atomic_Operation (Requirements 11.7).
 *   - If registration fails, the transaction rolls back (no orphaned record)
 *     AND the stored blob is removed via the compensating cleanup (no orphaned
 *     blob), leaving neither orphan behind (Requirement 11.8).
 *   - A Customer 360 profile is assembled only from in-scope records; an
 *     out-of-scope contact surfaces as a typed 404, never as leakage
 *     (Requirement 11.9).
 */

type Row = Record<string, any>;

function matchesWhere(row: Row, where: Row | undefined): boolean {
  if (!where) return true;
  return Object.entries(where).every(([key, cond]) => {
    if (cond && typeof cond === "object" && !Array.isArray(cond)) {
      if ("in" in cond) return (cond.in as unknown[]).includes(row[key]);
      return true;
    }
    return row[key] === cond;
  });
}

interface FakeTable {
  rows: Row[];
  create: (args: { data: Row }) => Promise<Row>;
  findFirst: (args?: { where?: Row }) => Promise<Row | null>;
  findMany: (args?: { where?: Row }) => Promise<Row[]>;
  __snapshot: () => Row[];
  __restore: (rows: Row[]) => void;
}

function makeTable(name: string, opts: { failCreate?: boolean } = {}): FakeTable {
  const rows: Row[] = [];
  let seq = 0;
  return {
    rows,
    create: async ({ data }: { data: Row }) => {
      if (opts.failCreate) throw new Error(`Injected failure creating ${name}`);
      const row: Row = {
        id: data.id ?? `${name}-${++seq}`,
        created_at: data.created_at ?? new Date(),
        ...data,
      };
      rows.push(row);
      return { ...row };
    },
    findFirst: async ({ where }: { where?: Row } = {}) => {
      const row = rows.find((r) => matchesWhere(r, where));
      return row ? { ...row } : null;
    },
    findMany: async ({ where }: { where?: Row } = {}) =>
      rows.filter((r) => matchesWhere(r, where)).map((r) => ({ ...r })),
    __snapshot: () => rows.map((r) => ({ ...r })),
    __restore: (snapshot: Row[]) => {
      rows.length = 0;
      rows.push(...snapshot.map((r) => ({ ...r })));
    },
  };
}

function buildPrismaFake(opts: { failAssetCreate?: boolean } = {}) {
  const prisma: any = {};
  const tables: FakeTable[] = [];
  const register = (name: string, table: FakeTable) => {
    prisma[name] = table;
    tables.push(table);
  };
  register(
    "marketing_creative_assets",
    makeTable("marketing_creative_assets", { failCreate: opts.failAssetCreate }),
  );
  register("sys_outbox_events", makeTable("sys_outbox_events"));

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

function buildService(prisma: any) {
  const repository = new MarketingDbRepository(prisma);
  const auditStub = { log: async () => undefined } as any;
  const eventBusStub = { publish: async () => undefined } as any;
  const socialSyncStub = { syncAccount: async () => ({ dataPoints: 0 }) } as any;
  const atomic = new AtomicOperationService(prisma, auditStub, eventBusStub);
  const asyncRejectionStub = {
    runWithDeadline: (_d: any, work: any) => work(),
    runBatch: async (_d: any, items: any[], handler: any) => {
      const results: any[] = [];
      for (let i = 0; i < items.length; i++) results.push(await handler(items[i], i));
      return { total: items.length, succeeded: results.length, failed: 0, results, outcomes: [] };
    },
    fireAndForget: async (_d: any, work: any) => {
      try { await work(); } catch { /* swallow */ }
    },
  } as any;
  const service = new MarketingService(
    repository as any,
    auditStub,
    socialSyncStub,
    atomic,
    asyncRejectionStub,
  );
  return { service, repository, prisma };
}

const TENANT = "tnt-3rlhko";
const scope: TenantScope = { tenant_id: TENANT };
const ACTOR = "usr-mkt";

const ASSET = {
  name: "Hero Banner",
  type: "IMAGE",
  url: "/api/v1/marketing/assets/raw/file-1.png",
  metadata: { filename: "file-1.png" },
};

/* -------------------------------------------------------------------------- */
/* Atomic creative-asset upload (Req 11.7, 11.8)                              */
/* -------------------------------------------------------------------------- */

describe("Marketing Phase 4 — atomic creative-asset upload (Req 11.7, 11.8)", () => {
  it("registers the asset record and outbox event in one Atomic_Operation, keeping the blob", async () => {
    const prisma = buildPrismaFake();
    const { service, prisma: db } = buildService(prisma);

    let blobDeleted = false;
    const result = await service.uploadCreativeAsset(scope, ASSET, ACTOR, () => {
      blobDeleted = true;
    });

    // Record registered within the tenant scope, outbox event written, and the
    // stored blob was NOT cleaned up because the operation succeeded.
    expect(result.id).toBeTruthy();
    expect(db.marketing_creative_assets.rows.length).toBe(1);
    expect(db.marketing_creative_assets.rows[0].tenant_id).toBe(TENANT);
    expect(db.sys_outbox_events.rows.length).toBe(1);
    expect(blobDeleted).toBe(false);
  });

  it("on registration failure rolls back the record AND deletes the stored blob (no orphan)", async () => {
    const prisma = buildPrismaFake({ failAssetCreate: true });
    const { service, prisma: db } = buildService(prisma);

    let blobDeleted = false;
    let caught: unknown;
    try {
      await service.uploadCreativeAsset(scope, ASSET, ACTOR, () => {
        blobDeleted = true;
      });
    } catch (e) {
      caught = e;
    }

    expect(caught).toBeInstanceOf(Error);
    // No orphaned record: the transaction rolled back every write.
    expect(db.marketing_creative_assets.rows.length).toBe(0);
    expect(db.sys_outbox_events.rows.length).toBe(0);
    // No orphaned blob: the compensating cleanup deleted the stored blob.
    expect(blobDeleted).toBe(true);
  });
});

/* -------------------------------------------------------------------------- */
/* Customer 360 tenant scoping (Req 11.9)                                     */
/* -------------------------------------------------------------------------- */

describe("Customer 360 — assembled only from in-scope records (Req 11.9)", () => {
  function buildCustomer360(contacts: Row[]) {
    const prisma: any = {
      marketing_contacts: {
        findFirst: async ({ where }: { where?: Row } = {}) => {
          const row = contacts.find((c) => matchesWhere(c, where));
          return row ? { ...row, messages: [], appointments: [], marketing_leads: [], retail_customers: [], sales_leads: [] } : null;
        },
      },
    };
    return new Customer360Service(prisma);
  }

  it("returns the profile for an in-scope contact", async () => {
    const svc = buildCustomer360([
      { id: "c-1", tenant_id: TENANT, first_name: "A", last_name: "B" },
    ]);
    const profile = await svc.getUnifiedProfile({ tenant_id: TENANT } as any, "c-1");
    expect(profile).toBeTruthy();
    expect((profile as any).id).toBe("c-1");
    expect((profile as any).timeline).toEqual([]);
  });

  it("rejects an out-of-scope contact as a typed 404 (no cross-tenant leakage)", async () => {
    const svc = buildCustomer360([
      { id: "c-1", tenant_id: "tnt-other", first_name: "A", last_name: "B" },
    ]);
    let caught: unknown;
    try {
      await svc.getUnifiedProfile({ tenant_id: TENANT } as any, "c-1");
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(NotFoundException);
  });
});
