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
  async getDashboard(tenant_id: string): Promise<MarketingDashboard> {
    const [campaigns, leads, executions, accounts, attribution] =
      await Promise.all([
        this.prisma.marketing_campaigns.findMany({
          where: { tenant_id: tenant_id },
        }),
        this.prisma.marketing_leads.findMany({ where: { tenant_id: tenant_id } }),
        this.prisma.marketing_executions.findMany({
          where: { tenant_id: tenant_id },
        }),
        this.prisma.marketing_accounts.findMany({
          where: { tenant_id: tenant_id },
        }),
        this.prisma.marketing_attribution.findMany({
          where: { tenant_id: tenant_id },
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

  async getChannelPerformance(
    tenant_id: string,
  ): Promise<MarketingChannelPerformance[]> {
    const executions = await this.prisma.marketing_executions.findMany({
      where: { tenant_id: tenant_id },
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

  async getCampaigns(tenant_id: string): Promise<MarketingCampaign[]> {
    const items = await this.prisma.marketing_campaigns.findMany({
      where: { tenant_id: tenant_id },
      orderBy: { created_at: "desc" },
    });
    return items.map((i: any) => this.mapCampaign(i));
  }

  async createCampaign(
    tenant_id: string,
    dto: CreateCampaignDto,
    actor_id: string,
  ): Promise<MarketingCampaign> {
    const item = await this.prisma.marketing_campaigns.create({
      data: {
        id: '30f50s4a',
        updated_at: new Date(),
        tenant_id: tenant_id,
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

  async updateCampaignStatus(
    tenant_id: string,
    id: string,
    dto: UpdateCampaignStatusDto,
  ): Promise<MarketingCampaign> {
    const item = await this.prisma.marketing_campaigns.update({
      where: { id, tenant_id: tenant_id },
      data: { status: dto.status.toUpperCase() },
    });
    return this.mapCampaign(item);
  }

  async getExecutions(tenant_id: string): Promise<MarketingExecution[]> {
    const items = await this.prisma.marketing_executions.findMany({
      where: { tenant_id: tenant_id },
      orderBy: { scheduled_at: "desc" },
    });
    return items.map((i: any) => this.mapExecution(i));
  }

  async scheduleExecution(
    tenant_id: string,
    dto: ScheduleExecutionDto,
  ): Promise<MarketingExecution> {
    const item = await this.prisma.marketing_executions.create({
      data: {
        id: 'x4fyl78q',
        updated_at: new Date(),
        tenant_id: tenant_id,
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

  async runExecution(
    tenant_id: string,
    id: string,
    dto: RunExecutionDto,
  ): Promise<MarketingExecution> {
    const item = await this.prisma.marketing_executions.update({
      where: { id, tenant_id: tenant_id },
      data: {
        status: dto.failed ? "FAILED" : "COMPLETED",
        leads_generated: dto.leadsGenerated,
        spend: dto.spend,
      },
    });
    return this.mapExecution(item);
  }

  async getLeads(tenant_id: string): Promise<MarketingLead[]> {
    const items = await this.prisma.marketing_leads.findMany({
      where: { tenant_id: tenant_id },
      orderBy: { created_at: "desc" },
    });
    return items.map((i: any) => this.mapLead(i));
  }

  async captureLead(
    tenant_id: string,
    dto: CaptureLeadDto,
  ): Promise<MarketingLead> {
    const dedupKey =
      `${dto.company_name}-${dto.email || dto.phone || dto.contact_name}`.toLowerCase();
    const item = await this.prisma.marketing_leads.create({
      data: {
        id: 'b6fcz6j7',
        updated_at: new Date(),
        tenant_id: tenant_id,
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

  async markLeadHandoffReady(
    tenant_id: string,
    id: string,
  ): Promise<MarketingLead> {
    const item = await this.prisma.marketing_leads.update({
      where: { id, tenant_id: tenant_id },
      data: { status: "HANDOFF_READY" },
    });
    return this.mapLead(item);
  }

  async handoffLeadToSales(
    tenant_id: string,
    id: string,
  ): Promise<MarketingLead> {
    const item = await this.prisma.marketing_leads.update({
      where: { id, tenant_id: tenant_id },
      data: { status: "HANDOFF_SENT" },
    });
    return this.mapLead(item);
  }

  async getWorkflows(tenant_id: string): Promise<MarketingWorkflow[]> {
    const items = await this.prisma.marketing_workflows.findMany({
      where: { tenant_id: tenant_id },
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

  async createWorkflow(
    tenant_id: string,
    dto: CreateWorkflowDto,
  ): Promise<MarketingWorkflow> {
    const item = await this.prisma.marketing_workflows.create({
      data: {
        id: 'v77e462a',
        updated_at: new Date(),
        tenant_id: tenant_id,
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

  async updateWorkflowStatus(
    tenant_id: string,
    id: string,
    dto: UpdateWorkflowStatusDto,
  ): Promise<MarketingWorkflow> {
    const item = await this.prisma.marketing_workflows.update({
      where: { id, tenant_id: tenant_id },
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

  async getConnectedAccounts(
    tenant_id: string,
  ): Promise<MarketingConnectedAccount[]> {
    const items = await this.prisma.marketing_accounts.findMany({
      where: { tenant_id: tenant_id },
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

  async connectAccount(
    tenant_id: string,
    dto: ConnectAccountDto,
  ): Promise<MarketingConnectedAccount> {
    const item = await this.prisma.marketing_accounts.create({
      data: {
        id: 'e7imhqu6',
        updated_at: new Date(),
        tenant_id: tenant_id,
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

  async updateAccountStatus(
    tenant_id: string,
    id: string,
    dto: UpdateAccountStatusDto,
  ): Promise<MarketingConnectedAccount> {
    const item = await this.prisma.marketing_accounts.update({
      where: { id, tenant_id: tenant_id },
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

  async getAttribution(tenant_id: string): Promise<MarketingAttribution[]> {
    const items = await this.prisma.marketing_attribution.findMany({
      where: { tenant_id: tenant_id },
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
      roiPercent: Number(i.roiPercent),
      created_at: i.created_at,
    }));
  }

  async getAlerts(tenant_id: string): Promise<MarketingAlert[]> {
    const items = await this.prisma.marketing_alerts.findMany({
      where: { tenant_id: tenant_id },
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

  async acknowledgeAlert(
    tenant_id: string,
    id: string,
  ): Promise<MarketingAlert> {
    const item = await this.prisma.marketing_alerts.update({
      where: { id, tenant_id: tenant_id },
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

  async runHealthSweep(tenant_id: string): Promise<MarketingAlert[]> {
    return this.getAlerts(tenant_id);
  }

  async getAuditEvents(tenant_id: string): Promise<MarketingAuditEvent[]> {
    const items = await this.prisma.marketing_audit_events.findMany({
      where: { tenant_id: tenant_id },
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
}
