import { TenantScope } from "../../../shared/scope/tenant-scope";
import { MultiTenancyUtil } from "../../../shared/utils/multi-tenancy.util";
import { Injectable } from "@nestjs/common";
import { BadRequestException, NotFoundException } from "../../_shared";
import { PrismaService } from "../../../persistence/prisma.service";
import {
  IMarketingRepository,
  MarketingDashboard,
  MarketingChannelPerformance,
} from "./marketing.repository.interface";
import { MarketingCampaign } from "../entities/marketing-campaign.entity";
import { MarketingExecution } from "../entities/marketing-execution.entity";
import { MarketingLead } from "../entities/marketing-lead.entity";
import { MarketingWorkflow } from "../entities/marketing-workflow.entity";
import { MarketingContact } from "../entities/marketing-contact.entity";
import { MarketingFunnel } from "../entities/marketing-funnel.entity";
import { MarketingAppointment } from "../entities/marketing-appointment.entity";
import { MarketingAutomationRule } from "../entities/marketing-automation.entity";
import { MarketingCreativeAsset } from "../entities/marketing-creative-asset.entity";
import { MarketingOmnichannelMessage } from "../entities/marketing-message.entity";
import { MarketingConnectedAccount } from "../entities/marketing-account.entity";
import { MarketingAttribution } from "../entities/marketing-attribution.entity";
import { MarketingAlert } from "../entities/marketing-alert.entity";
import { MarketingAuditEvent } from "../entities/marketing-audit.entity";
import { CreateCampaignDto } from "../dto/create-campaign.dto";
import { UpdateCampaignStatusDto } from "../dto/update-campaign-status.dto";
import { ScheduleExecutionDto } from "../dto/schedule-execution.dto";
import { RunExecutionDto } from "../dto/run-execution.dto";
import { CaptureLeadDto } from "../dto/capture-lead.dto";
import { CreateWorkflowDto } from "../dto/create-workflow.dto";
import { UpdateWorkflowStatusDto } from "../dto/update-workflow-status.dto";
import { ConnectAccountDto } from "../dto/connect-account.dto";
import { UpdateAccountStatusDto } from "../dto/update-account-status.dto";
import { UpdateAccountSettingsDto } from "../dto/update-account-settings.dto";
import { defineFieldMap } from "../../common";
import { v4 as uuidv4 } from "uuid";

/**
 * Explicit, schema-aligned writable columns and DTO-to-column mappers for the
 * Marketing tables (`prisma/schema.prisma`). Each create/update path binds DTO
 * field values to their single corresponding snake_case column through these
 * deterministic mappers (Task 1.4 field-mapping discipline). A supplied field
 * that resolves to no known column rejects the whole request with
 * `UnresolvedFieldError` (HTTP 400) before any write, so nothing is persisted
 * (Requirements 5.1–5.4, 11.1, 11.2).
 *
 * Server-managed columns (`id`, `created_at`, `updated_at` — schema `@default`),
 * the always-context-derived scope (`tenant_id`, `branch_id`, `ecommerce_id` —
 * bound by {@link MultiTenancyUtil.wrapCreate}), and derived/defaulted values
 * (status, owner, dedup key, score, token windows) are bound explicitly by the
 * repository rather than spread from the DTO.
 */

/** `marketing_campaigns` writable columns. */
const CAMPAIGN_COLUMNS = [
  "name",
  "objective",
  "channel_mix",
  "owner_id",
  "owner_name",
  "budget",
  "currency",
  "status",
  "start_date",
  "end_date",
  "audience",
  "ai_recommendation",
  "company_id",
  "branch_id",
  "ecommerce_id",
] as const;
const mapCampaignToColumns = defineFieldMap({ columns: CAMPAIGN_COLUMNS });

/** `marketing_executions` writable columns. `failed` is transient (computes status). */
const EXECUTION_COLUMNS = [
  "campaign_id",
  "channel",
  "scheduled_at",
  "status",
  "leads_generated",
  "spend",
  "notes",
  "company_id",
  "branch_id",
  "ecommerce_id",
] as const;
const mapExecutionToColumns = defineFieldMap({
  columns: EXECUTION_COLUMNS,
  ignore: ["failed"],
});

/** `marketing_leads` writable columns. */
const LEAD_COLUMNS = [
  "campaign_id",
  "source",
  "company_name",
  "contact_name",
  "email",
  "phone",
  "country",
  "industry",
  "employee_band",
  "dedup_key",
  "score",
  "intent",
  "status",
  "qualification_reason",
  "sales_handoff_id",
  "company_id",
  "contact_id",
  "branch_id",
  "ecommerce_id",
] as const;
const mapLeadToColumns = defineFieldMap({ columns: LEAD_COLUMNS });

/** `marketing_contacts` writable columns. Entity-only/relation fields are ignored. */
const CONTACT_COLUMNS = [
  "first_name",
  "last_name",
  "email",
  "phone",
  "tags",
  "score",
  "status",
  "behavioral_data",
  "last_interaction_at",
  "company_id",
  "branch_id",
  "ecommerce_id",
] as const;
const mapContactToColumns = defineFieldMap({
  columns: CONTACT_COLUMNS,
  ignore: ["id", "tenant_id", "created_at", "updated_at", "lead_id", "customer_id"],
});

/** `marketing_workflows` writable columns. */
const WORKFLOW_COLUMNS = [
  "name",
  "trigger",
  "status",
  "steps",
  "ai_suggestion",
  "company_id",
  "branch_id",
  "ecommerce_id",
] as const;
const mapWorkflowToColumns = defineFieldMap({ columns: WORKFLOW_COLUMNS });

/** `marketing_accounts` writable columns. */
const ACCOUNT_COLUMNS = [
  "provider",
  "account_name",
  "status",
  "token_expires_at",
  "scopes",
  "last_sync_at",
  "sync_frequency",
  "sync_status",
  "daily_budget_limit",
  "metadata",
  "access_token",
  "external_id",
  "refresh_token",
  "company_id",
  "branch_id",
  "ecommerce_id",
] as const;
const mapAccountToColumns = defineFieldMap({ columns: ACCOUNT_COLUMNS });

/** `marketing_funnels` writable columns. */
const FUNNEL_COLUMNS = [
  "name",
  "description",
  "status",
  "company_id",
  "branch_id",
  "ecommerce_id",
] as const;
const mapFunnelToColumns = defineFieldMap({
  columns: FUNNEL_COLUMNS,
  ignore: ["id", "tenant_id", "created_at", "updated_at", "steps"],
});

/** `marketing_creative_assets` writable columns. */
const CREATIVE_ASSET_COLUMNS = [
  "name",
  "type",
  "url",
  "tags",
  "metadata",
  "company_id",
  "branch_id",
  "ecommerce_id",
] as const;
const mapCreativeAssetToColumns = defineFieldMap({
  columns: CREATIVE_ASSET_COLUMNS,
  ignore: ["id", "tenant_id", "created_at", "updated_at"],
});

/**
 * Marketing lifecycle transition guards (Task 8.3 — Requirements 11.3, 11.4,
 * 11.5, 11.6, 4.1, 4.2, 4.6, 4.7).
 *
 * The persisted `status` columns of `marketing_campaigns`, `marketing_workflows`,
 * `marketing_accounts`, and `marketing_leads` use upper-snake values; the DTOs
 * accept the lower-case forms. Every transition therefore normalises both the
 * CURRENT state (read inside the Atomic_Operation BEFORE any write) and the
 * requested target through {@link normStatus} before validating against the
 * adjacency maps below. An illegal transition is rejected with a
 * `BadRequestException` that names the current and target state, and because the
 * throw happens before any write nothing is persisted: the entity is left
 * unchanged and observably in exactly one defined status (Requirements 11.3,
 * 11.4, 4.7).
 */

/** `marketing_campaigns.status` adjacency — terminal states have no outgoing edge. */
const CAMPAIGN_TRANSITIONS: Record<string, Set<string>> = {
  DRAFT: new Set(["SCHEDULED", "ACTIVE"]),
  SCHEDULED: new Set(["ACTIVE", "PAUSED", "FAILED"]),
  ACTIVE: new Set(["PAUSED", "COMPLETED", "FAILED"]),
  PAUSED: new Set(["ACTIVE", "COMPLETED"]),
  COMPLETED: new Set<string>(),
  FAILED: new Set<string>(),
};

/** `marketing_workflows.status` adjacency. */
const WORKFLOW_TRANSITIONS: Record<string, Set<string>> = {
  DRAFT: new Set(["ACTIVE"]),
  ACTIVE: new Set(["PAUSED"]),
  PAUSED: new Set(["ACTIVE"]),
};

/** `marketing_accounts.status` adjacency (reconnect is allowed from expired/disconnected). */
const ACCOUNT_TRANSITIONS: Record<string, Set<string>> = {
  CONNECTED: new Set(["EXPIRED", "DISCONNECTED"]),
  EXPIRED: new Set(["CONNECTED", "DISCONNECTED"]),
  DISCONNECTED: new Set(["CONNECTED"]),
};

/**
 * Lead handoff state machine: `SCORED → QUALIFIED → HANDOFF_READY →
 * HANDOFF_SENT`. A lead may be marked handoff-ready only from a pre-handoff
 * state, and may be handed to Sales only once it is HANDOFF_READY (Requirements
 * 11.5, 11.6).
 */
const LEAD_HANDOFF_READY_FROM = new Set([
  "CAPTURED",
  "ENRICHED",
  "SCORED",
  "QUALIFIED",
]);
const LEAD_HANDOFF_SEND_FROM = new Set(["HANDOFF_READY"]);

/** Normalise a persisted/requested status value to its canonical upper form. */
function normStatus(value: unknown): string {
  return String(value ?? "").toUpperCase();
}

/**
 * Build the standard invalid-transition error naming the entity, its current
 * status, and the rejected target status (Requirements 11.3, 11.4).
 */
function invalidMarketingTransition(
  entity: string,
  id: string,
  current: string,
  target: string,
): BadRequestException {
  return new BadRequestException(
    `Invalid ${entity} status transition for '${id}': ` +
      `cannot transition from '${current}' to '${target}'.`,
  );
}

/**
 * Validate a status transition against an adjacency map; throw a
 * `BadRequestException` naming current+target when the edge is not defined,
 * leaving the entity unchanged (the throw happens before any write).
 */
function assertTransition(
  map: Record<string, Set<string>>,
  entity: string,
  id: string,
  current: string,
  target: string,
): void {
  const allowed = map[current];
  if (!allowed || !allowed.has(target)) {
    throw invalidMarketingTransition(entity, id, current, target);
  }
}

@Injectable()
export class MarketingDbRepository extends IMarketingRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  // Mappers
  private mapCampaign(db: any): MarketingCampaign {
    return {
      id: db.id,
      tenant_id: db.tenant_id,
      name: db.name,
      objective: db.objective as any,
      channel_mix: db.channel_mix as any,
      owner_id: db.owner_id,
      owner_name: db.owner_name,
      budget: Number(db.budget),
      currency: db.currency as any,
      status: db.status.toLowerCase() as any,
      start_date: db.start_date.toISOString(),
      end_date: db.end_date.toISOString(),
      audience: db.audience,
      aiRecommendation: db.ai_recommendation ?? undefined,
      created_at: db.created_at,
      updated_at: db.updated_at,
      branch_id: db.branch_id ?? undefined,
      ecommerce_id: db.ecommerce_id ?? undefined,
    };
  }

  private mapExecution(db: any): MarketingExecution {
    return {
      id: db.id,
      tenant_id: db.tenant_id,
      campaignId: db.campaign_id,
      channel: db.channel as any,
      scheduledAt: db.scheduled_at.toISOString(),
      status: db.status.toLowerCase() as any,
      leadsGenerated: db.leads_generated,
      spend: Number(db.spend),
      notes: db.notes,
      created_at: db.created_at,
      updated_at: db.updated_at,
      branch_id: db.branch_id ?? undefined,
      ecommerce_id: db.ecommerce_id ?? undefined,
    };
  }

  private mapLead(db: any): MarketingLead {
    return {
      id: db.id,
      tenant_id: db.tenant_id,
      campaignId: db.campaign_id,
      source: db.source as any,
      company_name: db.company_name,
      contact_name: db.contact_name,
      email: db.email,
      phone: db.phone,
      country: db.country,
      industry: db.industry,
      employeeBand: db.employee_band,
      dedupKey: db.dedup_key,
      score: db.score,
      intent: db.intent.toUpperCase() as any,
      status: db.status.toUpperCase() as any,
      qualificationReason: db.qualification_reason,
      salesHandoffId: db.sales_handoff_id,
      created_at: db.created_at,
      updated_at: db.updated_at,
      branch_id: db.branch_id ?? undefined,
      ecommerce_id: db.ecommerce_id ?? undefined,
    };
  }

  private mapWorkflow(db: any): MarketingWorkflow {
    return {
      id: db.id,
      tenant_id: db.tenant_id,
      name: db.name,
      trigger: db.trigger as any,
      status: db.status.toLowerCase() as any,
      steps: db.steps as any,
      aiSuggestion: db.ai_suggestion ?? undefined,
      created_at: db.created_at,
      updated_at: db.updated_at,
      branch_id: db.branch_id ?? undefined,
      ecommerce_id: db.ecommerce_id ?? undefined,
    };
  }

  private mapAccount(db: any): MarketingConnectedAccount {
    return {
      id: db.id,
      tenant_id: db.tenant_id,
      provider: db.provider as any,
      account_name: db.account_name,
      status: db.status.toLowerCase() as any,
      tokenExpiresAt: db.token_expires_at,
      scopes: db.scopes,
      lastSyncAt: db.last_sync_at ?? undefined,
      created_at: db.created_at,
      updated_at: db.updated_at,
      branch_id: db.branch_id ?? undefined,
      ecommerce_id: db.ecommerce_id ?? undefined,
      daily_budget_limit:
        db.daily_budget_limit != null ? Number(db.daily_budget_limit) : undefined,
      sync_frequency: db.sync_frequency,
      metadata: db.metadata,
    };
  }

  // Implementation
  async getDashboard(ctx: TenantScope): Promise<MarketingDashboard> {
    const [campaigns, leads, executions, accounts, attribution] =
      await Promise.all([
        this.prisma.marketing_campaigns.findMany({
          where: MultiTenancyUtil.getScope(ctx),
        }),
        this.prisma.marketing_leads.findMany({ where: MultiTenancyUtil.getScope(ctx) }),
        this.prisma.marketing_executions.findMany({
          where: MultiTenancyUtil.getScope(ctx),
        }),
        this.prisma.marketing_accounts.findMany({
          where: MultiTenancyUtil.getScope(ctx),
        }),
        this.prisma.marketing_attribution.findMany({
          where: MultiTenancyUtil.getScope(ctx),
        }),
      ]);

    const spendToDate = executions.reduce(
      (sum: number, item: any) => sum + Number(item.spend),
      0,
    );
    const attributedRevenue = attribution.reduce(
      (sum: number, item: any) => sum + Number(item.revenue_attributed),
      0,
    );
    const blendedRoiPercent =
      spendToDate > 0
        ? ((attributedRevenue - spendToDate) / spendToDate) * 100
        : 0;

    return {
      activeCampaigns: campaigns.filter((c: any) => c.status === "ACTIVE")
        .length,
      leadsToday: leads.filter(
        (l: any) => l.created_at.toDateString() === new Date().toDateString(),
      ).length,
      qualifiedLeads: leads.filter((l: any) => l.status === "QUALIFIED").length,
      handoffReady: leads.filter((l: any) => l.status === "HANDOFF_READY")
        .length,
      spendToDate,
      attributedRevenue,
      blendedRoiPercent: Number(blendedRoiPercent.toFixed(2)),
      connectedAccountsHealthy: accounts.filter(
        (a: any) => a.status === "CONNECTED",
      ).length,
    };
  }

  async getChannelPerformance(ctx: TenantScope,
  ): Promise<MarketingChannelPerformance[]> {
    const executions = await this.prisma.marketing_executions.findMany({
      where: MultiTenancyUtil.getScope(ctx),
    });

    const groups = executions.reduce(
      (acc: any, curr: any) => {
        const channel = curr.channel;
        if (!acc[channel]) acc[channel] = { leads: 0, spend: 0 };
        acc[channel].leads += curr.leadsGenerated;
        acc[channel].spend += Number(curr.spend);
        return acc;
      },
      {} as Record<string, { leads: number; spend: number }>,
    );

    return Object.entries(groups).map(([channel, data]: [string, any]) => ({
      channel: channel as any,
      leads: data.leads,
      spend: data.spend,
      cpl: data.leads > 0 ? data.spend / data.leads : 0,
    }));
  }

  async getCampaigns(ctx: TenantScope): Promise<MarketingCampaign[]> {
    const items = await this.prisma.marketing_campaigns.findMany({
      where: MultiTenancyUtil.getScope(ctx),
      orderBy: { created_at: "desc" },
    });
    return items.map((i: any) => this.mapCampaign(i));
  }

  async createCampaign(ctx: TenantScope,
    dto: CreateCampaignDto,
    actor_id: string,
  ): Promise<MarketingCampaign> {
    // Explicit DTO-to-column mapping; an unresolved field rejects the whole
    // request before any write, persisting nothing (Req 5.1–5.4, 11.1, 11.2).
    const mapped = mapCampaignToColumns(dto as unknown as Record<string, unknown>);
    const item = await this.prisma.marketing_campaigns.create({
      data: MultiTenancyUtil.wrapCreate(ctx, {
        id: uuidv4(),
        updated_at: new Date(),
        ...mapped,
        // Server-managed/derived columns bound explicitly (Req 5.1).
        owner_id: actor_id,
        owner_name: "Zenvix User",
        currency: dto.currency || "USD",
        status: "DRAFT",
        start_date: new Date(dto.start_date),
        end_date: new Date(dto.end_date),
        ai_recommendation: "System generated budget allocation recommended.",
      }),
    });
    return this.mapCampaign(item);
  }

  async updateCampaignStatus(ctx: TenantScope,
    id: string,
    dto: UpdateCampaignStatusDto,
    actor_id?: string,
    tx?: any,
  ): Promise<MarketingCampaign> {
    const client = tx ?? this.prisma;
    // Read the CURRENT state inside the Atomic_Operation, scoped by tenant_id,
    // BEFORE any write so a foreign-tenant campaign surfaces as 404 and an
    // invalid transition leaves the status unchanged (Req 11.3, 4.5, 4.7).
    const existing = await client.marketing_campaigns.findFirst({
      where: { id, ...MultiTenancyUtil.getScope(ctx) },
    });
    if (!existing) throw new NotFoundException(`Campaign '${id}' was not found.`);

    const current = normStatus(existing.status);
    const target = normStatus(dto.status);
    assertTransition(CAMPAIGN_TRANSITIONS, "campaign", id, current, target);

    const item = await client.marketing_campaigns.update({
      where: { id },
      data: { status: target, updated_at: new Date() },
    });
    return this.mapCampaign(item);
  }

  async getExecutions(ctx: TenantScope): Promise<MarketingExecution[]> {
    const items = await this.prisma.marketing_executions.findMany({
      where: MultiTenancyUtil.getScope(ctx),
      orderBy: { scheduled_at: "desc" },
    });
    return items.map((i: any) => this.mapExecution(i));
  }

  async scheduleExecution(ctx: TenantScope,
    dto: ScheduleExecutionDto,
  ): Promise<MarketingExecution> {
    const mapped = mapExecutionToColumns(dto as unknown as Record<string, unknown>);
    const item = await this.prisma.marketing_executions.create({
      data: MultiTenancyUtil.wrapCreate(ctx, {
        id: uuidv4(),
        updated_at: new Date(),
        ...mapped,
        scheduled_at: new Date(dto.scheduledAt),
        status: "SCHEDULED",
        leads_generated: 0,
        spend: 0,
      }),
    });
    return this.mapExecution(item);
  }

  async runExecution(ctx: TenantScope,
    id: string,
    dto: RunExecutionDto,
  ): Promise<MarketingExecution> {
    const mapped = mapExecutionToColumns(dto as unknown as Record<string, unknown>);
    const item = await this.prisma.marketing_executions.update({
      where: { id, ...MultiTenancyUtil.getScope(ctx) },
      data: {
        ...mapped,
        status: dto.failed ? "FAILED" : "COMPLETED",
      },
    });
    return this.mapExecution(item);
  }

  async getLeads(ctx: TenantScope): Promise<MarketingLead[]> {
    const items = await this.prisma.marketing_leads.findMany({
      where: MultiTenancyUtil.getScope(ctx),
      orderBy: { created_at: "desc" },
    });
    return items.map((i: any) => this.mapLead(i));
  }

  async captureLead(ctx: TenantScope,
    dto: CaptureLeadDto,
  ): Promise<MarketingLead> {
    const dedupKey =
      `${dto.company_name}-${dto.email || dto.phone || dto.contact_name}`.toLowerCase();
    const mapped = mapLeadToColumns(dto as unknown as Record<string, unknown>);
    const item = await this.prisma.marketing_leads.create({
      data: MultiTenancyUtil.wrapCreate(ctx, {
        id: uuidv4(),
        updated_at: new Date(),
        ...mapped,
        // Derived/defaulted columns bound explicitly (Req 5.1).
        dedup_key: dedupKey,
        score: 50,
        intent: "MEDIUM",
        status: "SCORED",
      }),
    });
    return this.mapLead(item);
  }

  async markLeadHandoffReady(ctx: TenantScope,
    id: string,
    actor_id?: string,
    tx?: any,
  ): Promise<MarketingLead> {
    const client = tx ?? this.prisma;
    // Read the CURRENT state inside the Atomic_Operation, scoped by tenant_id,
    // BEFORE any write (Req 11.4, 4.5, 4.7).
    const lead = await client.marketing_leads.findFirst({
      where: { id, ...MultiTenancyUtil.getScope(ctx) },
    });
    if (!lead) throw new NotFoundException(`Lead '${id}' was not found.`);

    const current = normStatus(lead.status);
    // A lead advances to HANDOFF_READY only from a pre-handoff state; an invalid
    // transition is rejected naming current+target, leaving the lead unchanged.
    if (!LEAD_HANDOFF_READY_FROM.has(current)) {
      throw invalidMarketingTransition("lead", id, current, "HANDOFF_READY");
    }

    const item = await client.marketing_leads.update({
      where: { id },
      data: { status: "HANDOFF_READY", updated_at: new Date() },
    });
    return this.mapLead(item);
  }

  async handoffLeadToSales(ctx: TenantScope,
    id: string,
    actor_id?: string,
    tx?: any,
  ): Promise<MarketingLead> {
    const client = tx ?? this.prisma;
    // Read the CURRENT state inside the Atomic_Operation, scoped by tenant_id,
    // BEFORE any write (Req 11.5, 11.6, 4.5, 4.7).
    const lead = await client.marketing_leads.findFirst({
      where: { id, ...MultiTenancyUtil.getScope(ctx) },
    });
    if (!lead) throw new NotFoundException(`Lead '${id}' was not found.`);

    const current = normStatus(lead.status);
    // A lead can be handed to Sales only once it is HANDOFF_READY. A failed or
    // not-handoff-ready handoff is rejected BEFORE any write, so no Sales-side
    // record is created and the lead remains consumable only by Marketing
    // (Requirements 11.5, 11.6).
    if (!LEAD_HANDOFF_SEND_FROM.has(current)) {
      throw invalidMarketingTransition("lead", id, current, "HANDOFF_SENT");
    }

    // Lead_Handoff in ONE Atomic_Operation: create the Sales-consumable handoff
    // record (a `sales_leads` row, source MARKETING) AND link + advance the
    // marketing lead to HANDOFF_SENT on the SAME transaction client, so both
    // commit together or neither. Any failure rolls both back, leaving the lead
    // HANDOFF_READY and consumable only by Marketing (Requirements 11.5, 11.6,
    // 4.1, 4.2).
    const owner = actor_id ?? "UNASSIGNED";
    const potentialValue = Math.max(
      0,
      Math.round(((lead.score ?? 0) / 100) * 100000),
    );
    const salesLead = await client.sales_leads.create({
      data: {
        tenant_id: ctx.tenant_id,
        company_id: lead.company_id ?? ctx.company_id ?? null,
        contact_id: lead.contact_id ?? null,
        company_name: lead.company_name,
        contact_name: lead.contact_name,
        contact_email: lead.email ?? null,
        contact_phone: lead.phone ?? null,
        source: "MARKETING",
        owner_id: owner,
        owner_name: owner,
        score: lead.score ?? 0,
        potential_value: potentialValue,
        status: "NEW",
        sla_due_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    const item = await client.marketing_leads.update({
      where: { id },
      data: {
        status: "HANDOFF_SENT",
        sales_handoff_id: salesLead.id,
        updated_at: new Date(),
      },
    });
    return this.mapLead(item);
  }

  async getWorkflows(ctx: TenantScope): Promise<MarketingWorkflow[]> {
    const items = await this.prisma.marketing_workflows.findMany({
      where: MultiTenancyUtil.getScope(ctx),
    });
    return items.map((i: any) => this.mapWorkflow(i));
  }

  async createWorkflow(ctx: TenantScope,
    dto: CreateWorkflowDto,
  ): Promise<MarketingWorkflow> {
    const mapped = mapWorkflowToColumns(dto as unknown as Record<string, unknown>);
    const item = await this.prisma.marketing_workflows.create({
      data: MultiTenancyUtil.wrapCreate(ctx, {
        id: uuidv4(),
        updated_at: new Date(),
        ...mapped,
        steps: dto.steps as any,
        status: "DRAFT",
      }),
    });
    return this.mapWorkflow(item);
  }

  async updateWorkflowStatus(ctx: TenantScope,
    id: string,
    dto: UpdateWorkflowStatusDto,
    actor_id?: string,
    tx?: any,
  ): Promise<MarketingWorkflow> {
    const client = tx ?? this.prisma;
    // Read the CURRENT state inside the Atomic_Operation, scoped by tenant_id,
    // BEFORE any write (Req 11.3, 4.5, 4.7).
    const existing = await client.marketing_workflows.findFirst({
      where: { id, ...MultiTenancyUtil.getScope(ctx) },
    });
    if (!existing) throw new NotFoundException(`Workflow '${id}' was not found.`);

    const current = normStatus(existing.status);
    const target = normStatus(dto.status);
    assertTransition(WORKFLOW_TRANSITIONS, "workflow", id, current, target);

    const item = await client.marketing_workflows.update({
      where: { id },
      data: { status: target, updated_at: new Date() },
    });
    return this.mapWorkflow(item);
  }

  async getConnectedAccounts(ctx: TenantScope,
  ): Promise<MarketingConnectedAccount[]> {
    const items = await this.prisma.marketing_accounts.findMany({
      where: MultiTenancyUtil.getScope(ctx),
    });
    return items.map((i: any) => this.mapAccount(i));
  }

  async connectAccount(ctx: TenantScope,
    dto: ConnectAccountDto,
  ): Promise<MarketingConnectedAccount> {
    const mapped = mapAccountToColumns(dto as unknown as Record<string, unknown>);
    const item = await this.prisma.marketing_accounts.create({
      data: MultiTenancyUtil.wrapCreate(ctx, {
        id: uuidv4(),
        updated_at: new Date(),
        ...mapped,
        status: "CONNECTED",
        token_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        last_sync_at: new Date(),
      }),
    });
    return this.mapAccount(item);
  }

  async updateAccountStatus(ctx: TenantScope,
    id: string,
    dto: UpdateAccountStatusDto,
    actor_id?: string,
    tx?: any,
  ): Promise<MarketingConnectedAccount> {
    const client = tx ?? this.prisma;
    // Read the CURRENT state inside the Atomic_Operation, scoped by tenant_id,
    // BEFORE any write (Req 11.3, 4.5, 4.7).
    const existing = await client.marketing_accounts.findFirst({
      where: { id, ...MultiTenancyUtil.getScope(ctx) },
    });
    if (!existing)
      throw new NotFoundException(`Connected account '${id}' was not found.`);

    const current = normStatus(existing.status);
    const target = normStatus(dto.status);
    assertTransition(ACCOUNT_TRANSITIONS, "connected account", id, current, target);

    const item = await client.marketing_accounts.update({
      where: { id },
      data: { status: target, updated_at: new Date() },
    });
    return this.mapAccount(item);
  }

  async updateAccountSettings(ctx: TenantScope,
    id: string,
    dto: UpdateAccountSettingsDto,
    actor_id: string,
  ): Promise<MarketingConnectedAccount> {
    const mapped = mapAccountToColumns(dto as unknown as Record<string, unknown>);
    if (typeof mapped.status === "string") {
      mapped.status = mapped.status.toUpperCase();
    }
    const item = await this.prisma.marketing_accounts.update({
      where: { id, ...MultiTenancyUtil.getScope(ctx) },
      data: mapped,
    });
    return this.mapAccount(item);
  }

  async deleteAccount(ctx: TenantScope, id: string): Promise<boolean> {
    await this.prisma.marketing_accounts.delete({
      where: { id, ...MultiTenancyUtil.getScope(ctx) },
    });
    return true;
  }

  async getAttribution(ctx: TenantScope): Promise<MarketingAttribution[]> {
    const items = await this.prisma.marketing_attribution.findMany({
      where: MultiTenancyUtil.getScope(ctx),
      orderBy: { created_at: "desc" },
    });
    return items.map((i: any) => ({
      id: i.id,
      tenant_id: i.tenant_id,
      campaignId: i.campaign_id,
      lead_id: i.lead_id,
      opportunityId: i.opportunity_id ?? undefined,
      revenueAttributed: Number(i.revenue_attributed),
      spend: Number(i.spend),
      roiPercent: Number(i.roi_percent),
      model: i.model || "LAST_CLICK",
      created_at: i.created_at,
      branch_id: i.branch_id ?? undefined,
      ecommerce_id: i.ecommerce_id ?? undefined,
    }));
  }



  async runHealthSweep(ctx: TenantScope, actor_id: string): Promise<MarketingAlert[]> {
    const accounts = await this.prisma.marketing_accounts.findMany({
      where: MultiTenancyUtil.getScope(ctx),
    });

    const now = new Date();
    for (const account of accounts) {
      if (account.token_expires_at && account.token_expires_at < now) {
        const existing = await this.prisma.marketing_alerts.findFirst({
          where: {
            ...MultiTenancyUtil.getScope(ctx),
            type: "TOKEN_EXPIRY",
            entity_id: account.id,
            acknowledged: false,
          }
        });

        if (!existing) {
          await this.prisma.marketing_alerts.create({
            data: MultiTenancyUtil.wrapCreate(ctx, {
              id: uuidv4(),
              type: "TOKEN_EXPIRY",
              severity: "HIGH",
              entity_type: "ACCOUNT",
              entity_id: account.id,
              message: `OAuth token for ${account.provider} (${account.account_name}) has expired.`,
              acknowledged: false,
              created_at: now,
              updated_at: now,
            })
          });
        }
      }
    }

    return this.getAlerts(ctx);
  }

  async getAuditEvents(ctx: TenantScope): Promise<MarketingAuditEvent[]> {
    const items = await this.prisma.marketing_audit_events.findMany({
      where: MultiTenancyUtil.getScope(ctx),
      orderBy: { created_at: "desc" },
    });
    return items.map((i: any) => ({
      id: i.id,
      tenant_id: i.tenant_id,
      actor_id: i.actor_id,
      action: i.action,
      entity_type: i.entity_type as any,
      entity_id: i.entity_id,
      detail: i.detail,
      created_at: i.created_at,
    }));
  }

  // --- Growth Engine Extensions ---

  async getContacts(ctx: TenantScope): Promise<MarketingContact[]> {
    const items = await this.prisma.marketing_contacts.findMany({
      where: MultiTenancyUtil.getScope(ctx),
      orderBy: { created_at: "desc" },
    });
    return items.map(i => i as any);
  }

  async getContactById(ctx: TenantScope, id: string): Promise<MarketingContact> {
    const item = await this.prisma.marketing_contacts.findUnique({
      where: { id, ...MultiTenancyUtil.getScope(ctx) },
      include: {
        marketing_leads: true,
        retail_customers: true,
        sales_leads: true,
      }
    });
    if (!item) throw new Error("Contact not found");
    return item as any;
  }

  async createContact(ctx: TenantScope, data: Partial<MarketingContact>): Promise<MarketingContact> {
    const mapped = mapContactToColumns(data as unknown as Record<string, unknown>);
    const item = await this.prisma.marketing_contacts.create({
      data: MultiTenancyUtil.wrapCreate(ctx, {
        id: uuidv4(),
        created_at: new Date(),
        updated_at: new Date(),
        ...mapped,
        // Required/defaulted columns bound explicitly (Req 5.1).
        first_name: data.first_name || "",
        last_name: data.last_name || "",
        tags: data.tags || [],
        score: data.score || 0,
        status: data.status || "ACTIVE",
        behavioral_data: data.behavioral_data || {},
      }),
    });
    return item as any;
  }

  async getFunnels(ctx: TenantScope): Promise<MarketingFunnel[]> {
    const items = await this.prisma.marketing_funnels.findMany({
      where: MultiTenancyUtil.getScope(ctx),
      include: { steps: true },
      orderBy: { created_at: "desc" },
    });
    return items.map(i => i as any);
  }

  async createFunnel(ctx: TenantScope, data: Partial<MarketingFunnel>): Promise<MarketingFunnel> {
    const mapped = mapFunnelToColumns(data as unknown as Record<string, unknown>);
    const item = await this.prisma.marketing_funnels.create({
      data: MultiTenancyUtil.wrapCreate(ctx, {
        id: uuidv4(),
        created_at: new Date(),
        updated_at: new Date(),
        ...mapped,
        name: data.name || "Unnamed Funnel",
        status: data.status || "DRAFT",
      }),
      include: { steps: true }
    });
    return item as any;
  }

  async updateFunnel(ctx: TenantScope, id: string, data: Partial<MarketingFunnel>): Promise<MarketingFunnel> {
    const mapped = mapFunnelToColumns(data as unknown as Record<string, unknown>);
    const item = await this.prisma.marketing_funnels.update({
      where: { id, ...MultiTenancyUtil.getScope(ctx) },
      data: {
        ...mapped,
        updated_at: new Date(),
      },
      include: { steps: true }
    });
    return item as any;
  }

  async getAppointments(ctx: TenantScope): Promise<MarketingAppointment[]> {
    const items = await this.prisma.marketing_appointments.findMany({
      where: MultiTenancyUtil.getScope(ctx),
      orderBy: { scheduled_at: "desc" },
    });
    return items.map(i => i as any);
  }

  async createAppointment(ctx: TenantScope, data: Partial<MarketingAppointment>): Promise<MarketingAppointment> {
    const item = await this.prisma.marketing_appointments.create({
      data: MultiTenancyUtil.wrapCreate(ctx, {
        id: uuidv4(),
        contact_id: data.contact_id!,
        staff_id: data.staff_id,
        scheduled_at: new Date(data.scheduled_at!),
        duration_mins: data.duration_mins || 30,
        status: "SCHEDULED",
        notes: data.notes,
        created_at: new Date(),
        updated_at: new Date(),
      }),
    });
    return item as any;
  }

  async getAutomationRules(ctx: TenantScope): Promise<MarketingAutomationRule[]> {
    const items = await this.prisma.marketing_automation_rules.findMany({
      where: MultiTenancyUtil.getScope(ctx),
      orderBy: { created_at: "desc" },
    });
    return items.map(i => i as any);
  }

  async createAutomationRule(ctx: TenantScope, data: Partial<MarketingAutomationRule>): Promise<MarketingAutomationRule> {
    const item = await this.prisma.marketing_automation_rules.create({
      data: MultiTenancyUtil.wrapCreate(ctx, {
        id: uuidv4(),
        name: data.name || "Unnamed Rule",
        trigger_event: data.trigger_event || "lead.created",
        conditions: data.conditions || {},
        actions: data.actions || {},
        status: "INACTIVE",
        created_at: new Date(),
        updated_at: new Date(),
      }),
    });
    return item as any;
  }

  async getMessages(ctx: TenantScope, contactId?: string): Promise<MarketingOmnichannelMessage[]> {
    const items = await this.prisma.marketing_omnichannel_messages.findMany({
      where: {
        ...MultiTenancyUtil.getScope(ctx),
        ...(contactId ? { contact_id: contactId } : {})
      },
      orderBy: { sent_at: "desc" },
    });
    return items.map(i => i as any);
  }

  async sendMessage(ctx: TenantScope, data: Partial<MarketingOmnichannelMessage>): Promise<MarketingOmnichannelMessage> {
    const item = await this.prisma.marketing_omnichannel_messages.create({
      data: MultiTenancyUtil.wrapCreate(ctx, {
        id: uuidv4(),
        contact_id: data.contact_id!,
        channel: data.channel || "EMAIL",
        direction: "OUTBOUND",
        content: data.content || "",
        status: "SENT",
        sent_at: new Date(),
        metadata: data.metadata || {},
      }),
    });
    return item as any;
  }

  async getCreativeAssets(ctx: TenantScope): Promise<MarketingCreativeAsset[]> {
    const items = await this.prisma.marketing_creative_assets.findMany({
      where: MultiTenancyUtil.getScope(ctx),
      orderBy: { created_at: "desc" },
    });
    return items.map(i => i as any);
  }

  async createCreativeAsset(ctx: TenantScope, data: Partial<MarketingCreativeAsset>, tx?: any): Promise<MarketingCreativeAsset> {
    // Bind the optional Atomic_Operation transaction client so the asset record
    // is registered in the SAME transaction as the blob's compensating cleanup
    // is governed by, leaving no orphaned record on rollback (Req 11.7, 11.8).
    const client = tx ?? this.prisma;
    const mapped = mapCreativeAssetToColumns(data as unknown as Record<string, unknown>);
    const item = await client.marketing_creative_assets.create({
      data: MultiTenancyUtil.wrapCreate(ctx, {
        id: uuidv4(),
        created_at: new Date(),
        updated_at: new Date(),
        ...mapped,
        name: data.name || "Unnamed Asset",
        type: data.type || "IMAGE",
        url: data.url || "",
        tags: data.tags || [],
        metadata: data.metadata || {},
      }),
    });
    return item as any;
  }

  async updateCreativeAsset(ctx: TenantScope, id: string, data: Partial<MarketingCreativeAsset>): Promise<MarketingCreativeAsset> {
    const mapped = mapCreativeAssetToColumns(data as unknown as Record<string, unknown>);
    const item = await this.prisma.marketing_creative_assets.update({
      where: { id, ...MultiTenancyUtil.getScope(ctx) },
      data: {
        ...mapped,
        updated_at: new Date(),
      },
    });
    return item as any;
  }

  async calculateAdvancedAttribution(ctx: TenantScope, model: "FIRST_CLICK" | "LINEAR" | "LAST_CLICK"): Promise<any> {
    const leads = await this.prisma.marketing_leads.findMany({
      where: MultiTenancyUtil.getScope(ctx),
      include: { tenants: true }
    });

    // In a real scenario, we would fetch touchpoints.
    // Here we simulate the logic based on lead campaign associations.
    const results = leads.map(lead => {
      const revenue = 1000; // Mock revenue per converted lead
      if (model === "FIRST_CLICK") {
         return { leadId: lead.id, campaignId: lead.campaign_id, attributedRevenue: revenue };
      } else if (model === "LINEAR") {
         // Mocking multiple campaigns for linear simulation
         return { leadId: lead.id, campaignId: lead.campaign_id, attributedRevenue: revenue / 1 };
      }
      return { leadId: lead.id, campaignId: lead.campaign_id, attributedRevenue: revenue };
    });

    return results;
  }

  async getAlerts(ctx: TenantScope): Promise<MarketingAlert[]> {
    const items = await this.prisma.marketing_alerts.findMany({
      where: MultiTenancyUtil.getScope(ctx),
      orderBy: { created_at: "desc" },
    });
    return items.map((i: any) => ({
      id: i.id,
      tenant_id: i.tenant_id,
      type: i.type as any,
      severity: i.severity as any,
      entity_type: i.entity_type as any,
      entity_id: i.entity_id,
      message: i.message,
      acknowledged: i.acknowledged,
      created_at: i.created_at,
      updated_at: i.updated_at,
      branch_id: i.branch_id ?? undefined,
      ecommerce_id: i.ecommerce_id ?? undefined,
    }));
  }

  async acknowledgeAlert(ctx: TenantScope, id: string): Promise<MarketingAlert> {
    const item = await this.prisma.marketing_alerts.update({
      where: { id, ...MultiTenancyUtil.getScope(ctx) },
      data: { acknowledged: true },
    });
    return {
      id: item.id,
      tenant_id: item.tenant_id,
      type: item.type as any,
      severity: item.severity as any,
      entity_type: item.entity_type as any,
      entity_id: item.entity_id,
      message: item.message,
      acknowledged: item.acknowledged,
      created_at: item.created_at,
      updated_at: item.updated_at,
      branch_id: item.branch_id ?? undefined,
      ecommerce_id: item.ecommerce_id ?? undefined,
    };
  }

}

