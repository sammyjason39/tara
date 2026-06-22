import { describe, it, expect } from "vitest";
import { BadRequestException } from "@nestjs/common";

import { MarketingService } from "./marketing.service";
import { MarketingDbRepository } from "./repositories/marketing.db.repository";
import { AtomicOperationService } from "../shared/atomic/atomic-operation.service";
import type { TenantScope } from "../../shared/scope/tenant-scope";

/**
 * Task 8.3 — Marketing atomic lifecycle transitions and Lead_Handoff.
 *
 * These example/edge tests drive the REAL `MarketingDbRepository`,
 * `AtomicOperationService` and `MarketingService` against an in-memory fake
 * Prisma client whose `$transaction` snapshots every table before the body runs
 * and restores them if the body throws, reproducing the atomicity guarantees the
 * live `tnt-3rlhko` run asserts:
 *
 *   - Campaign/workflow/account status transitions persist exactly one defined
 *     status; an invalid transition is rejected with a `BadRequestException`
 *     naming current+target, leaving the status unchanged (Requirements 11.3,
 *     11.4).
 *   - Lead_Handoff creates the Sales-consumable handoff record AND transfers the
 *     lead's consumability to Sales in ONE Atomic_Operation (Requirements 11.5).
 *   - A not-handoff-ready handoff is rejected and a failed handoff rolls back,
 *     leaving the lead consumable only by Marketing (Requirement 11.6).
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
    target[key] = value;
  }
}

interface FakeTable {
  rows: Row[];
  create: (args: { data: Row }) => Promise<Row>;
  update: (args: { where: Row; data: Row }) => Promise<Row>;
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
    findMany: async ({ where }: { where?: Row } = {}) =>
      rows.filter((r) => matchesWhere(r, where)).map((r) => ({ ...r })),
    __snapshot: () => rows.map((r) => ({ ...r })),
    __restore: (snapshot: Row[]) => {
      rows.length = 0;
      rows.push(...snapshot.map((r) => ({ ...r })));
    },
  };
}

function buildPrismaFake(opts: { failSalesLeadCreate?: boolean } = {}) {
  const prisma: any = {};
  const tables: FakeTable[] = [];
  const register = (name: string, table: FakeTable) => {
    prisma[name] = table;
    tables.push(table);
  };
  register("marketing_campaigns", makeTable("marketing_campaigns"));
  register("marketing_workflows", makeTable("marketing_workflows"));
  register("marketing_accounts", makeTable("marketing_accounts"));
  register("marketing_leads", makeTable("marketing_leads"));
  register(
    "sales_leads",
    makeTable("sales_leads", { failCreate: opts.failSalesLeadCreate }),
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

/* -------------------------------------------------------------------------- */
/* Campaign / workflow / account transitions (Req 11.3, 11.4)                 */
/* -------------------------------------------------------------------------- */

describe("Marketing Phase 4 — campaign status transitions (Req 11.3, 11.4)", () => {
  it("advances a DRAFT campaign to ACTIVE atomically and persists exactly one status", async () => {
    const prisma = buildPrismaFake();
    prisma.marketing_campaigns.rows.push({
      id: "cmp-1",
      tenant_id: TENANT,
      status: "DRAFT",
      name: "Q2",
      objective: "lead_generation",
      channel_mix: [],
      owner_id: ACTOR,
      owner_name: ACTOR,
      budget: 1000,
      currency: "USD",
      start_date: new Date(),
      end_date: new Date(),
      audience: "all",
      created_at: new Date(),
      updated_at: new Date(),
    });
    const { service, prisma: db } = buildService(prisma);

    const result = await service.updateCampaignStatus(
      scope,
      "cmp-1",
      { status: "active" } as any,
      ACTOR,
    );

    expect(result.status).toBe("active");
    expect(db.marketing_campaigns.rows[0].status).toBe("ACTIVE");
    expect(db.sys_outbox_events.rows.length).toBe(1);
  });

  it("rejects an invalid campaign transition naming current+target, leaving status unchanged", async () => {
    const prisma = buildPrismaFake();
    prisma.marketing_campaigns.rows.push({
      id: "cmp-2",
      tenant_id: TENANT,
      status: "COMPLETED",
      name: "Done",
      created_at: new Date(),
      updated_at: new Date(),
    });
    const { service, prisma: db } = buildService(prisma);

    let caught: unknown;
    try {
      await service.updateCampaignStatus(
        scope,
        "cmp-2",
        { status: "active" } as any,
        ACTOR,
      );
    } catch (e) {
      caught = e;
    }

    expect(caught).toBeInstanceOf(BadRequestException);
    expect((caught as BadRequestException).message).toContain("'COMPLETED'");
    expect((caught as BadRequestException).message).toContain("'ACTIVE'");
    // Status unchanged, no outbox event from the rolled-back operation.
    expect(db.marketing_campaigns.rows[0].status).toBe("COMPLETED");
    expect(db.sys_outbox_events.rows.length).toBe(0);
  });
});

describe("Marketing Phase 4 — workflow/account status transitions (Req 11.3, 11.4)", () => {
  it("rejects an invalid workflow transition (DRAFT -> PAUSED) leaving status unchanged", async () => {
    const prisma = buildPrismaFake();
    prisma.marketing_workflows.rows.push({
      id: "wf-1",
      tenant_id: TENANT,
      status: "DRAFT",
      name: "Nurture",
      trigger: "new_lead",
      steps: [],
      created_at: new Date(),
      updated_at: new Date(),
    });
    const { service, prisma: db } = buildService(prisma);

    await expect(
      service.updateWorkflowStatus(
        scope,
        "wf-1",
        { status: "paused" } as any,
        ACTOR,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(db.marketing_workflows.rows[0].status).toBe("DRAFT");
  });

  it("reconnects an EXPIRED account to CONNECTED (valid edge)", async () => {
    const prisma = buildPrismaFake();
    prisma.marketing_accounts.rows.push({
      id: "acc-1",
      tenant_id: TENANT,
      status: "EXPIRED",
      provider: "META",
      account_name: "Acme",
      token_expires_at: new Date(),
      scopes: [],
      last_sync_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    });
    const { service, prisma: db } = buildService(prisma);

    const result = await service.updateAccountStatus(
      scope,
      "acc-1",
      { status: "connected" } as any,
      ACTOR,
    );
    expect(result.status).toBe("connected");
    expect(db.marketing_accounts.rows[0].status).toBe("CONNECTED");
  });
});

/* -------------------------------------------------------------------------- */
/* Lead_Handoff (Req 11.5, 11.6)                                              */
/* -------------------------------------------------------------------------- */

function seedLead(prisma: any, status: string) {
  prisma.marketing_leads.rows.push({
    id: "lead-1",
    tenant_id: TENANT,
    status,
    intent: "MEDIUM",
    company_name: "Acme",
    contact_name: "Jane",
    email: "jane@acme.test",
    phone: null,
    score: 80,
    company_id: null,
    contact_id: null,
    sales_handoff_id: null,
    created_at: new Date(),
    updated_at: new Date(),
  });
}

describe("Marketing Phase 4 — Lead_Handoff (Req 11.5, 11.6)", () => {
  it("hands a HANDOFF_READY lead to Sales in one Atomic_Operation: sales lead + link + status", async () => {
    const prisma = buildPrismaFake();
    seedLead(prisma, "HANDOFF_READY");
    const { service, prisma: db } = buildService(prisma);

    const result = await service.handoffLeadToSales(scope, "lead-1", ACTOR);

    // The lead is now consumable by Sales: a sales_leads record exists and is
    // linked, and the marketing lead advanced to HANDOFF_SENT.
    expect(db.sales_leads.rows.length).toBe(1);
    expect(db.sales_leads.rows[0].source).toBe("MARKETING");
    expect(db.sales_leads.rows[0].tenant_id).toBe(TENANT);
    expect(db.marketing_leads.rows[0].status).toBe("HANDOFF_SENT");
    expect(db.marketing_leads.rows[0].sales_handoff_id).toBe(
      db.sales_leads.rows[0].id,
    );
    expect((result as any).salesHandoffId).toBe(db.sales_leads.rows[0].id);
    expect(db.sys_outbox_events.rows.length).toBe(1);
  });

  it("rejects a not-handoff-ready handoff, leaving the lead consumable only by Marketing", async () => {
    const prisma = buildPrismaFake();
    seedLead(prisma, "QUALIFIED");
    const { service, prisma: db } = buildService(prisma);

    let caught: unknown;
    try {
      await service.handoffLeadToSales(scope, "lead-1", ACTOR);
    } catch (e) {
      caught = e;
    }

    expect(caught).toBeInstanceOf(BadRequestException);
    expect((caught as BadRequestException).message).toContain("'QUALIFIED'");
    expect((caught as BadRequestException).message).toContain("'HANDOFF_SENT'");
    // No Sales-side record; the lead remains Marketing-only and unchanged.
    expect(db.sales_leads.rows.length).toBe(0);
    expect(db.marketing_leads.rows[0].status).toBe("QUALIFIED");
    expect(db.marketing_leads.rows[0].sales_handoff_id).toBe(null);
  });

  it("rolls back a failed handoff (sales lead create throws), leaving the lead Marketing-only", async () => {
    const prisma = buildPrismaFake({ failSalesLeadCreate: true });
    seedLead(prisma, "HANDOFF_READY");
    const { service, prisma: db } = buildService(prisma);

    await expect(
      service.handoffLeadToSales(scope, "lead-1", ACTOR),
    ).rejects.toThrow();

    // The whole Atomic_Operation rolled back: no sales lead, no link, status
    // unchanged at HANDOFF_READY (consumable only by Marketing), no outbox event.
    expect(db.sales_leads.rows.length).toBe(0);
    expect(db.marketing_leads.rows[0].status).toBe("HANDOFF_READY");
    expect(db.marketing_leads.rows[0].sales_handoff_id).toBe(null);
    expect(db.sys_outbox_events.rows.length).toBe(0);
  });

  it("marks a SCORED lead handoff-ready, then hands it off", async () => {
    const prisma = buildPrismaFake();
    seedLead(prisma, "SCORED");
    const { service, prisma: db } = buildService(prisma);

    await service.markLeadHandoffReady(scope, "lead-1", ACTOR);
    expect(db.marketing_leads.rows[0].status).toBe("HANDOFF_READY");

    await service.handoffLeadToSales(scope, "lead-1", ACTOR);
    expect(db.marketing_leads.rows[0].status).toBe("HANDOFF_SENT");
    expect(db.sales_leads.rows.length).toBe(1);
  });
});
