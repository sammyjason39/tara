import { TenantContext } from "../../../gateway/tenant-context.interface";
import { MultiTenancyUtil } from "../../../shared/utils/multi-tenancy.util";
import { Injectable } from "@nestjs/common";
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
import { v4 as uuidv4 } from "uuid";

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
      aiRecommendation: db.aiRecommendation,
      created_at: db.created_at,
      updated_at: db.updated_at,
    };
  }

  private mapExecution(db: any): MarketingExecution {
    return {
      id: db.id,
      tenant_id: db.tenant_id,
      campaignId: db.campaignId,
      channel: db.channel as any,
      scheduledAt: db.scheduledAt.toISOString(),
      status: db.status.toLowerCase() as any,
      leadsGenerated: db.leadsGenerated,
      spend: Number(db.spend),
      notes: db.notes,
      created_at: db.created_at,
      updated_at: db.updated_at,
    };
  }

  private mapLead(db: any): MarketingLead {
    return {
      id: db.id,
      tenant_id: db.tenant_id,
      campaignId: db.campaignId,
      source: db.source as any,
      company_name: db.company_name,
      contact_name: db.contact_name,
      email: db.email,
      phone: db.phone,
      country: db.country,
      industry: db.industry,
      employeeBand: db.employeeBand,
      dedupKey: db.dedupKey,
      score: db.score,
      intent: db.intent.toUpperCase() as any,
      status: db.status.toUpperCase() as any,
      qualificationReason: db.qualificationReason,
      salesHandoffId: db.salesHandoffId,
      created_at: db.created_at,
      updated_at: db.updated_at,
    };
  }

  // Implementation
  async getDashboard(ctx: TenantContext): Promise<MarketingDashboard> {
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
      (sum: number, item: any) => sum + Number(item.revenueAttributed),
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

  async getChannelPerformance(ctx: TenantContext,
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

  async getCampaigns(ctx: TenantContext): Promise<MarketingCampaign[]> {
    const items = await this.prisma.marketing_campaigns.findMany({
      where: MultiTenancyUtil.getScope(ctx),
      orderBy: { created_at: "desc" },
    });
    return items.map((i: any) => this.mapCampaign(i));
  }

  async createCampaign(ctx: TenantContext,
    dto: CreateCampaignDto,
    actor_id: string,
  ): Promise<MarketingCampaign> {
    const item = await this.prisma.marketing_campaigns.create({
      data: {
        id: uuidv4(),
        updated_at: new Date(),
        ...MultiTenancyUtil.getScope(ctx),
        name: dto.name,
        objective: dto.objective,
        channel_mix: dto.channel_mix,
        owner_id: actor_id,
        owner_name: "Zenvix User",
        budget: dto.budget,
        currency: dto.currency || "USD",
        status: "DRAFT",
        start_date: new Date(dto.start_date),
        end_date: new Date(dto.end_date),
        audience: dto.audience,
        ai_recommendation: "System generated budget allocation recommended.",
      },
    });
    return this.mapCampaign(item);
  }

  async updateCampaignStatus(ctx: TenantContext,
    id: string,
    dto: UpdateCampaignStatusDto,
  ): Promise<MarketingCampaign> {
    const item = await this.prisma.marketing_campaigns.update({
      where: { id, ...MultiTenancyUtil.getScope(ctx) },
      data: { status: dto.status.toUpperCase() },
    });
    return this.mapCampaign(item);
  }

  async getExecutions(ctx: TenantContext): Promise<MarketingExecution[]> {
    const items = await this.prisma.marketing_executions.findMany({
      where: MultiTenancyUtil.getScope(ctx),
      orderBy: { scheduled_at: "desc" },
    });
    return items.map((i: any) => this.mapExecution(i));
  }

  async scheduleExecution(ctx: TenantContext,
    dto: ScheduleExecutionDto,
  ): Promise<MarketingExecution> {
    const item = await this.prisma.marketing_executions.create({
      data: {
        id: uuidv4(),
        updated_at: new Date(),
        ...MultiTenancyUtil.getScope(ctx),
        campaign_id: dto.campaignId,
        channel: dto.channel,
        scheduled_at: new Date(dto.scheduledAt),
        status: "SCHEDULED",
        leads_generated: 0,
        spend: 0,
        notes: dto.notes,
      },
    });
    return this.mapExecution(item);
  }

  async runExecution(ctx: TenantContext,
    id: string,
    dto: RunExecutionDto,
  ): Promise<MarketingExecution> {
    const item = await this.prisma.marketing_executions.update({
      where: { id, ...MultiTenancyUtil.getScope(ctx) },
      data: {
        status: dto.failed ? "FAILED" : "COMPLETED",
        leads_generated: dto.leadsGenerated,
        spend: dto.spend,
      },
    });
    return this.mapExecution(item);
  }

  async getLeads(ctx: TenantContext): Promise<MarketingLead[]> {
    const items = await this.prisma.marketing_leads.findMany({
      where: MultiTenancyUtil.getScope(ctx),
      orderBy: { created_at: "desc" },
    });
    return items.map((i: any) => this.mapLead(i));
  }

  async captureLead(ctx: TenantContext,
    dto: CaptureLeadDto,
  ): Promise<MarketingLead> {
    const dedupKey =
      `${dto.company_name}-${dto.email || dto.phone || dto.contact_name}`.toLowerCase();
    const item = await this.prisma.marketing_leads.create({
      data: {
        id: uuidv4(),
        updated_at: new Date(),
        ...MultiTenancyUtil.getScope(ctx),
        campaign_id: dto.campaignId,
        source: dto.source,
        company_name: dto.company_name,
        contact_name: dto.contact_name,
        email: dto.email,
        phone: dto.phone,
        country: dto.country,
        industry: dto.industry,
        employee_band: dto.employeeBand,
        dedup_key: dedupKey,
        score: 50,
        intent: "MEDIUM",
        status: "SCORED",
      },
    });
    return this.mapLead(item);
  }

  async markLeadHandoffReady(ctx: TenantContext,
    id: string,
  ): Promise<MarketingLead> {
    const item = await this.prisma.marketing_leads.update({
      where: { id, ...MultiTenancyUtil.getScope(ctx) },
      data: { status: "HANDOFF_READY" },
    });
    return this.mapLead(item);
  }

  async handoffLeadToSales(ctx: TenantContext,
    id: string,
  ): Promise<MarketingLead> {
    const item = await this.prisma.marketing_leads.update({
      where: { id, ...MultiTenancyUtil.getScope(ctx) },
      data: { status: "HANDOFF_SENT" },
    });
    return this.mapLead(item);
  }

  async getWorkflows(ctx: TenantContext): Promise<MarketingWorkflow[]> {
    const items = await this.prisma.marketing_workflows.findMany({
      where: MultiTenancyUtil.getScope(ctx),
    });
    return items.map((i: any) => ({
      id: i.id,
      tenant_id: i.tenant_id,
      name: i.name,
      trigger: i.trigger as any,
      status: i.status.toLowerCase() as any,
      steps: i.steps as any,
      aiSuggestion: i.aiSuggestion || undefined,
      created_at: i.created_at,
      updated_at: i.updated_at,
    }));
  }

  async createWorkflow(ctx: TenantContext,
    dto: CreateWorkflowDto,
  ): Promise<MarketingWorkflow> {
    const item = await this.prisma.marketing_workflows.create({
      data: {
        id: uuidv4(),
        updated_at: new Date(),
        ...MultiTenancyUtil.getScope(ctx),
        name: dto.name,
        trigger: dto.trigger,
        status: "DRAFT",
        steps: dto.steps as any,
      },
    });
    return {
      id: item.id,
      tenant_id: item.tenant_id,
      name: item.name,
      trigger: item.trigger as any,
      status: item.status.toLowerCase() as any,
      steps: item.steps as any,
      aiSuggestion: item.ai_suggestion || undefined,
      created_at: item.created_at,
      updated_at: item.updated_at,
    };
  }

  async updateWorkflowStatus(ctx: TenantContext,
    id: string,
    dto: UpdateWorkflowStatusDto,
  ): Promise<MarketingWorkflow> {
    const item = await this.prisma.marketing_workflows.update({
      where: { id, ...MultiTenancyUtil.getScope(ctx) },
      data: { status: dto.status.toUpperCase() },
    });
    return {
      id: item.id,
      tenant_id: item.tenant_id,
      name: item.name,
      trigger: item.trigger as any,
      status: item.status.toLowerCase() as any,
      steps: item.steps as any,
      aiSuggestion: item.ai_suggestion || undefined,
      created_at: item.created_at,
      updated_at: item.updated_at,
    };
  }

  async getConnectedAccounts(ctx: TenantContext,
  ): Promise<MarketingConnectedAccount[]> {
    const items = await this.prisma.marketing_accounts.findMany({
      where: MultiTenancyUtil.getScope(ctx),
    });
    return items.map((i: any) => ({
      id: i.id,
      tenant_id: i.tenant_id,
      provider: i.provider as any,
      account_name: i.account_name,
      status: i.status.toLowerCase() as any,
      tokenExpiresAt: i.tokenExpiresAt,
      scopes: i.scopes,
      lastSyncAt: i.lastSyncAt,
      created_at: i.created_at,
      updated_at: i.updated_at,
    }));
  }

  async connectAccount(ctx: TenantContext,
    dto: ConnectAccountDto,
  ): Promise<MarketingConnectedAccount> {
    const item = await this.prisma.marketing_accounts.create({
      data: {
        id: uuidv4(),
        updated_at: new Date(),
        ...MultiTenancyUtil.getScope(ctx),
        provider: dto.provider,
        account_name: dto.account_name,
        status: "CONNECTED",
        token_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        scopes: dto.scopes,
        last_sync_at: new Date(),
      },
    });
    return {
      id: item.id,
      tenant_id: item.tenant_id,
      provider: item.provider as any,
      account_name: item.account_name,
      status: item.status.toLowerCase() as any,
      tokenExpiresAt: item.token_expires_at,
      scopes: item.scopes,
      lastSyncAt: item.last_sync_at || undefined,
      created_at: item.created_at,
      updated_at: item.updated_at,
    };
  }

  async updateAccountStatus(ctx: TenantContext,
    id: string,
    dto: UpdateAccountStatusDto,
  ): Promise<MarketingConnectedAccount> {
    const item = await this.prisma.marketing_accounts.update({
      where: { id, ...MultiTenancyUtil.getScope(ctx) },
      data: { status: dto.status.toUpperCase() },
    });
    return {
      id: item.id,
      tenant_id: item.tenant_id,
      provider: item.provider as any,
      account_name: item.account_name,
      status: item.status.toLowerCase() as any,
      tokenExpiresAt: item.token_expires_at,
      scopes: item.scopes,
      lastSyncAt: item.last_sync_at || undefined,
      created_at: item.created_at,
      updated_at: item.updated_at,
    };
  }

  async getAttribution(ctx: TenantContext): Promise<MarketingAttribution[]> {
    const items = await this.prisma.marketing_attribution.findMany({
      where: MultiTenancyUtil.getScope(ctx),
      orderBy: { created_at: "desc" },
    });
    return items.map((i: any) => ({
      id: i.id,
      tenant_id: i.tenant_id,
      campaignId: i.campaignId,
      lead_id: i.lead_id,
      opportunityId: i.opportunityId,
      revenueAttributed: Number(i.revenueAttributed),
      spend: Number(i.spend),
      roiPercent: Number(i.roi_percent),
      model: i.model || "LAST_CLICK",
      created_at: i.created_at,
    }));
  }

  async getAlerts(ctx: TenantContext): Promise<MarketingAlert[]> {
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
    }));
  }

  async acknowledgeAlert(ctx: TenantContext,
    id: string,
  ): Promise<MarketingAlert> {
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
    };
  }

  async runHealthSweep(ctx: TenantContext, actor_id: string): Promise<MarketingAlert[]> {
    return this.getAlerts(ctx);
  }

  async getAuditEvents(ctx: TenantContext): Promise<MarketingAuditEvent[]> {
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

  async getContacts(ctx: TenantContext): Promise<MarketingContact[]> {
    const items = await this.prisma.marketing_contacts.findMany({
      where: MultiTenancyUtil.getScope(ctx),
      orderBy: { created_at: "desc" },
    });
    return items.map(i => i as any);
  }

  async getContactById(ctx: TenantContext, id: string): Promise<MarketingContact> {
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

  async createContact(ctx: TenantContext, data: Partial<MarketingContact>): Promise<MarketingContact> {
    const item = await this.prisma.marketing_contacts.create({
      data: {
        id: uuidv4(),
        ...MultiTenancyUtil.getScope(ctx),
        first_name: data.first_name || "",
        last_name: data.last_name || "",
        email: data.email,
        phone: data.phone,
        tags: data.tags || [],
        score: data.score || 0,
        status: data.status || "ACTIVE",
        behavioral_data: data.behavioral_data || {},
        created_at: new Date(),
        updated_at: new Date(),
      }
    });
    return item as any;
  }

  async getFunnels(ctx: TenantContext): Promise<MarketingFunnel[]> {
    const items = await this.prisma.marketing_funnels.findMany({
      where: MultiTenancyUtil.getScope(ctx),
      include: { steps: true },
      orderBy: { created_at: "desc" },
    });
    return items.map(i => i as any);
  }

  async createFunnel(ctx: TenantContext, data: Partial<MarketingFunnel>): Promise<MarketingFunnel> {
    const item = await this.prisma.marketing_funnels.create({
      data: {
        id: uuidv4(),
        ...MultiTenancyUtil.getScope(ctx),
        name: data.name || "Unnamed Funnel",
        description: data.description,
        status: "DRAFT",
        created_at: new Date(),
        updated_at: new Date(),
      },
      include: { steps: true }
    });
    return item as any;
  }

  async getAppointments(ctx: TenantContext): Promise<MarketingAppointment[]> {
    const items = await this.prisma.marketing_appointments.findMany({
      where: MultiTenancyUtil.getScope(ctx),
      orderBy: { scheduled_at: "desc" },
    });
    return items.map(i => i as any);
  }

  async createAppointment(ctx: TenantContext, data: Partial<MarketingAppointment>): Promise<MarketingAppointment> {
    const item = await this.prisma.marketing_appointments.create({
      data: {
        id: uuidv4(),
        ...MultiTenancyUtil.getScope(ctx),
        contact_id: data.contact_id!,
        staff_id: data.staff_id,
        scheduled_at: new Date(data.scheduled_at!),
        duration_mins: data.duration_mins || 30,
        status: "SCHEDULED",
        notes: data.notes,
        created_at: new Date(),
        updated_at: new Date(),
      }
    });
    return item as any;
  }

  async getAutomationRules(ctx: TenantContext): Promise<MarketingAutomationRule[]> {
    const items = await this.prisma.marketing_automation_rules.findMany({
      where: MultiTenancyUtil.getScope(ctx),
      orderBy: { created_at: "desc" },
    });
    return items.map(i => i as any);
  }

  async createAutomationRule(ctx: TenantContext, data: Partial<MarketingAutomationRule>): Promise<MarketingAutomationRule> {
    const item = await this.prisma.marketing_automation_rules.create({
      data: {
        id: uuidv4(),
        ...MultiTenancyUtil.getScope(ctx),
        name: data.name || "Unnamed Rule",
        trigger_event: data.trigger_event || "lead.created",
        conditions: data.conditions || {},
        actions: data.actions || {},
        status: "INACTIVE",
        created_at: new Date(),
        updated_at: new Date(),
      }
    });
    return item as any;
  }

  async getMessages(ctx: TenantContext, contactId?: string): Promise<MarketingOmnichannelMessage[]> {
    const items = await this.prisma.marketing_omnichannel_messages.findMany({
      where: {
        ...MultiTenancyUtil.getScope(ctx),
        ...(contactId ? { contact_id: contactId } : {})
      },
      orderBy: { sent_at: "desc" },
    });
    return items.map(i => i as any);
  }

  async sendMessage(ctx: TenantContext, data: Partial<MarketingOmnichannelMessage>): Promise<MarketingOmnichannelMessage> {
    const item = await this.prisma.marketing_omnichannel_messages.create({
      data: {
        id: uuidv4(),
        ...MultiTenancyUtil.getScope(ctx),
        contact_id: data.contact_id!,
        channel: data.channel || "EMAIL",
        direction: "OUTBOUND",
        content: data.content || "",
        status: "SENT",
        sent_at: new Date(),
        metadata: data.metadata || {},
      }
    });
    return item as any;
  }

  async getCreativeAssets(ctx: TenantContext): Promise<MarketingCreativeAsset[]> {
    const items = await this.prisma.marketing_creative_assets.findMany({
      where: MultiTenancyUtil.getScope(ctx),
      orderBy: { created_at: "desc" },
    });
    return items.map(i => i as any);
  }

  async createCreativeAsset(ctx: TenantContext, data: Partial<MarketingCreativeAsset>): Promise<MarketingCreativeAsset> {
    const item = await this.prisma.marketing_creative_assets.create({
      data: {
        id: uuidv4(),
        ...MultiTenancyUtil.getScope(ctx),
        name: data.name || "Unnamed Asset",
        type: data.type || "IMAGE",
        url: data.url || "",
        tags: data.tags || [],
        metadata: data.metadata || {},
        created_at: new Date(),
        updated_at: new Date(),
      }
    });
    return item as any;
  }

  async calculateAdvancedAttribution(ctx: TenantContext, model: "FIRST_CLICK" | "LINEAR" | "LAST_CLICK"): Promise<any> {
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
}
