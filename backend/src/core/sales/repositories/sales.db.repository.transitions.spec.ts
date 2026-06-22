import { describe, it, expect, vi, beforeEach } from "vitest";
import { BadRequestException, NotFoundException } from "@nestjs/common";

import { SalesDbRepository } from "./sales.db.repository";
import type { TenantScope } from "../../../shared/scope/tenant-scope";

/**
 * Task 6.3 — atomic lead conversion and Sales_Pipeline / quote transitions.
 *
 * These tests drive the repository transition paths directly (with a fake
 * Prisma client) to assert the transition discipline introduced by task 6.3:
 *   - Lead conversion creates the opportunity AND updates the lead on the SAME
 *     transaction client, so both commit together or neither (Requirements
 *     10.3, 10.4). When a `tx` is supplied every write goes through it.
 *   - Each transition is validated against the entity's CURRENT state read
 *     BEFORE any write; a legal transition advances the state (Requirement
 *     10.5).
 *   - An illegal transition is rejected with a `BadRequestException` whose
 *     message names the current and the rejected target state, and NO update is
 *     performed so the entity is left unchanged (Requirement 10.6).
 */

const SCOPE: TenantScope = { tenant_id: "tnt-1" };
const ACTOR = "user-7";

/** Assert a caught value is a 400 naming current+target. */
function expectInvalidTransition(
  err: unknown,
  current: string,
  target: string,
) {
  expect(err).toBeInstanceOf(BadRequestException);
  const message = (err as BadRequestException).message;
  expect(message).toContain(`'${current}'`);
  expect(message).toContain(`'${target}'`);
  expect(message).toContain(`from '${current}' to '${target}'`);
}

function buildPrismaMock() {
  const update = vi.fn(async ({ data, where }: any) => ({
    id: where.id,
    account_name: "Acme Corp",
    amount: 1000,
    currency: "USD",
    ...data,
  }));
  const create = vi.fn(async ({ data }: any) => ({
    id: "generated-id",
    ...data,
  }));
  return {
    sales_leads: { findFirst: vi.fn(), update: vi.fn(async ({ where, data }: any) => ({ id: where.id, ...data })) },
    sales_opportunities: { findFirst: vi.fn(), update, create },
    sales_quotes: { findFirst: vi.fn(), update },
    sales_orders: { create },
  } as any;
}

describe("SalesDbRepository — convertLead atomicity + validation (task 6.3)", () => {
  let prisma: any;
  let repo: SalesDbRepository;

  beforeEach(() => {
    prisma = buildPrismaMock();
    repo = new SalesDbRepository(prisma);
  });

  it("creates the opportunity and marks the lead CONVERTED on the supplied tx", async () => {
    const txLeads = {
      findFirst: vi.fn(async () => ({
        id: "lead-1",
        tenant_id: "tnt-1",
        status: "NEW",
        company_name: "Acme Corp",
        owner_id: "rep-1",
        owner_name: "Rep One",
        potential_value: 5000,
        currency: "USD",
      })),
      update: vi.fn(async ({ where, data }: any) => ({ id: where.id, ...data })),
    };
    const txOpps = { create: vi.fn(async ({ data }: any) => ({ id: "opp-1", ...data })) };
    const tx = { sales_leads: txLeads, sales_opportunities: txOpps } as any;

    const opp = await repo.convertLead(SCOPE, "lead-1", ACTOR, tx);

    // Both writes went through the SAME tx client (Req 10.3, 10.4).
    expect(txOpps.create).toHaveBeenCalledTimes(1);
    expect(txLeads.update).toHaveBeenCalledWith({
      where: { id: "lead-1" },
      data: { status: "CONVERTED" },
    });
    // The standalone prisma client was never touched.
    expect(prisma.sales_leads.update).not.toHaveBeenCalled();
    expect(opp.lead_id).toBe("lead-1");
  });

  it("rejects converting an already-converted lead and writes nothing", async () => {
    prisma.sales_leads.findFirst = vi.fn(async () => ({
      id: "lead-1",
      tenant_id: "tnt-1",
      status: "CONVERTED",
    }));
    let caught: unknown;
    try {
      await repo.convertLead(SCOPE, "lead-1", ACTOR);
    } catch (e) {
      caught = e;
    }
    expectInvalidTransition(caught, "CONVERTED", "CONVERTED");
    expect(prisma.sales_opportunities.create).not.toHaveBeenCalled();
    expect(prisma.sales_leads.update).not.toHaveBeenCalled();
  });

  it("surfaces a missing/cross-tenant lead as 404", async () => {
    prisma.sales_leads.findFirst = vi.fn(async () => null);
    await expect(repo.convertLead(SCOPE, "lead-x", ACTOR)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.sales_opportunities.create).not.toHaveBeenCalled();
  });
});

describe("SalesDbRepository — opportunity stage transitions (task 6.3)", () => {
  let prisma: any;
  let repo: SalesDbRepository;

  beforeEach(() => {
    prisma = buildPrismaMock();
    repo = new SalesDbRepository(prisma);
  });

  it("advances a forward stage move", async () => {
    prisma.sales_opportunities.findFirst = vi.fn(async () => ({
      id: "opp-1",
      tenant_id: "tnt-1",
      stage: "NEW",
    }));
    await repo.moveOpportunityStage(SCOPE, "opp-1", { stage: "qualified" } as any);
    const data = prisma.sales_opportunities.update.mock.calls[0][0].data;
    expect(data.stage).toBe("QUALIFIED");
  });

  it("rejects a backward stage move naming current+target, leaving it unchanged", async () => {
    prisma.sales_opportunities.findFirst = vi.fn(async () => ({
      id: "opp-1",
      tenant_id: "tnt-1",
      stage: "PROPOSAL",
    }));
    let caught: unknown;
    try {
      await repo.moveOpportunityStage(SCOPE, "opp-1", { stage: "new" } as any);
    } catch (e) {
      caught = e;
    }
    expectInvalidTransition(caught, "PROPOSAL", "NEW");
    expect(prisma.sales_opportunities.update).not.toHaveBeenCalled();
  });

  it("rejects a stage move to a terminal stage (use close instead)", async () => {
    prisma.sales_opportunities.findFirst = vi.fn(async () => ({
      id: "opp-1",
      tenant_id: "tnt-1",
      stage: "NEGOTIATION",
    }));
    let caught: unknown;
    try {
      await repo.moveOpportunityStage(SCOPE, "opp-1", {
        stage: "closed_won",
      } as any);
    } catch (e) {
      caught = e;
    }
    expectInvalidTransition(caught, "NEGOTIATION", "CLOSED_WON");
    expect(prisma.sales_opportunities.update).not.toHaveBeenCalled();
  });
});

describe("SalesDbRepository — opportunity close transitions (task 6.3)", () => {
  let prisma: any;
  let repo: SalesDbRepository;

  beforeEach(() => {
    prisma = buildPrismaMock();
    repo = new SalesDbRepository(prisma);
  });

  it("closes an open opportunity as won and writes the order", async () => {
    prisma.sales_opportunities.findFirst = vi.fn(async () => ({
      id: "opp-1",
      tenant_id: "tnt-1",
      stage: "NEGOTIATION",
    }));
    await repo.closeOpportunity(SCOPE, "opp-1", { result: "won" } as any);
    expect(prisma.sales_opportunities.update.mock.calls[0][0].data.stage).toBe(
      "CLOSED_WON",
    );
    expect(prisma.sales_orders.create).toHaveBeenCalledTimes(1);
  });

  it("rejects closing an already-closed opportunity, leaving it unchanged", async () => {
    prisma.sales_opportunities.findFirst = vi.fn(async () => ({
      id: "opp-1",
      tenant_id: "tnt-1",
      stage: "CLOSED_WON",
    }));
    let caught: unknown;
    try {
      await repo.closeOpportunity(SCOPE, "opp-1", { result: "lost" } as any);
    } catch (e) {
      caught = e;
    }
    expectInvalidTransition(caught, "CLOSED_WON", "CLOSED_LOST");
    expect(prisma.sales_opportunities.update).not.toHaveBeenCalled();
    expect(prisma.sales_orders.create).not.toHaveBeenCalled();
  });
});

describe("SalesDbRepository — quote transitions (task 6.3)", () => {
  let prisma: any;
  let repo: SalesDbRepository;

  beforeEach(() => {
    prisma = buildPrismaMock();
    repo = new SalesDbRepository(prisma);
  });

  it("submits a DRAFT quote to PENDING_APPROVAL", async () => {
    prisma.sales_quotes.findFirst = vi.fn(async () => ({
      id: "q-1",
      tenant_id: "tnt-1",
      status: "DRAFT",
    }));
    await repo.submitQuote(SCOPE, "q-1");
    expect(prisma.sales_quotes.update.mock.calls[0][0].data.status).toBe(
      "PENDING_APPROVAL",
    );
  });

  it("rejects submitting an already-pending quote, leaving it unchanged", async () => {
    prisma.sales_quotes.findFirst = vi.fn(async () => ({
      id: "q-1",
      tenant_id: "tnt-1",
      status: "PENDING_APPROVAL",
    }));
    let caught: unknown;
    try {
      await repo.submitQuote(SCOPE, "q-1");
    } catch (e) {
      caught = e;
    }
    expectInvalidTransition(caught, "PENDING_APPROVAL", "PENDING_APPROVAL");
    expect(prisma.sales_quotes.update).not.toHaveBeenCalled();
  });

  it("decides a pending quote as APPROVED", async () => {
    prisma.sales_quotes.findFirst = vi.fn(async () => ({
      id: "q-1",
      tenant_id: "tnt-1",
      status: "PENDING_APPROVAL",
    }));
    await repo.decideQuote(SCOPE, "q-1", { approved: true } as any);
    expect(prisma.sales_quotes.update.mock.calls[0][0].data.status).toBe(
      "APPROVED",
    );
  });

  it("rejects deciding a DRAFT quote naming current+target, leaving it unchanged", async () => {
    prisma.sales_quotes.findFirst = vi.fn(async () => ({
      id: "q-1",
      tenant_id: "tnt-1",
      status: "DRAFT",
    }));
    let caught: unknown;
    try {
      await repo.decideQuote(SCOPE, "q-1", { approved: false } as any);
    } catch (e) {
      caught = e;
    }
    expectInvalidTransition(caught, "DRAFT", "REJECTED");
    expect(prisma.sales_quotes.update).not.toHaveBeenCalled();
  });
});
