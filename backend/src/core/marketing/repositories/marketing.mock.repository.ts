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
import {
  IMarketingRepository,
  MarketingChannelPerformance,
  MarketingDashboard,
} from "./marketing.repository.interface";

type TenantMarketingStore = {
  campaigns: MarketingCampaign[];
  executions: MarketingExecution[];
  leads: MarketingLead[];
  workflows: MarketingWorkflow[];
  accounts: MarketingConnectedAccount[];
  attribution: MarketingAttribution[];
  alerts: MarketingAlert[];
  audit: MarketingAuditEvent[];
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
    const base = LEAD_SOURCE_SCORE[dto.source];
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
      {
        id: `${tenant_id}-cmp-002`,
        tenant_id,
        name: "Ops Summit Webinar",
        objective: "nurture",
        channel_mix: ["webinar", "email", "whatsapp"],
        owner_id: "mkt-ava",
        owner_name: "Ava Reynolds",
        budget: 45000,
        currency: "USD",
        status: "scheduled",
        start_date: "2026-05-10",
        end_date: "2026-05-31",
        audience: "COO and finance transformation teams",
        aiRecommendation:
          "Use two-touch reminder sequence to improve attendance.",
        created_at: this.addDays(-2),
        updated_at: this.now(),
      },
    ];

    const executions: MarketingExecution[] = [
      {
        id: `${tenant_id}-exec-001`,
        tenant_id,
        campaignId: `${tenant_id}-cmp-001`,
        channel: "meta_ads",
        scheduledAt: this.addDays(-1),
        status: "running",
        leadsGenerated: 84,
        spend: 18000,
        notes: "Creative set B currently outperforming by 23%.",
        created_at: this.addDays(-1),
        updated_at: this.now(),
      },
      {
        id: `${tenant_id}-exec-002`,
        tenant_id,
        campaignId: `${tenant_id}-cmp-002`,
        channel: "email",
        scheduledAt: this.addDays(1),
        status: "scheduled",
        leadsGenerated: 0,
        spend: 0,
        created_at: this.now(),
        updated_at: this.now(),
      },
    ];

    const leads: MarketingLead[] = [
      {
        id: `${tenant_id}-lead-001`,
        tenant_id,
        campaignId: `${tenant_id}-cmp-001`,
        source: "meta_lead_ads",
        company_name: "Orion Manufacturing",
        contact_name: "Mia Chen",
        email: "mia.chen@orion.example",
        phone: "+1-202-555-0192",
        country: "US",
        industry: "Manufacturing",
        employeeBand: "201-500",
        dedupKey: "orion-manufacturing-mia.chen@orion.example",
        score: 86,
        intent: "high",
        status: "handoff_ready",
        qualificationReason:
          "High intent from pricing and demo request signal.",
        created_at: this.now(),
        updated_at: this.now(),
      },
      {
        id: `${tenant_id}-lead-002`,
        tenant_id,
        campaignId: `${tenant_id}-cmp-001`,
        source: "landing_page",
        company_name: "Northline Group",
        contact_name: "Carlos Nguyen",
        email: "carlos@northline.example",
        country: "US",
        industry: "Retail",
        employeeBand: "51-200",
        dedupKey: "northline-group-carlos@northline.example",
        score: 72,
        intent: "medium",
        status: "scored",
        qualificationReason:
          "Strong campaign engagement, no buying window stated.",
        created_at: this.now(),
        updated_at: this.now(),
      },
    ];

    const workflows: MarketingWorkflow[] = [
      {
        id: `${tenant_id}-wf-001`,
        tenant_id,
        name: "High intent follow-up",
        status: "active",
        trigger: "new_lead",
        steps: [
          {
            id: `${tenant_id}-wf-001-step-1`,
            order: 1,
            channel: "email",
            waitHours: 0,
            messageTemplate: "welcome-high-intent",
          },
          {
            id: `${tenant_id}-wf-001-step-2`,
            order: 2,
            channel: "whatsapp",
            waitHours: 12,
            messageTemplate: "demo-reminder",
          },
        ],
        aiSuggestion: "Add retargeting touchpoint for no-reply branch.",
        created_at: this.addDays(-2),
        updated_at: this.now(),
      },
    ];

    const accounts: MarketingConnectedAccount[] = [
      {
        id: `${tenant_id}-acct-meta`,
        tenant_id,
        provider: "meta",
        account_name: "Zenvix Meta Business",
        status: "connected",
        tokenExpiresAt: this.addDays(20),
        scopes: ["ads_read", "leads_retrieval"],
        lastSyncAt: this.now(),
        created_at: this.addDays(-10),
        updated_at: this.now(),
      },
      {
        id: `${tenant_id}-acct-google`,
        tenant_id,
        provider: "google",
        account_name: "Zenvix Google Ads",
        status: "connected",
        tokenExpiresAt: this.addDays(15),
        scopes: ["adwords.read"],
        lastSyncAt: this.now(),
        created_at: this.addDays(-10),
        updated_at: this.now(),
      },
    ];

    const attribution: MarketingAttribution[] = [
      {
        id: `${tenant_id}-attr-001`,
        tenant_id,
        campaignId: `${tenant_id}-cmp-001`,
        lead_id: `${tenant_id}-lead-001`,
        revenueAttributed: 230000,
        spend: 18000,
        roiPercent: 1177.78,
        created_at: this.now(),
      },
    ];

    const alerts: MarketingAlert[] = [
      {
        id: `${tenant_id}-alert-001`,
        tenant_id,
        type: "lead_spike",
        severity: "medium",
        entity_type: "campaign",
        entity_id: `${tenant_id}-cmp-001`,
        message: "Lead volume 42% above baseline in the last six hours.",
        acknowledged: false,
        created_at: this.now(),
        updated_at: this.now(),
      },
    ];

    const audit: MarketingAuditEvent[] = [];

    const seeded: TenantMarketingStore = {
      campaigns,
      executions,
      leads,
      workflows,
      accounts,
      attribution,
      alerts,
      audit,
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

  async getDashboard(tenant_id: string): Promise<MarketingDashboard> {
    const store = this.getStore(tenant_id);
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
    tenant_id: string,
  ): Promise<MarketingChannelPerformance[]> {
    const store = this.getStore(tenant_id);
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

  async getCampaigns(tenant_id: string): Promise<MarketingCampaign[]> {
    return this.getStore(tenant_id).campaigns;
  }

  async createCampaign(
    tenant_id: string,
    dto: CreateCampaignDto,
    actor_id: string,
  ): Promise<MarketingCampaign> {
    const store = this.getStore(tenant_id);
    const owner = this.pickOwner(tenant_id);
    const created: MarketingCampaign = {
      id: this.id(`${tenant_id}-cmp`),
      tenant_id,
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
      tenant_id,
      actor_id,
      "campaign.created",
      "campaign",
      created.id,
      created.name,
    );
    return created;
  }

  async updateCampaignStatus(
    tenant_id: string,
    campaignId: string,
    dto: UpdateCampaignStatusDto,
    actor_id: string,
  ): Promise<MarketingCampaign> {
    const campaign = this.findCampaign(tenant_id, campaignId);
    campaign.status = dto.status;
    campaign.updated_at = this.now();
    this.addAudit(
      tenant_id,
      actor_id,
      "campaign.status_changed",
      "campaign",
      campaign.id,
      dto.status,
    );
    return campaign;
  }

  async getExecutions(tenant_id: string): Promise<MarketingExecution[]> {
    return this.getStore(tenant_id).executions;
  }

  async scheduleExecution(
    tenant_id: string,
    dto: ScheduleExecutionDto,
    actor_id: string,
  ): Promise<MarketingExecution> {
    this.findCampaign(tenant_id, dto.campaignId);
    const store = this.getStore(tenant_id);
    const created: MarketingExecution = {
      id: this.id(`${tenant_id}-exec`),
      tenant_id,
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
      tenant_id,
      actor_id,
      "execution.scheduled",
      "execution",
      created.id,
      `${created.channel} for ${created.campaignId}`,
    );
    return created;
  }

  async runExecution(
    tenant_id: string,
    executionId: string,
    dto: RunExecutionDto,
    actor_id: string,
  ): Promise<MarketingExecution> {
    const execution = this.findExecution(tenant_id, executionId);
    const failed = dto.failed ?? false;
    execution.status = failed ? "failed" : "completed";
    execution.leadsGenerated =
      dto.leadsGenerated ?? Math.max(8, Math.round(Math.random() * 60));
    execution.spend =
      dto.spend ?? Math.max(1500, Math.round(Math.random() * 12000));
    execution.updated_at = this.now();
    if (failed) {
      this.createAlertIfMissing(tenant_id, {
        tenant_id,
        type: "campaign_failure",
        severity: "high",
        entity_type: "campaign",
        entity_id: execution.campaignId,
        message: `Execution ${execution.id} failed on channel ${execution.channel}.`,
        acknowledged: false,
      });
    }
    this.addAudit(
      tenant_id,
      actor_id,
      "execution.ran",
      "execution",
      execution.id,
      `${execution.status}, leads=${execution.leadsGenerated}, spend=${execution.spend}`,
    );
    return execution;
  }

  async getLeads(tenant_id: string): Promise<MarketingLead[]> {
    return this.getStore(tenant_id).leads;
  }

  async captureLead(
    tenant_id: string,
    dto: CaptureLeadDto,
    actor_id: string,
  ): Promise<MarketingLead> {
    const store = this.getStore(tenant_id);
    const dedupKey =
      `${dto.company_name}-${dto.email ?? dto.phone ?? dto.contact_name}`
        .trim()
        .toLowerCase();
    const duplicate = store.leads.find((item) => item.dedupKey === dedupKey);
    if (duplicate) {
      duplicate.updated_at = this.now();
      this.addAudit(
        tenant_id,
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
      id: this.id(`${tenant_id}-lead`),
      tenant_id,
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
      tenant_id,
      actor_id,
      "lead.captured",
      "lead",
      created.id,
      `${created.company_name} (${created.source})`,
    );
    return created;
  }

  async markLeadHandoffReady(
    tenant_id: string,
    lead_id: string,
    actor_id: string,
  ): Promise<MarketingLead> {
    const lead = this.findLead(tenant_id, lead_id);
    if (!["scored", "qualified", "captured"].includes(lead.status)) {
      throw new BadRequestException("Lead cannot be moved to handoff ready.");
    }
    lead.status = "handoff_ready";
    lead.updated_at = this.now();
    this.addAudit(
      tenant_id,
      actor_id,
      "lead.handoff_ready",
      "lead",
      lead.id,
      lead.company_name,
    );
    return lead;
  }

  async handoffLeadToSales(
    tenant_id: string,
    lead_id: string,
    actor_id: string,
  ): Promise<MarketingLead> {
    const store = this.getStore(tenant_id);
    const lead = this.findLead(tenant_id, lead_id);
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
        id: this.id(`${tenant_id}-attr`),
        tenant_id,
        campaignId: lead.campaignId,
        lead_id: lead.id,
        opportunityId: lead.salesHandoffId,
        revenueAttributed,
        spend: campaignSpend,
        roiPercent,
        created_at: this.now(),
      });
    }
    this.addAudit(
      tenant_id,
      actor_id,
      "lead.handoff_sent",
      "lead",
      lead.id,
      `Handoff to Sales lead ${lead.salesHandoffId}`,
    );
    return lead;
  }

  async getWorkflows(tenant_id: string): Promise<MarketingWorkflow[]> {
    return this.getStore(tenant_id).workflows;
  }

  async createWorkflow(
    tenant_id: string,
    dto: CreateWorkflowDto,
    actor_id: string,
  ): Promise<MarketingWorkflow> {
    const store = this.getStore(tenant_id);
    const created: MarketingWorkflow = {
      id: this.id(`${tenant_id}-wf`),
      tenant_id,
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
      tenant_id,
      actor_id,
      "workflow.created",
      "workflow",
      created.id,
      created.name,
    );
    return created;
  }

  async updateWorkflowStatus(
    tenant_id: string,
    workflowId: string,
    dto: UpdateWorkflowStatusDto,
    actor_id: string,
  ): Promise<MarketingWorkflow> {
    const workflow = this.findWorkflow(tenant_id, workflowId);
    workflow.status = dto.status;
    workflow.updated_at = this.now();
    this.addAudit(
      tenant_id,
      actor_id,
      "workflow.status_changed",
      "workflow",
      workflow.id,
      workflow.status,
    );
    return workflow;
  }

  async getConnectedAccounts(
    tenant_id: string,
  ): Promise<MarketingConnectedAccount[]> {
    return this.getStore(tenant_id).accounts;
  }

  async connectAccount(
    tenant_id: string,
    dto: ConnectAccountDto,
    actor_id: string,
  ): Promise<MarketingConnectedAccount> {
    const store = this.getStore(tenant_id);
    const created: MarketingConnectedAccount = {
      id: this.id(`${tenant_id}-acct`),
      tenant_id,
      provider: dto.provider,
      account_name: dto.account_name,
      status: "connected",
      tokenExpiresAt: this.addDays(20),
      scopes: dto.scopes,
      lastSyncAt: this.now(),
      created_at: this.now(),
      updated_at: this.now(),
    };
    store.accounts.unshift(created);
    this.addAudit(
      tenant_id,
      actor_id,
      "account.connected",
      "account",
      created.id,
      `${created.provider}:${created.account_name}`,
    );
    return created;
  }

  async updateAccountStatus(
    tenant_id: string,
    accountId: string,
    dto: UpdateAccountStatusDto,
    actor_id: string,
  ): Promise<MarketingConnectedAccount> {
    const account = this.findAccount(tenant_id, accountId);
    account.status = dto.status;
    account.updated_at = this.now();
    this.addAudit(
      tenant_id,
      actor_id,
      "account.status_changed",
      "account",
      account.id,
      account.status,
    );
    return account;
  }

  async getAttribution(tenant_id: string): Promise<MarketingAttribution[]> {
    return this.getStore(tenant_id).attribution;
  }

  async getAlerts(tenant_id: string): Promise<MarketingAlert[]> {
    return this.getStore(tenant_id).alerts;
  }

  async acknowledgeAlert(
    tenant_id: string,
    alertId: string,
  ): Promise<MarketingAlert> {
    const alert = this.getStore(tenant_id).alerts.find(
      (item) => item.id === alertId,
    );
    if (!alert) throw new NotFoundException("Alert not found");
    alert.acknowledged = true;
    alert.updated_at = this.now();
    return alert;
  }

  async runHealthSweep(
    tenant_id: string,
    actor_id: string,
  ): Promise<MarketingAlert[]> {
    const store = this.getStore(tenant_id);
    const now = this.now().getTime();

    store.accounts.forEach((account) => {
      const expiresInHours =
        (account.tokenExpiresAt.getTime() - now) / (1000 * 60 * 60);
      if (expiresInHours <= 72) {
        this.createAlertIfMissing(tenant_id, {
          tenant_id,
          type: "token_expiry",
          severity: expiresInHours <= 24 ? "high" : "medium",
          entity_type: "account",
          entity_id: account.id,
          message: `${account.provider} token expires soon.`,
          acknowledged: false,
        });
      }
    });

    store.leads.forEach((lead) => {
      if (
        lead.status === "handoff_ready" &&
        lead.updated_at.getTime() < now - 1000 * 60 * 60 * 4
      ) {
        this.createAlertIfMissing(tenant_id, {
          tenant_id,
          type: "handoff_delay",
          severity: "high",
          entity_type: "lead",
          entity_id: lead.id,
          message: `Qualified lead ${lead.company_name} not handed off within SLA.`,
          acknowledged: false,
        });
      }
    });

    const todayLeads = store.leads.filter((lead) => {
      const date = lead.created_at;
      const nowDate = this.now();
      return (
        date.getFullYear() === nowDate.getFullYear() &&
        date.getMonth() === nowDate.getMonth() &&
        date.getDate() === nowDate.getDate()
      );
    }).length;
    if (todayLeads >= 20) {
      const campaignId = store.campaigns[0]?.id ?? "unknown";
      this.createAlertIfMissing(tenant_id, {
        tenant_id,
        type: "lead_spike",
        severity: "medium",
        entity_type: "campaign",
        entity_id: campaignId,
        message: "Lead volume above daily baseline.",
        acknowledged: false,
      });
    }

    this.addAudit(
      tenant_id,
      actor_id,
      "health.sweep",
      "alert",
      "health-sweep",
      "Marketing health checks executed.",
    );
    return store.alerts;
  }

  async getAuditEvents(tenant_id: string): Promise<MarketingAuditEvent[]> {
    return this.getStore(tenant_id).audit;
  }
}
