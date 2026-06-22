import { describe, it, expect, vi, beforeEach } from "vitest";

import { SalesDbRepository } from "./sales.db.repository";
import { UnresolvedFieldError } from "../../common";
import type { TenantScope } from "../../../shared/scope/tenant-scope";

/**
 * Task 6.2 — Sales create/update with explicit DTO-to-column mapping.
 *
 * These tests exercise the repository write paths directly (with a fake Prisma
 * client) to assert the field-mapping discipline introduced by task 6.2:
 *   - DTO camelCase fields bind to their single corresponding snake_case column
 *     (Requirements 5.1, 5.2, 5.3, 10.1).
 *   - A field that resolves to no schema column rejects the whole request and
 *     persists nothing (Requirements 5.4, 10.2).
 *   - Context-derived scope (`tenant_id`, `company_id`) and the verified actor
 *     (`owner_id`/`created_by`) are bound explicitly rather than from the DTO
 *     (Requirements 2.2, 2.10).
 *   - No hardcoded record identifiers are written; `id` is left to the schema
 *     default (Requirement 1.2 / 13.4).
 */

const SCOPE: TenantScope = { tenant_id: "tnt-1" };
const ACTOR = "user-7";

function buildPrismaMock() {
  const echoCreate = (extra: Record<string, unknown> = {}) =>
    vi.fn(async ({ data }: any) => ({
      id: "generated-id",
      created_at: new Date("2024-01-01T00:00:00.000Z"),
      updated_at: new Date("2024-01-01T00:00:00.000Z"),
      ...extra,
      ...data,
    }));

  return {
    sales_leads: { create: echoCreate() },
    sales_opportunities: {
      create: echoCreate(),
      findFirst: vi.fn(async () => ({
        id: "opp-1",
        tenant_id: "tnt-1",
        account_name: "Acme Corp",
        currency: "USD",
        company_id: null,
      })),
    },
    sales_quotes: { create: echoCreate() },
    sales_timeline_events: { create: echoCreate() },
    sales_tasks: { create: echoCreate() },
  } as any;
}

describe("SalesDbRepository — lead create field mapping (task 6.2)", () => {
  let prisma: any;
  let repo: SalesDbRepository;

  beforeEach(() => {
    prisma = buildPrismaMock();
    repo = new SalesDbRepository(prisma);
  });

  it("binds DTO fields to columns, forces context tenant, and defaults owner to actor", async () => {
    await repo.createLead(
      SCOPE,
      {
        company_name: "Acme Corp",
        contact_name: "Jane Doe",
        contact_email: "jane@acme.test",
        contactPhone: "0800",
        source: "inbound",
        potential_value: 12000,
        currency: "USD",
        priority: "high",
      } as any,
      ACTOR,
    );

    const data = prisma.sales_leads.create.mock.calls[0][0].data;
    expect(data.tenant_id).toBe("tnt-1");
    expect(data.company_name).toBe("Acme Corp");
    // camelCase DTO -> snake_case column (Req 5.2)
    expect(data.contact_phone).toBe("0800");
    expect(data.potential_value).toBe(12000);
    // owner is the verified actor (Req 2.10)
    expect(data.owner_id).toBe(ACTOR);
    expect(data.owner_name).toBe(ACTOR);
    // required column without a DTO field is defaulted
    expect(data.sla_due_at).toBeInstanceOf(Date);
    // no hardcoded id written (relies on schema default)
    expect(data.id).toBeUndefined();
  });

  it("rejects an unknown lead field and persists nothing (Req 5.4, 10.2)", async () => {
    await expect(
      repo.createLead(
        SCOPE,
        {
          company_name: "X",
          contact_name: "Y",
          potential_value: 1,
          bogusField: "nope",
        } as any,
        ACTOR,
      ),
    ).rejects.toBeInstanceOf(UnresolvedFieldError);
    expect(prisma.sales_leads.create).not.toHaveBeenCalled();
  });
});

describe("SalesDbRepository — opportunity create field mapping (task 6.2)", () => {
  let prisma: any;
  let repo: SalesDbRepository;

  beforeEach(() => {
    prisma = buildPrismaMock();
    repo = new SalesDbRepository(prisma);
  });

  it("maps nextAction->next_action and defaults owner + expected_close_date", async () => {
    await repo.createOpportunity(
      SCOPE,
      {
        account_name: "Acme Corp",
        amount: 50000,
        currency: "USD",
        nextAction: "Send proposal",
      } as any,
      ACTOR,
    );

    const data = prisma.sales_opportunities.create.mock.calls[0][0].data;
    expect(data.tenant_id).toBe("tnt-1");
    expect(data.account_name).toBe("Acme Corp");
    expect(data.next_action).toBe("Send proposal");
    expect(data.owner_id).toBe(ACTOR);
    expect(data.expected_close_date).toBeInstanceOf(Date);
    expect(data.id).toBeUndefined();
  });

  it("honours an explicit owner from the DTO", async () => {
    await repo.createOpportunity(
      SCOPE,
      {
        account_name: "Acme Corp",
        amount: 1,
        owner_id: "rep-1",
        owner_name: "Rep One",
      } as any,
      ACTOR,
    );
    const data = prisma.sales_opportunities.create.mock.calls[0][0].data;
    expect(data.owner_id).toBe("rep-1");
    expect(data.owner_name).toBe("Rep One");
  });

  it("rejects an unknown opportunity field and persists nothing", async () => {
    await expect(
      repo.createOpportunity(
        SCOPE,
        { account_name: "X", amount: 1, notAColumn: true } as any,
        ACTOR,
      ),
    ).rejects.toBeInstanceOf(UnresolvedFieldError);
    expect(prisma.sales_opportunities.create).not.toHaveBeenCalled();
  });
});

describe("SalesDbRepository — quote create field mapping (task 6.2)", () => {
  let prisma: any;
  let repo: SalesDbRepository;

  beforeEach(() => {
    prisma = buildPrismaMock();
    repo = new SalesDbRepository(prisma);
  });

  it("derives account_name/currency from opportunity, computes net_amount and valid_until", async () => {
    await repo.createQuote(
      SCOPE,
      {
        opportunityId: "opp-1",
        amount: 1000,
        discountPercent: 10,
        validDays: 30,
        notes: "First quote",
      } as any,
      ACTOR,
    );

    const data = prisma.sales_quotes.create.mock.calls[0][0].data;
    expect(prisma.sales_opportunities.findFirst).toHaveBeenCalledWith({
      where: { id: "opp-1", tenant_id: "tnt-1" },
    });
    expect(data.opportunity_id).toBe("opp-1");
    expect(data.discount_percent).toBe(10);
    expect(data.account_name).toBe("Acme Corp");
    expect(data.currency).toBe("USD");
    expect(data.net_amount).toBe(900); // 1000 - 10%
    expect(data.valid_until).toBeInstanceOf(Date);
    expect(data.created_by).toBe(ACTOR);
    // transient validDays is not written as a (nonexistent) column
    expect(data.valid_days).toBeUndefined();
    expect(data.id).toBeUndefined();
  });

  it("rejects a quote for an opportunity outside the caller's scope", async () => {
    prisma.sales_opportunities.findFirst = vi.fn(async () => null);
    await expect(
      repo.createQuote(
        SCOPE,
        { opportunityId: "opp-x", amount: 1, discountPercent: 0 } as any,
        ACTOR,
      ),
    ).rejects.toThrow();
    expect(prisma.sales_quotes.create).not.toHaveBeenCalled();
  });

  it("rejects an unknown quote field and persists nothing", async () => {
    await expect(
      repo.createQuote(
        SCOPE,
        {
          opportunityId: "opp-1",
          amount: 1,
          discountPercent: 0,
          bogusField: 1,
        } as any,
        ACTOR,
      ),
    ).rejects.toBeInstanceOf(UnresolvedFieldError);
    expect(prisma.sales_quotes.create).not.toHaveBeenCalled();
  });
});

describe("SalesDbRepository — timeline/task create field mapping (task 6.2)", () => {
  let prisma: any;
  let repo: SalesDbRepository;

  beforeEach(() => {
    prisma = buildPrismaMock();
    repo = new SalesDbRepository(prisma);
  });

  it("createTimelineEvent maps opportunityId->opportunity_id and defaults created_by to actor", async () => {
    await repo.createTimelineEvent(
      SCOPE,
      {
        opportunityId: "opp-1",
        channel: "email",
        direction: "outbound",
        summary: "Sent intro email",
        detail: "Details here",
      } as any,
      ACTOR,
    );
    const data = prisma.sales_timeline_events.create.mock.calls[0][0].data;
    expect(data.opportunity_id).toBe("opp-1");
    expect(data.summary).toBe("Sent intro email");
    expect(data.created_by).toBe(ACTOR);
    expect(data.id).toBeUndefined();
  });

  it("createTask maps dueAt to a Date and defaults owner to actor", async () => {
    await repo.createTask(
      SCOPE,
      {
        opportunityId: "opp-1",
        title: "Follow up",
        dueAt: "2024-06-01T00:00:00.000Z",
        priority: "high",
      } as any,
      ACTOR,
    );
    const data = prisma.sales_tasks.create.mock.calls[0][0].data;
    expect(data.opportunity_id).toBe("opp-1");
    expect(data.title).toBe("Follow up");
    expect(data.due_at).toBeInstanceOf(Date);
    expect(data.owner_id).toBe(ACTOR);
    expect(data.owner_name).toBe(ACTOR);
    expect(data.id).toBeUndefined();
  });

  it("rejects an unknown task field and persists nothing", async () => {
    await expect(
      repo.createTask(
        SCOPE,
        { title: "X", dueAt: "2024-06-01", bogusField: 1 } as any,
        ACTOR,
      ),
    ).rejects.toBeInstanceOf(UnresolvedFieldError);
    expect(prisma.sales_tasks.create).not.toHaveBeenCalled();
  });
});

describe("SalesDbRepository — scoped SLA sweep (task 6.4)", () => {
  const SWEEP_SCOPE: TenantScope = { tenant_id: "tnt-1" };

  /**
   * Build a Prisma mock whose `sales_leads.findMany` returns a fixed set of
   * overdue leads, tracks the `where` clause used, and threads a transaction
   * client through `$transaction` so the sweep's alert + audit writes can be
   * asserted (task 6.4 — Requirements 10.8, 4.1, 2.10).
   */
  function buildSweepPrisma(opts: {
    overdueLeads?: any[];
    existingAlertLeadIds?: string[];
  } = {}) {
    const findManyLeads = vi.fn(async () => opts.overdueLeads ?? []);
    const findManyAlerts = vi.fn(async () =>
      (opts.existingAlertLeadIds ?? []).map((id) => ({ entity_id: id })),
    );
    const txAlertCreate = vi.fn(async ({ data }: any) => ({
      id: `alert-${data.entity_id}`,
      created_at: new Date("2024-01-01T00:00:00.000Z"),
      ...data,
    }));
    const txAuditCreate = vi.fn(async ({ data }: any) => ({
      id: `audit-${data.entity_id}`,
      ...data,
    }));

    const tx = {
      sales_alerts: { create: txAlertCreate },
      sales_audit_events: { create: txAuditCreate },
    };

    const prisma = {
      sales_leads: { findMany: findManyLeads },
      sales_alerts: { findMany: findManyAlerts },
      $transaction: vi.fn(async (cb: any) => cb(tx)),
    } as any;

    return { prisma, findManyLeads, findManyAlerts, txAlertCreate, txAuditCreate };
  }

  it("filters the sweep by the caller's tenant scope (Req 10.8, 2.1)", async () => {
    const { prisma, findManyLeads } = buildSweepPrisma({ overdueLeads: [] });
    const repo = new SalesDbRepository(prisma);

    const result = await repo.runSlaSweep(SWEEP_SCOPE, ACTOR);

    expect(result).toEqual([]);
    const where = findManyLeads.mock.calls[0][0].where;
    expect(where.tenant_id).toBe("tnt-1");
    // Only leads with an elapsed SLA and no first response are evaluated, and
    // converted/closed leads are excluded.
    expect(where.first_response_at).toBeNull();
    expect(where.sla_due_at).toHaveProperty("lt");
    expect(where.status.notIn).toEqual(
      expect.arrayContaining(["CONVERTED", "DISQUALIFIED", "REJECTED"]),
    );
  });

  it("creates one alert per overdue lead and records the actor for each change (Req 10.8, 2.10)", async () => {
    const { prisma, txAlertCreate, txAuditCreate } = buildSweepPrisma({
      overdueLeads: [
        { id: "lead-1", contact_name: "Jane", company_name: "Acme", company_id: null },
        { id: "lead-2", contact_name: "John", company_name: "Globex", company_id: "co-9" },
      ],
    });
    const repo = new SalesDbRepository(prisma);

    const alerts = await repo.runSlaSweep(SWEEP_SCOPE, ACTOR);

    expect(alerts).toHaveLength(2);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(txAlertCreate).toHaveBeenCalledTimes(2);
    expect(txAuditCreate).toHaveBeenCalledTimes(2);

    // Every alert is tenant-scoped, typed as an SLA breach, and references its lead.
    const alertData = txAlertCreate.mock.calls.map((c) => c[0].data);
    expect(alertData.every((d) => d.tenant_id === "tnt-1")).toBe(true);
    expect(alertData.every((d) => d.type === "SLA_BREACH")).toBe(true);
    expect(alertData.map((d) => d.entity_id).sort()).toEqual(["lead-1", "lead-2"]);
    // company_id flows from the lead when present.
    expect(alertData.find((d) => d.entity_id === "lead-2").company_id).toBe("co-9");

    // The actor from the Tenant_Context is recorded against every change.
    const auditData = txAuditCreate.mock.calls.map((c) => c[0].data);
    expect(auditData.every((d) => d.actor_id === ACTOR)).toBe(true);
    expect(auditData.every((d) => d.action === "SLA_BREACH_FLAGGED")).toBe(true);
  });

  it("is idempotent: skips leads that already carry an open SLA_BREACH alert", async () => {
    const { prisma, txAlertCreate } = buildSweepPrisma({
      overdueLeads: [
        { id: "lead-1", contact_name: "Jane", company_name: "Acme", company_id: null },
        { id: "lead-2", contact_name: "John", company_name: "Globex", company_id: null },
      ],
      existingAlertLeadIds: ["lead-1"],
    });
    const repo = new SalesDbRepository(prisma);

    const alerts = await repo.runSlaSweep(SWEEP_SCOPE, ACTOR);

    expect(alerts).toHaveLength(1);
    expect(txAlertCreate).toHaveBeenCalledTimes(1);
    expect(txAlertCreate.mock.calls[0][0].data.entity_id).toBe("lead-2");
  });

  it("makes no writes when no leads are overdue", async () => {
    const { prisma } = buildSweepPrisma({ overdueLeads: [] });
    const repo = new SalesDbRepository(prisma);

    const alerts = await repo.runSlaSweep(SWEEP_SCOPE, ACTOR);

    expect(alerts).toEqual([]);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
