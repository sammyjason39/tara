import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CaptureLeadDto } from "../dto/capture-lead.dto";
import { ConnectAccountDto } from "../dto/connect-account.dto";
import { CreateCampaignDto } from "../dto/create-campaign.dto";
import { CreateWorkflowDto } from "../dto/create-workflow.dto";
import { RunExecutionDto } from "../dto/run-execution.dto";
import { ScheduleExecutionDto } from "../dto/schedule-execution.dto";
import { UpdateAccountStatusDto } from "../dto/update-account-status.dto";
import { UpdateCampaignStatusDto } from "../dto/update-campaign-status.dto";
import { UpdateWorkflowStatusDto } from "../dto/update-workflow-status.dto";
import { MarketingConnectedAccount } from "../entities/marketing-account.entity";
import { MarketingAlert } from "../entities/marketing-alert.entity";
import { MarketingAttribution } from "../entities/marketing-attribution.entity";
import { MarketingAuditEvent } from "../entities/marketing-audit.entity";
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
import {
  IMarketingRepository,
  MarketingChannelPerformance,
  MarketingDashboard,
} from "./marketing.repository.interface";
import { TenantContext } from "../../../gateway/tenant-context.interface";

type TenantMarketingStore = {
  campaigns: MarketingCampaign[];
  executions: MarketingExecution[];
  leads: MarketingLead[];
  workflows: MarketingWorkflow[];
  accounts: MarketingConnectedAccount[];
  attribution: MarketingAttribution[];
  alerts: MarketingAlert[];
  audit: MarketingAuditEvent[];
  contacts: MarketingContact[];
  funnels: MarketingFunnel[];
  appointments: MarketingAppointment[];
  automation: MarketingAutomationRule[];
  assets: MarketingCreativeAsset[];
  messages: MarketingOmnichannelMessage[];
};

const OWNER_POOL = [
  { id: "mkt-jessie", name: "Jessie Allan" },
  { id: "mkt-ava", name: "Ava Reynolds" },
  { id: "mkt-henry", name: "Henry Pham" },
];

const LEAD_SOURCE_SCORE: Record<MarketingLead["source"], number> = {
  landing_page: 68,
  embedded_form: 64,
  chatbot: 62,
  webinar: 75,
  meta_lead_ads: 72,
  google_ads: 70,
  partner_api: 74,
};

@Injectable()
export class MarketingMockRepository extends IMarketingRepository {
  private readonly store = new Map<string, TenantMarketingStore>();

  constructor() {
    super();
    this.ensureTenant("tenant-001");
    this.ensureTenant("tenant-002");
  }

  private now() {
    return new Date();
  }

  private addDays(days: number) {
    const date = this.now();
    date.setDate(date.getDate() + days);
    return date;
  }

  private id(prefix: string) {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  }

  private scoreLead(dto: CaptureLeadDto) {
    const base = LEAD_SOURCE_SCORE[dto.source as keyof typeof LEAD_SOURCE_SCORE];
    const industryBoost =
      dto.industry &&
      ["Manufacturing", "Retail", "Technology"].includes(dto.industry)
        ? 8
        : 0;
    const bandBoost =
      dto.employeeBand &&
      ["201-500", "501-1000", "1001+"].includes(dto.employeeBand)
        ? 6
        : 0;
    return Math.max(1, Math.min(99, base + industryBoost + bandBoost));
  }

  private intentFromScore(score: number): MarketingLead["intent"] {
    if (score >= 80) return "high";
    if (score >= 65) return "medium";
    return "low";
  }

  private pickOwner(tenant_id: string) {
    const store = this.getStore(tenant_id);
    const load = store.campaigns.reduce<Record<string, number>>((acc, item) => {
      acc[item.owner_id] = (acc[item.owner_id] ?? 0) + 1;
      return acc;
    }, {});
    return [...OWNER_POOL].sort(
      (a, b) => (load[a.id] ?? 0) - (load[b.id] ?? 0),
    )[0];
  }

  private addAudit(
    tenant_id: string,
    actor_id: string,
    action: string,
    entity_type: MarketingAuditEvent["entity_type"],
    entity_id: string,
    detail: string,
  ) {
    const store = this.getStore(tenant_id);
    store.audit.unshift({
      id: this.id("mkt-audit"),
      tenant_id,
      actor_id,
      action,
      entity_type,
      entity_id,
      detail,
      created_at: this.now(),
    });
  }

  private createAlertIfMissing(
    tenant_id: string,
    payload: Omit<MarketingAlert, "id" | "created_at" | "updated_at">,
  ) {
    const store = this.getStore(tenant_id);
    const existing = store.alerts.find(
      (item) =>
        item.type === payload.type &&
        item.entity_type === payload.entity_type &&
        item.entity_id === payload.entity_id &&
        !item.acknowledged,
    );
    if (existing) return existing;
    const created: MarketingAlert = {
      id: this.id("mkt-alert"),
      ...payload,
      created_at: this.now(),
      updated_at: this.now(),
    };
    store.alerts.unshift(created);
    return created;
  }

  private ensureTenant(tenant_id: string): TenantMarketingStore {
    const existing = this.store.get(tenant_id);
    if (existing) return existing;

    const campaigns: MarketingCampaign[] = [
      {
        id: `${tenant_id}-cmp-001`,
        tenant_id,
        name: "Q2 Enterprise Expansion",
        objective: "lead_generation",
        channel_mix: ["meta_ads", "google_ads", "email"],
        owner_id: "mkt-jessie",
        owner_name: "Jessie Allan",
        budget: 120000,
        currency: "USD",
        status: "active",
        start_date: "2026-04-01",
        end_date: "2026-06-30",
        audience: "Mid-market retail and manufacturing leaders",
        aiRecommendation:
          "Increase retargeting weight for high-intent website visitors.",
        created_at: this.addDays(-3),
        updated_at: this.now(),
      },
    ];

    const seeded: TenantMarketingStore = {
      campaigns,
      executions: [],
      leads: [],
      workflows: [],
      accounts: [],
      attribution: [],
      alerts: [],
      audit: [],
      contacts: [],
      funnels: [],
      appointments: [],
      automation: [],
      assets: [],
      messages: [],
    };
    this.store.set(tenant_id, seeded);
    return seeded;
  }

  private getStore(tenant_id: string) {
    return this.ensureTenant(tenant_id);
  }

  private findCampaign(tenant_id: string, campaignId: string) {
    const campaign = this.getStore(tenant_id).campaigns.find(
      (item) => item.id === campaignId,
    );
    if (!campaign) throw new NotFoundException("Campaign not found");
    return campaign;
  }

  private findExecution(tenant_id: string, executionId: string) {
    const execution = this.getStore(tenant_id).executions.find(
      (item) => item.id === executionId,
    );
    if (!execution) throw new NotFoundException("Execution not found");
    return execution;
  }

  private findLead(tenant_id: string, lead_id: string) {
    const lead = this.getStore(tenant_id).leads.find(
      (item) => item.id === lead_id,
    );
    if (!lead) throw new NotFoundException("Lead not found");
    return lead;
  }

  private findWorkflow(tenant_id: string, workflowId: string) {
    const workflow = this.getStore(tenant_id).workflows.find(
      (item) => item.id === workflowId,
    );
    if (!workflow) throw new NotFoundException("Workflow not found");
    return workflow;
  }

  private findAccount(tenant_id: string, accountId: string) {
    const account = this.getStore(tenant_id).accounts.find(
      (item) => item.id === accountId,
    );
    if (!account) throw new NotFoundException("Connected account not found");
    return account;
  }

  async getDashboard(ctx: TenantContext): Promise<MarketingDashboard> {
    const store = this.getStore(ctx.tenant_id);
    const now = this.now();
    const spendToDate = store.executions.reduce(
      (sum, item) => sum + item.spend,
      0,
    );
    const attributedRevenue = store.attribution.reduce(
      (sum, item) => sum + item.revenueAttributed,
      0,
    );
    const blendedRoiPercent =
      spendToDate > 0
        ? ((attributedRevenue - spendToDate) / spendToDate) * 100
        : 0;
    return {
      activeCampaigns: store.campaigns.filter(
        (item: any) => item.status === "active",
      ).length,
      leadsToday: store.leads.filter((item: any) => {
        return (
          item.created_at.getFullYear() === now.getFullYear() &&
          item.created_at.getMonth() === now.getMonth() &&
          item.created_at.getDate() === now.getDate()
        );
      }).length,
      qualifiedLeads: store.leads.filter((item: any) => item.status === "qualified")
        .length,
      handoffReady: store.leads.filter(
        (item: any) => item.status === "handoff_ready",
      ).length,
      spendToDate,
      attributedRevenue,
      blendedRoiPercent: Number(blendedRoiPercent.toFixed(2)),
      connectedAccountsHealthy: store.accounts.filter(
        (item: any) => item.status === "connected",
      ).length,
    };
  }

  async getChannelPerformance(
    ctx: TenantContext,
  ): Promise<MarketingChannelPerformance[]> {
    const store = this.getStore(ctx.tenant_id);
    const channels: MarketingExecution["channel"][] = [
      "meta_ads",
      "google_ads",
      "email",
      "whatsapp",
      "webinar",
      "landing_page",
      "event",
    ];
    return channels.map((channel) => {
      const items = store.executions.filter((item) => item.channel === channel);
      const leads = items.reduce((sum, item) => sum + item.leadsGenerated, 0);
      const spend = items.reduce((sum, item) => sum + item.spend, 0);
      return {
        channel,
        leads,
        spend,
        cpl: leads > 0 ? Number((spend / leads).toFixed(2)) : 0,
      };
    });
  }

  async getCampaigns(ctx: TenantContext): Promise<MarketingCampaign[]> {
    return this.getStore(ctx.tenant_id).campaigns;
  }

  async createCampaign(
    ctx: TenantContext,
    dto: CreateCampaignDto,
    actor_id: string,
  ): Promise<MarketingCampaign> {
    const store = this.getStore(ctx.tenant_id);
    const owner = this.pickOwner(ctx.tenant_id);
    const created: MarketingCampaign = {
      id: this.id(`${ctx.tenant_id}-cmp`),
      tenant_id: ctx.tenant_id,
      name: dto.name,
      objective: dto.objective,
      channel_mix: dto.channel_mix,
      owner_id: owner.id,
      owner_name: owner.name,
      budget: dto.budget,
      currency: dto.currency ?? "USD",
      status: "draft",
      start_date: dto.start_date,
      end_date: dto.end_date,
      audience: dto.audience,
      aiRecommendation:
        "Start with high-intent segment and allocate 60% spend to best-performing channel.",
      created_at: this.now(),
      updated_at: this.now(),
    };
    store.campaigns.unshift(created);
    this.addAudit(
      ctx.tenant_id,
      actor_id,
      "campaign.created",
      "campaign",
      created.id,
      created.name,
    );
    return created;
  }

  async updateCampaignStatus(
    ctx: TenantContext,
    campaignId: string,
    dto: UpdateCampaignStatusDto,
    actor_id: string,
  ): Promise<MarketingCampaign> {
    const campaign = this.findCampaign(ctx.tenant_id, campaignId);
    campaign.status = dto.status;
    campaign.updated_at = this.now();
    this.addAudit(
      ctx.tenant_id,
      actor_id,
      "campaign.status_changed",
      "campaign",
      campaign.id,
      dto.status,
    );
    return campaign;
  }

  async getExecutions(ctx: TenantContext): Promise<MarketingExecution[]> {
    return this.getStore(ctx.tenant_id).executions;
  }

  async scheduleExecution(
    ctx: TenantContext,
    dto: ScheduleExecutionDto,
    actor_id: string,
  ): Promise<MarketingExecution> {
    this.findCampaign(ctx.tenant_id, dto.campaignId);
    const store = this.getStore(ctx.tenant_id);
    const created: MarketingExecution = {
      id: this.id(`${ctx.tenant_id}-exec`),
      tenant_id: ctx.tenant_id,
      campaignId: dto.campaignId,
      channel: dto.channel,
      scheduledAt: new Date(dto.scheduledAt),
      status: "scheduled",
      leadsGenerated: 0,
      spend: 0,
      notes: dto.notes,
      created_at: this.now(),
      updated_at: this.now(),
    };
    store.executions.unshift(created);
    this.addAudit(
      ctx.tenant_id,
      actor_id,
      "execution.scheduled",
      "execution",
      created.id,
      `${created.channel} for ${created.campaignId}`,
    );
    return created;
  }

  async runExecution(
    ctx: TenantContext,
    executionId: string,
    dto: RunExecutionDto,
    actor_id: string,
  ): Promise<MarketingExecution> {
    const execution = this.findExecution(ctx.tenant_id, executionId);
    const failed = dto.failed ?? false;
    execution.status = failed ? "failed" : "completed";
    execution.leadsGenerated =
      dto.leadsGenerated ?? Math.max(8, Math.round(Math.random() * 60));
    execution.spend =
      dto.spend ?? Math.max(1500, Math.round(Math.random() * 12000));
    execution.updated_at = this.now();
    if (failed) {
      this.createAlertIfMissing(ctx.tenant_id, {
        tenant_id: ctx.tenant_id,
        type: "campaign_failure",
        severity: "high",
        entity_type: "campaign",
        entity_id: execution.campaignId,
        message: `Execution ${execution.id} failed on channel ${execution.channel}.`,
        acknowledged: false,
      });
    }
    this.addAudit(
      ctx.tenant_id,
      actor_id,
      "execution.ran",
      "execution",
      execution.id,
      `${execution.status}, leads=${execution.leadsGenerated}, spend=${execution.spend}`,
    );
    return execution;
  }

  async getLeads(ctx: TenantContext): Promise<MarketingLead[]> {
    return this.getStore(ctx.tenant_id).leads;
  }

  async captureLead(
    ctx: TenantContext,
    dto: CaptureLeadDto,
    actor_id: string,
  ): Promise<MarketingLead> {
    const store = this.getStore(ctx.tenant_id);
    const dedupKey =
      `${dto.company_name}-${dto.email ?? dto.phone ?? dto.contact_name}`
        .trim()
        .toLowerCase();
    const duplicate = store.leads.find((item) => item.dedupKey === dedupKey);
    if (duplicate) {
      duplicate.updated_at = this.now();
      this.addAudit(
        ctx.tenant_id,
        actor_id,
        "lead.deduplicated",
        "lead",
        duplicate.id,
        duplicate.company_name,
      );
      return duplicate;
    }

    const score = this.scoreLead(dto);
    const created: MarketingLead = {
      id: this.id(`${ctx.tenant_id}-lead`),
      tenant_id: ctx.tenant_id,
      campaignId: dto.campaignId,
      source: dto.source,
      company_name: dto.company_name,
      contact_name: dto.contact_name,
      email: dto.email,
      phone: dto.phone,
      country: dto.country,
      industry: dto.industry,
      employeeBand: dto.employeeBand,
      dedupKey,
      score,
      intent: this.intentFromScore(score),
      status: score >= 75 ? "qualified" : "scored",
      qualificationReason:
        score >= 75
          ? "High score from source quality and firmographic fit."
          : "Lead captured and scored; nurture sequence recommended.",
      created_at: this.now(),
      updated_at: this.now(),
    };
    store.leads.unshift(created);
    this.addAudit(
      ctx.tenant_id,
      actor_id,
      "lead.captured",
      "lead",
      created.id,
      `${created.company_name} (${created.source})`,
    );
    return created;
  }

  async markLeadHandoffReady(
    ctx: TenantContext,
    lead_id: string,
    actor_id: string,
  ): Promise<MarketingLead> {
    const lead = this.findLead(ctx.tenant_id, lead_id);
    if (!["scored", "qualified", "captured"].includes(lead.status)) {
      throw new BadRequestException("Lead cannot be moved to handoff ready.");
    }
    lead.status = "handoff_ready";
    lead.updated_at = this.now();
    this.addAudit(
      ctx.tenant_id,
      actor_id,
      "lead.handoff_ready",
      "lead",
      lead.id,
      lead.company_name,
    );
    return lead;
  }

  async handoffLeadToSales(
    ctx: TenantContext,
    lead_id: string,
    actor_id: string,
  ): Promise<MarketingLead> {
    const store = this.getStore(ctx.tenant_id);
    const lead = this.findLead(ctx.tenant_id, lead_id);
    if (!["qualified", "handoff_ready"].includes(lead.status)) {
      throw new BadRequestException("Lead is not qualified for Sales handoff.");
    }
    lead.status = "handoff_sent";
    lead.salesHandoffId = this.id("sales-lead");
    lead.updated_at = this.now();

    if (lead.campaignId) {
      const campaignSpend = store.executions
        .filter((item) => item.campaignId === lead.campaignId)
        .reduce((sum, item) => sum + item.spend, 0);
      const revenueAttributed = Math.max(
        0,
        Math.round((lead.score / 100) * 300000),
      );
      const roiPercent =
        campaignSpend > 0
          ? Number(
              (
                ((revenueAttributed - campaignSpend) / campaignSpend) *
                100
              ).toFixed(2),
            )
          : 0;
      store.attribution.unshift({
        id: this.id(`${ctx.tenant_id}-attr`),
        tenant_id: ctx.tenant_id,
        campaignId: lead.campaignId,
        lead_id: lead.id,
        opportunityId: lead.salesHandoffId,
        revenueAttributed,
        spend: campaignSpend,
        roiPercent,
        model: "LAST_CLICK",
        created_at: this.now(),
      });
    }
    this.addAudit(
      ctx.tenant_id,
      actor_id,
      "lead.handoff_sent",
      "lead",
      lead.id,
      `Handoff to Sales lead ${lead.salesHandoffId}`,
    );
    return lead;
  }

  async getWorkflows(ctx: TenantContext): Promise<MarketingWorkflow[]> {
    return this.getStore(ctx.tenant_id).workflows;
  }

  async createWorkflow(
    ctx: TenantContext,
    dto: CreateWorkflowDto,
    actor_id: string,
  ): Promise<MarketingWorkflow> {
    const store = this.getStore(ctx.tenant_id);
    const created: MarketingWorkflow = {
      id: this.id(`${ctx.tenant_id}-wf`),
      tenant_id: ctx.tenant_id,
      name: dto.name,
      status: "draft",
      trigger: dto.trigger,
      steps: dto.steps,
      aiSuggestion:
        "Use branch condition for high-intent contacts after step two.",
      created_at: this.now(),
      updated_at: this.now(),
    };
    store.workflows.unshift(created);
    this.addAudit(
      ctx.tenant_id,
      actor_id,
      "workflow.created",
      "workflow",
      created.id,
      created.name,
    );
    return created;
  }

  async updateWorkflowStatus(
    ctx: TenantContext,
    workflowId: string,
    dto: UpdateWorkflowStatusDto,
    actor_id: string,
  ): Promise<MarketingWorkflow> {
    const workflow = this.findWorkflow(ctx.tenant_id, workflowId);
    workflow.status = dto.status;
    workflow.updated_at = this.now();
    this.addAudit(
      ctx.tenant_id,
      actor_id,
      "workflow.status_changed",
      "workflow",
      workflow.id,
      dto.status,
    );
    return workflow;
  }

  async getConnectedAccounts(
    ctx: TenantContext,
  ): Promise<MarketingConnectedAccount[]> {
    return this.getStore(ctx.tenant_id).accounts;
  }

  async connectAccount(
    ctx: TenantContext,
    dto: ConnectAccountDto,
    actor_id: string,
  ): Promise<MarketingConnectedAccount> {
    const store = this.getStore(ctx.tenant_id);
    const created: MarketingConnectedAccount = {
      id: this.id(`${ctx.tenant_id}-acct`),
      tenant_id: ctx.tenant_id,
      provider: dto.provider,
      account_name: dto.account_name,
      status: "connected",
      tokenExpiresAt: this.addDays(30),
      scopes: dto.scopes,
      lastSyncAt: this.now(),
      created_at: this.now(),
      updated_at: this.now(),
    };
    store.accounts.unshift(created);
    this.addAudit(
      ctx.tenant_id,
      actor_id,
      "account.connected",
      "account",
      created.id,
      created.provider,
    );
    return created;
  }

  async updateAccountStatus(
    ctx: TenantContext,
    accountId: string,
    dto: UpdateAccountStatusDto,
    actor_id: string,
  ): Promise<MarketingConnectedAccount> {
    const account = this.findAccount(ctx.tenant_id, accountId);
    account.status = dto.status;
    account.updated_at = this.now();
    this.addAudit(
      ctx.tenant_id,
      actor_id,
      "account.status_changed",
      "account",
      account.id,
      dto.status,
    );
    return account;
  }

  async getAttribution(ctx: TenantContext): Promise<MarketingAttribution[]> {
    return this.getStore(ctx.tenant_id).attribution;
  }

  async getAlerts(ctx: TenantContext): Promise<MarketingAlert[]> {
    return this.getStore(ctx.tenant_id).alerts;
  }

  async acknowledgeAlert(ctx: TenantContext, alertId: string): Promise<MarketingAlert> {
    const store = this.getStore(ctx.tenant_id);
    const alert = store.alerts.find((item) => item.id === alertId);
    if (!alert) throw new NotFoundException("Alert not found");
    alert.acknowledged = true;
    alert.updated_at = this.now();
    return alert;
  }

  async runHealthSweep(
    ctx: TenantContext,
    actor_id: string,
  ): Promise<MarketingAlert[]> {
    const store = this.getStore(ctx.tenant_id);
    store.accounts.forEach((account) => {
      if (account.tokenExpiresAt < this.now()) {
        account.status = "expired";
        this.createAlertIfMissing(ctx.tenant_id, {
          tenant_id: ctx.tenant_id,
          type: "token_expiry",
          severity: "high",
          entity_type: "account",
          entity_id: account.id,
          message: `Connection for ${account.provider} has expired.`,
          acknowledged: false,
        });
      }
    });
    this.addAudit(
      ctx.tenant_id,
      actor_id,
      "health.sweep_ran",
      "account",
      "all",
      "manual sweep",
    );
    return store.alerts;
  }

  async getAuditEvents(ctx: TenantContext): Promise<MarketingAuditEvent[]> {
    return this.getStore(ctx.tenant_id).audit;
  }

  // --- Growth Engine Mock Extensions ---

  async getContacts(ctx: TenantContext): Promise<MarketingContact[]> {
    return this.getStore(ctx.tenant_id).contacts;
  }

  async getContactById(ctx: TenantContext, id: string): Promise<MarketingContact> {
    const contact = this.getStore(ctx.tenant_id).contacts.find(c => c.id === id);
    if (!contact) throw new NotFoundException("Contact not found");
    return contact;
  }

  async createContact(ctx: TenantContext, data: Partial<MarketingContact>): Promise<MarketingContact> {
    const store = this.getStore(ctx.tenant_id);
    const created: MarketingContact = {
      id: this.id("mkt-contact"),
      tenant_id: ctx.tenant_id,
      company_id: "default-company",
      first_name: data.first_name || "",
      last_name: data.last_name || "",
      email: data.email,
      phone: data.phone,
      tags: data.tags || [],
      score: 0,
      status: "ACTIVE",
      created_at: this.now(),
      updated_at: this.now(),
      ...data,
    };
    store.contacts.unshift(created);
    return created;
  }

  async getFunnels(ctx: TenantContext): Promise<MarketingFunnel[]> {
    return this.getStore(ctx.tenant_id).funnels;
  }

  async createFunnel(ctx: TenantContext, data: Partial<MarketingFunnel>): Promise<MarketingFunnel> {
    const store = this.getStore(ctx.tenant_id);
    const created: MarketingFunnel = {
      id: this.id("mkt-funnel"),
      tenant_id: ctx.tenant_id,
      company_id: "default-company",
      name: data.name || "Unnamed Funnel",
      status: "DRAFT",
      steps: [],
      created_at: this.now(),
      updated_at: this.now(),
      ...data,
    };
    store.funnels.unshift(created);
    return created;
  }

  async getAppointments(ctx: TenantContext): Promise<MarketingAppointment[]> {
    return this.getStore(ctx.tenant_id).appointments;
  }

  async createAppointment(ctx: TenantContext, data: Partial<MarketingAppointment>): Promise<MarketingAppointment> {
    const store = this.getStore(ctx.tenant_id);
    const created: MarketingAppointment = {
      id: this.id("mkt-appt"),
      tenant_id: ctx.tenant_id,
      company_id: "default-company",
      contact_id: data.contact_id || "",
      scheduled_at: data.scheduled_at || this.now(),
      duration_mins: data.duration_mins || 30,
      status: "SCHEDULED",
      created_at: this.now(),
      updated_at: this.now(),
      ...data,
    };
    store.appointments.unshift(created);
    return created;
  }

  async getAutomationRules(ctx: TenantContext): Promise<MarketingAutomationRule[]> {
    return this.getStore(ctx.tenant_id).automation;
  }

  async createAutomationRule(ctx: TenantContext, data: Partial<MarketingAutomationRule>): Promise<MarketingAutomationRule> {
    const store = this.getStore(ctx.tenant_id);
    const created: MarketingAutomationRule = {
      id: this.id("mkt-auto"),
      tenant_id: ctx.tenant_id,
      company_id: "default-company",
      name: data.name || "Unnamed Rule",
      trigger_event: data.trigger_event || "lead.created",
      status: "INACTIVE",
      created_at: this.now(),
      updated_at: this.now(),
      ...data,
    };
    store.automation.unshift(created);
    return created;
  }

  async getMessages(ctx: TenantContext, contactId?: string): Promise<MarketingOmnichannelMessage[]> {
    const store = this.getStore(ctx.tenant_id);
    if (contactId) return store.messages.filter(m => m.contact_id === contactId);
    return store.messages;
  }

  async sendMessage(ctx: TenantContext, data: Partial<MarketingOmnichannelMessage>): Promise<MarketingOmnichannelMessage> {
    const store = this.getStore(ctx.tenant_id);
    const created: MarketingOmnichannelMessage = {
      id: this.id("mkt-msg"),
      tenant_id: ctx.tenant_id,
      company_id: "default-company",
      contact_id: data.contact_id || "",
      channel: data.channel || "EMAIL",
      direction: "OUTBOUND",
      content: data.content || "",
      status: "SENT",
      sent_at: this.now(),
      ...data,
    };
    store.messages.unshift(created);
    return created;
  }

  async getCreativeAssets(ctx: TenantContext): Promise<MarketingCreativeAsset[]> {
    return this.getStore(ctx.tenant_id).assets;
  }

  async createCreativeAsset(ctx: TenantContext, data: Partial<MarketingCreativeAsset>): Promise<MarketingCreativeAsset> {
    const store = this.getStore(ctx.tenant_id);
    const created: MarketingCreativeAsset = {
      id: this.id("mkt-asset"),
      tenant_id: ctx.tenant_id,
      company_id: "default-company",
      name: data.name || "Unnamed Asset",
      type: data.type || "IMAGE",
      url: data.url || "",
      tags: data.tags || [],
      created_at: this.now(),
      updated_at: this.now(),
      ...data,
    };
    store.assets.unshift(created);
    return created;
  }

  async calculateAdvancedAttribution(ctx: TenantContext, model: "FIRST_CLICK" | "LINEAR" | "LAST_CLICK"): Promise<any> {
    const store = this.getStore(ctx.tenant_id);
    const leads = store.leads;
    return leads.map(lead => ({
      leadId: lead.id,
      campaignId: lead.campaignId,
      attributedRevenue: 1000,
      model
    }));
  }
}
