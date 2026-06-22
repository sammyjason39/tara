import { describe, it, expect, vi, beforeEach } from "vitest";

import { MarketingDbRepository } from "./marketing.db.repository";
import { UnresolvedFieldError } from "../../common";
import type { TenantScope } from "../../../shared/scope/tenant-scope";

/**
 * Task 8.2 — Marketing create/update with explicit DTO-to-column mapping and
 * scoped, round-trip reads.
 *
 * These tests exercise the repository write paths directly (with a fake Prisma
 * client) to assert the field-mapping discipline introduced by task 8.2:
 *   - DTO camelCase fields bind to their single corresponding snake_case column
 *     (Requirements 5.1, 5.2, 5.3, 11.1).
 *   - A field that resolves to no schema column rejects the whole request and
 *     persists nothing (Requirements 5.4, 11.2).
 *   - Context-derived scope (`tenant_id`) and the verified actor are bound
 *     explicitly rather than spread from the DTO (Requirements 2.2, 2.10).
 *   - The persisted record is returned and reflects the written values, with no
 *     field dropped due to a name/casing mismatch (round-trip — Requirement 11.1).
 */

const SCOPE: TenantScope = { tenant_id: "tnt-1" };
const ACTOR = "user-7";

function buildPrismaMock() {
  const echoCreate = () =>
    vi.fn(async ({ data }: any) => ({
      created_at: new Date("2024-01-01T00:00:00.000Z"),
      updated_at: new Date("2024-01-01T00:00:00.000Z"),
      ...data,
    }));

  return {
    marketing_campaigns: { create: echoCreate() },
    marketing_executions: { create: echoCreate() },
    marketing_leads: { create: echoCreate() },
    marketing_workflows: { create: echoCreate() },
    marketing_accounts: { create: echoCreate() },
    marketing_contacts: { create: echoCreate() },
    marketing_funnels: {
      create: vi.fn(async ({ data }: any) => ({
        created_at: new Date(),
        updated_at: new Date(),
        steps: [],
        ...data,
      })),
    },
    marketing_creative_assets: { create: echoCreate() },
  } as any;
}

describe("MarketingDbRepository — campaign create field mapping (task 8.2)", () => {
  let prisma: any;
  let repo: MarketingDbRepository;

  beforeEach(() => {
    prisma = buildPrismaMock();
    repo = new MarketingDbRepository(prisma);
  });

  it("binds DTO fields to columns, forces context tenant, sets actor owner and DRAFT status", async () => {
    const result = await repo.createCampaign(
      SCOPE,
      {
        name: "Spring Launch",
        objective: "lead_generation",
        channel_mix: ["email", "meta_ads"],
        budget: 5000,
        currency: "USD",
        start_date: "2024-03-01T00:00:00.000Z",
        end_date: "2024-04-01T00:00:00.000Z",
        audience: "SMB owners",
      } as any,
      ACTOR,
    );

    const data = prisma.marketing_campaigns.create.mock.calls[0][0].data;
    expect(data.tenant_id).toBe("tnt-1");
    expect(data.name).toBe("Spring Launch");
    expect(data.channel_mix).toEqual(["email", "meta_ads"]);
    expect(data.owner_id).toBe(ACTOR);
    expect(data.status).toBe("DRAFT");
    expect(data.start_date).toBeInstanceOf(Date);
    expect(data.end_date).toBeInstanceOf(Date);

    // Round-trip: persisted record returned with mapped fields (Req 11.1).
    expect(result.name).toBe("Spring Launch");
    expect(result.status).toBe("draft");
    expect(result.start_date).toBe("2024-03-01T00:00:00.000Z");
    expect(result.aiRecommendation).toContain("System generated");
  });

  it("rejects an unknown campaign field and persists nothing (Req 5.4, 11.2)", async () => {
    await expect(
      repo.createCampaign(
        SCOPE,
        {
          name: "X",
          objective: "awareness",
          channel_mix: [],
          budget: 1,
          start_date: "2024-03-01",
          end_date: "2024-04-01",
          audience: "all",
          bogusField: "nope",
        } as any,
        ACTOR,
      ),
    ).rejects.toBeInstanceOf(UnresolvedFieldError);
    expect(prisma.marketing_campaigns.create).not.toHaveBeenCalled();
  });
});

describe("MarketingDbRepository — execution/lead create field mapping (task 8.2)", () => {
  let prisma: any;
  let repo: MarketingDbRepository;

  beforeEach(() => {
    prisma = buildPrismaMock();
    repo = new MarketingDbRepository(prisma);
  });

  it("scheduleExecution maps campaignId->campaign_id and scheduledAt->scheduled_at", async () => {
    const result = await repo.scheduleExecution(SCOPE, {
      campaignId: "cmp-1",
      channel: "email",
      scheduledAt: "2024-05-01T00:00:00.000Z",
      notes: "kickoff",
    } as any);

    const data = prisma.marketing_executions.create.mock.calls[0][0].data;
    expect(data.tenant_id).toBe("tnt-1");
    expect(data.campaign_id).toBe("cmp-1");
    expect(data.scheduled_at).toBeInstanceOf(Date);
    expect(data.status).toBe("SCHEDULED");
    expect(data.leads_generated).toBe(0);

    // Round-trip read mapping reflects the snake_case columns.
    expect(result.campaignId).toBe("cmp-1");
    expect(result.scheduledAt).toBe("2024-05-01T00:00:00.000Z");
    expect(result.leadsGenerated).toBe(0);
  });

  it("captureLead maps employeeBand->employee_band and derives dedup_key + defaults", async () => {
    const result = await repo.captureLead(SCOPE, {
      source: "landing_page",
      company_name: "Acme",
      contact_name: "Jane",
      email: "jane@acme.test",
      campaignId: "cmp-1",
      employeeBand: "11-50",
    } as any);

    const data = prisma.marketing_leads.create.mock.calls[0][0].data;
    expect(data.tenant_id).toBe("tnt-1");
    expect(data.campaign_id).toBe("cmp-1");
    expect(data.employee_band).toBe("11-50");
    expect(data.dedup_key).toBe("acme-jane@acme.test");
    expect(data.score).toBe(50);
    expect(data.status).toBe("SCORED");

    // Round-trip
    expect(result.campaignId).toBe("cmp-1");
    expect(result.employeeBand).toBe("11-50");
    expect(result.dedupKey).toBe("acme-jane@acme.test");
  });

  it("rejects an unknown lead field and persists nothing", async () => {
    await expect(
      repo.captureLead(SCOPE, {
        source: "landing_page",
        company_name: "Acme",
        contact_name: "Jane",
        notAColumn: true,
      } as any),
    ).rejects.toBeInstanceOf(UnresolvedFieldError);
    expect(prisma.marketing_leads.create).not.toHaveBeenCalled();
  });
});

describe("MarketingDbRepository — workflow/account/asset create field mapping (task 8.2)", () => {
  let prisma: any;
  let repo: MarketingDbRepository;

  beforeEach(() => {
    prisma = buildPrismaMock();
    repo = new MarketingDbRepository(prisma);
  });

  it("createWorkflow binds steps + trigger and defaults status to DRAFT", async () => {
    const result = await repo.createWorkflow(SCOPE, {
      name: "Nurture",
      trigger: "new_lead",
      steps: [{ id: "s1", order: 1, channel: "email", waitHours: 24, messageTemplate: "hi" }],
    } as any);

    const data = prisma.marketing_workflows.create.mock.calls[0][0].data;
    expect(data.tenant_id).toBe("tnt-1");
    expect(data.name).toBe("Nurture");
    expect(data.trigger).toBe("new_lead");
    expect(data.status).toBe("DRAFT");
    expect(Array.isArray(data.steps)).toBe(true);
    expect(result.status).toBe("draft");
  });

  it("connectAccount maps account_name/scopes and sets CONNECTED + token window", async () => {
    const result = await repo.connectAccount(SCOPE, {
      provider: "META",
      account_name: "Acme Ads",
      scopes: ["ads_read"],
    } as any);

    const data = prisma.marketing_accounts.create.mock.calls[0][0].data;
    expect(data.tenant_id).toBe("tnt-1");
    expect(data.provider).toBe("META");
    expect(data.account_name).toBe("Acme Ads");
    expect(data.scopes).toEqual(["ads_read"]);
    expect(data.status).toBe("CONNECTED");
    expect(data.token_expires_at).toBeInstanceOf(Date);

    // Round-trip reads the snake_case columns (token_expires_at -> tokenExpiresAt).
    expect(result.tokenExpiresAt).toBeInstanceOf(Date);
    expect(result.status).toBe("connected");
  });

  it("createCreativeAsset binds columns and defaults", async () => {
    const result = await repo.createCreativeAsset(SCOPE, {
      name: "Hero Banner",
      type: "IMAGE",
      url: "https://cdn.test/x.png",
      tags: ["spring"],
    } as any);

    const data = prisma.marketing_creative_assets.create.mock.calls[0][0].data;
    expect(data.tenant_id).toBe("tnt-1");
    expect(data.name).toBe("Hero Banner");
    expect(data.url).toBe("https://cdn.test/x.png");
    expect(data.tags).toEqual(["spring"]);
    expect((result as any).name).toBe("Hero Banner");
  });

  it("rejects an unknown creative-asset field and persists nothing", async () => {
    await expect(
      repo.createCreativeAsset(SCOPE, {
        name: "X",
        type: "IMAGE",
        url: "u",
        bogusField: 1,
      } as any),
    ).rejects.toBeInstanceOf(UnresolvedFieldError);
    expect(prisma.marketing_creative_assets.create).not.toHaveBeenCalled();
  });
});
