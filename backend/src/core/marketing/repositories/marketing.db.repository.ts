import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../persistence/prisma.service';
import { IMarketingRepository, MarketingDashboard, MarketingChannelPerformance } from './marketing.repository.interface';
import { MarketingCampaign } from '../entities/marketing-campaign.entity';
import { MarketingExecution } from '../entities/marketing-execution.entity';
import { MarketingLead } from '../entities/marketing-lead.entity';
import { MarketingWorkflow } from '../entities/marketing-workflow.entity';
import { MarketingConnectedAccount } from '../entities/marketing-account.entity';
import { MarketingAttribution } from '../entities/marketing-attribution.entity';
import { MarketingAlert } from '../entities/marketing-alert.entity';
import { MarketingAuditEvent } from '../entities/marketing-audit.entity';
import { CreateCampaignDto } from '../dto/create-campaign.dto';
import { UpdateCampaignStatusDto } from '../dto/update-campaign-status.dto';
import { ScheduleExecutionDto } from '../dto/schedule-execution.dto';
import { RunExecutionDto } from '../dto/run-execution.dto';
import { CaptureLeadDto } from '../dto/capture-lead.dto';
import { CreateWorkflowDto } from '../dto/create-workflow.dto';
import { UpdateWorkflowStatusDto } from '../dto/update-workflow-status.dto';
import { ConnectAccountDto } from '../dto/connect-account.dto';
import { UpdateAccountStatusDto } from '../dto/update-account-status.dto';

@Injectable()
export class MarketingDbRepository extends IMarketingRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  // Mappers
  private mapCampaign(db: any): MarketingCampaign {
    return {
      id: db.id,
      tenantId: db.tenantId,
      name: db.name,
      objective: db.objective as any,
      channelMix: db.channelMix as any,
      ownerId: db.ownerId,
      ownerName: db.ownerName,
      budget: Number(db.budget),
      currency: db.currency as any,
      status: db.status.toLowerCase() as any,
      startDate: db.startDate.toISOString(),
      endDate: db.endDate.toISOString(),
      audience: db.audience,
      aiRecommendation: db.aiRecommendation,
      createdAt: db.createdAt,
      updatedAt: db.updatedAt,
    };
  }

  private mapExecution(db: any): MarketingExecution {
    return {
      id: db.id,
      tenantId: db.tenantId,
      campaignId: db.campaignId,
      channel: db.channel as any,
      scheduledAt: db.scheduledAt.toISOString(),
      status: db.status.toLowerCase() as any,
      leadsGenerated: db.leadsGenerated,
      spend: Number(db.spend),
      notes: db.notes,
      createdAt: db.createdAt,
      updatedAt: db.updatedAt,
    };
  }

  private mapLead(db: any): MarketingLead {
    return {
      id: db.id,
      tenantId: db.tenantId,
      campaignId: db.campaignId,
      source: db.source as any,
      companyName: db.companyName,
      contactName: db.contactName,
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
      createdAt: db.createdAt,
      updatedAt: db.updatedAt,
    };
  }

  // Implementation
  async getDashboard(tenantId: string): Promise<MarketingDashboard> {
    const [campaigns, leads, executions, accounts, attribution] = await Promise.all([
      this.prisma.marketingCampaign.findMany({ where: { tenantId: tenantId } }),
      this.prisma.marketingLead.findMany({ where: { tenantId: tenantId } }),
      this.prisma.marketingExecutionRun.findMany({ where: { tenantId: tenantId } }),
      this.prisma.marketingConnectedAccount.findMany({ where: { tenantId: tenantId } }),
      this.prisma.marketingAttribution.findMany({ where: { tenantId: tenantId } }),
    ]);

    const spendToDate = executions.reduce((sum: number, item: any) => sum + Number(item.spend), 0);
    const attributedRevenue = attribution.reduce((sum: number, item: any) => sum + Number(item.revenueAttributed), 0);
    const blendedRoiPercent = spendToDate > 0 ? ((attributedRevenue - spendToDate) / spendToDate) * 100 : 0;

    return {
      activeCampaigns: campaigns.filter((c: any) => c.status === 'ACTIVE').length,
      leadsToday: leads.filter((l: any) => l.createdAt.toDateString() === new Date().toDateString()).length,
      qualifiedLeads: leads.filter((l: any) => l.status === 'QUALIFIED').length,
      handoffReady: leads.filter((l: any) => l.status === 'HANDOFF_READY').length,
      spendToDate,
      attributedRevenue,
      blendedRoiPercent: Number(blendedRoiPercent.toFixed(2)),
      connectedAccountsHealthy: accounts.filter((a: any) => a.status === 'CONNECTED').length,
    };
  }

  async getChannelPerformance(tenantId: string): Promise<MarketingChannelPerformance[]> {
    const executions = await this.prisma.marketingExecutionRun.findMany({
      where: { tenantId: tenantId },
    });

    const groups = executions.reduce((acc: any, curr: any) => {
      const channel = curr.channel;
      if (!acc[channel]) acc[channel] = { leads: 0, spend: 0 };
      acc[channel].leads += curr.leadsGenerated;
      acc[channel].spend += Number(curr.spend);
      return acc;
    }, {} as Record<string, { leads: number, spend: number }>);

    return Object.entries(groups).map(([channel, data]: [string, any]) => ({
      channel: channel as any,
      leads: data.leads,
      spend: data.spend,
      cpl: data.leads > 0 ? data.spend / data.leads : 0,
    }));
  }

  async getCampaigns(tenantId: string): Promise<MarketingCampaign[]> {
    const items = await this.prisma.marketingCampaign.findMany({
      where: { tenantId: tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return items.map((i: any) => this.mapCampaign(i));
  }

  async createCampaign(tenantId: string, dto: CreateCampaignDto, actorId: string): Promise<MarketingCampaign> {
    const item = await this.prisma.marketingCampaign.create({
      data: {
        tenantId: tenantId,
        name: dto.name,
        objective: dto.objective,
        channelMix: dto.channelMix,
        ownerId: actorId, 
        ownerName: 'Zenvix User',
        budget: dto.budget,
        currency: dto.currency || 'USD',
        status: 'DRAFT',
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        audience: dto.audience,
        aiRecommendation: 'System generated budget allocation recommended.',
      },
    });
    return this.mapCampaign(item);
  }

  async updateCampaignStatus(tenantId: string, id: string, dto: UpdateCampaignStatusDto): Promise<MarketingCampaign> {
    const item = await this.prisma.marketingCampaign.update({
      where: { id, tenantId: tenantId },
      data: { status: dto.status.toUpperCase() },
    });
    return this.mapCampaign(item);
  }

  async getExecutions(tenantId: string): Promise<MarketingExecution[]> {
    const items = await this.prisma.marketingExecutionRun.findMany({
      where: { tenantId: tenantId },
      orderBy: { scheduledAt: 'desc' },
    });
    return items.map((i: any) => this.mapExecution(i));
  }

  async scheduleExecution(tenantId: string, dto: ScheduleExecutionDto): Promise<MarketingExecution> {
    const item = await this.prisma.marketingExecutionRun.create({
      data: {
        tenantId: tenantId,
        campaignId: dto.campaignId,
        channel: dto.channel,
        scheduledAt: new Date(dto.scheduledAt),
        status: 'SCHEDULED',
        leadsGenerated: 0,
        spend: 0,
        notes: dto.notes,
      },
    });
    return this.mapExecution(item);
  }

  async runExecution(tenantId: string, id: string, dto: RunExecutionDto): Promise<MarketingExecution> {
    const item = await this.prisma.marketingExecutionRun.update({
      where: { id, tenantId: tenantId },
      data: {
        status: dto.failed ? 'FAILED' : 'COMPLETED',
        leadsGenerated: dto.leadsGenerated,
        spend: dto.spend,
      },
    });
    return this.mapExecution(item);
  }

  async getLeads(tenantId: string): Promise<MarketingLead[]> {
    const items = await this.prisma.marketingLead.findMany({
      where: { tenantId: tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return items.map((i: any) => this.mapLead(i));
  }

  async captureLead(tenantId: string, dto: CaptureLeadDto): Promise<MarketingLead> {
    const dedupKey = `${dto.companyName}-${dto.email || dto.phone || dto.contactName}`.toLowerCase();
    const item = await this.prisma.marketingLead.create({
      data: {
        tenantId: tenantId,
        campaignId: dto.campaignId,
        source: dto.source,
        companyName: dto.companyName,
        contactName: dto.contactName,
        email: dto.email,
        phone: dto.phone,
        country: dto.country,
        industry: dto.industry,
        employeeBand: dto.employeeBand,
        dedupKey,
        score: 50, 
        intent: 'MEDIUM',
        status: 'SCORED',
      },
    });
    return this.mapLead(item);
  }

  async markLeadHandoffReady(tenantId: string, id: string): Promise<MarketingLead> {
    const item = await this.prisma.marketingLead.update({
      where: { id, tenantId: tenantId },
      data: { status: 'HANDOFF_READY' },
    });
    return this.mapLead(item);
  }

  async handoffLeadToSales(tenantId: string, id: string): Promise<MarketingLead> {
    const item = await this.prisma.marketingLead.update({
      where: { id, tenantId: tenantId },
      data: { status: 'HANDOFF_SENT' },
    });
    return this.mapLead(item);
  }

  async getWorkflows(tenantId: string): Promise<MarketingWorkflow[]> {
    const items = await this.prisma.marketingNurtureWorkflow.findMany({
      where: { tenantId: tenantId },
    });
    return items.map((i: any) => ({
      id: i.id,
      tenantId: i.tenantId,
      name: i.name,
      trigger: i.trigger as any,
      status: i.status.toLowerCase() as any,
      steps: i.steps as any,
      aiSuggestion: i.aiSuggestion || undefined,
      createdAt: i.createdAt,
      updatedAt: i.updatedAt,
    }));
  }

  async createWorkflow(tenantId: string, dto: CreateWorkflowDto): Promise<MarketingWorkflow> {
    const item = await this.prisma.marketingNurtureWorkflow.create({
      data: {
        tenantId: tenantId,
        name: dto.name,
        trigger: dto.trigger,
        status: 'DRAFT',
        steps: dto.steps as any,
      },
    });
    return {
      id: item.id,
      tenantId: item.tenantId,
      name: item.name,
      trigger: item.trigger as any,
      status: item.status.toLowerCase() as any,
      steps: item.steps as any,
      aiSuggestion: item.aiSuggestion || undefined,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  async updateWorkflowStatus(tenantId: string, id: string, dto: UpdateWorkflowStatusDto): Promise<MarketingWorkflow> {
    const item = await this.prisma.marketingNurtureWorkflow.update({
      where: { id, tenantId: tenantId },
      data: { status: dto.status.toUpperCase() },
    });
    return {
      id: item.id,
      tenantId: item.tenantId,
      name: item.name,
      trigger: item.trigger as any,
      status: item.status.toLowerCase() as any,
      steps: item.steps as any,
      aiSuggestion: item.aiSuggestion || undefined,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  async getConnectedAccounts(tenantId: string): Promise<MarketingConnectedAccount[]> {
    const items = await this.prisma.marketingConnectedAccount.findMany({
      where: { tenantId: tenantId },
    });
    return items.map((i: any) => ({
      id: i.id,
      tenantId: i.tenantId,
      provider: i.provider as any,
      accountName: i.accountName,
      status: i.status.toLowerCase() as any,
      tokenExpiresAt: i.tokenExpiresAt,
      scopes: i.scopes,
      lastSyncAt: i.lastSyncAt,
      createdAt: i.createdAt,
      updatedAt: i.updatedAt,
    }));
  }

  async connectAccount(tenantId: string, dto: ConnectAccountDto): Promise<MarketingConnectedAccount> {
    const item = await this.prisma.marketingConnectedAccount.create({
      data: {
        tenantId: tenantId,
        provider: dto.provider,
        accountName: dto.accountName,
        status: 'CONNECTED',
        tokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 
        scopes: dto.scopes,
        lastSyncAt: new Date(),
      },
    });
    return {
      id: item.id,
      tenantId: item.tenantId,
      provider: item.provider as any,
      accountName: item.accountName,
      status: item.status.toLowerCase() as any,
      tokenExpiresAt: item.tokenExpiresAt,
      scopes: item.scopes,
      lastSyncAt: item.lastSyncAt || undefined,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  async updateAccountStatus(tenantId: string, id: string, dto: UpdateAccountStatusDto): Promise<MarketingConnectedAccount> {
    const item = await this.prisma.marketingConnectedAccount.update({
      where: { id, tenantId: tenantId },
      data: { status: dto.status.toUpperCase() },
    });
    return {
      id: item.id,
      tenantId: item.tenantId,
      provider: item.provider as any,
      accountName: item.accountName,
      status: item.status.toLowerCase() as any,
      tokenExpiresAt: item.tokenExpiresAt,
      scopes: item.scopes,
      lastSyncAt: item.lastSyncAt || undefined,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  async getAttribution(tenantId: string): Promise<MarketingAttribution[]> {
    const items = await this.prisma.marketingAttribution.findMany({
      where: { tenantId: tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return items.map((i: any) => ({
      id: i.id,
      tenantId: i.tenantId,
      campaignId: i.campaignId,
      leadId: i.leadId,
      opportunityId: i.opportunityId,
      revenueAttributed: Number(i.revenueAttributed),
      spend: Number(i.spend),
      roiPercent: Number(i.roiPercent),
      createdAt: i.createdAt,
    }));
  }

  async getAlerts(tenantId: string): Promise<MarketingAlert[]> {
    const items = await this.prisma.marketingAlert.findMany({
      where: { tenantId: tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return items.map((i: any) => ({
      id: i.id,
      tenantId: i.tenantId,
      type: i.type as any,
      severity: i.severity as any,
      entityType: i.entityType as any,
      entityId: i.entityId,
      message: i.message,
      acknowledged: i.acknowledged,
      createdAt: i.createdAt,
      updatedAt: i.updatedAt,
    }));
  }

  async acknowledgeAlert(tenantId: string, id: string): Promise<MarketingAlert> {
    const item = await this.prisma.marketingAlert.update({
      where: { id, tenantId: tenantId },
      data: { acknowledged: true },
    });
    return {
      id: item.id,
      tenantId: item.tenantId,
      type: item.type as any,
      severity: item.severity as any,
      entityType: item.entityType as any,
      entityId: item.entityId,
      message: item.message,
      acknowledged: item.acknowledged,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  async runHealthSweep(tenantId: string): Promise<MarketingAlert[]> {
    return this.getAlerts(tenantId);
  }

  async getAuditEvents(tenantId: string): Promise<MarketingAuditEvent[]> {
    const items = await this.prisma.marketingAuditEvent.findMany({
      where: { tenantId: tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return items.map((i: any) => ({
      id: i.id,
      tenantId: i.tenantId,
      actorId: i.actorId,
      action: i.action,
      entityType: i.entityType as any,
      entityId: i.entityId,
      detail: i.detail,
      createdAt: i.createdAt,
    }));
  }
}
