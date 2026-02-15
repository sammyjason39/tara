import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CaptureLeadDto } from '../dto/capture-lead.dto';
import { ConnectAccountDto } from '../dto/connect-account.dto';
import { CreateCampaignDto } from '../dto/create-campaign.dto';
import { CreateWorkflowDto } from '../dto/create-workflow.dto';
import { RunExecutionDto } from '../dto/run-execution.dto';
import { ScheduleExecutionDto } from '../dto/schedule-execution.dto';
import { UpdateAccountStatusDto } from '../dto/update-account-status.dto';
import { UpdateCampaignStatusDto } from '../dto/update-campaign-status.dto';
import { UpdateWorkflowStatusDto } from '../dto/update-workflow-status.dto';
import { MarketingConnectedAccount } from '../entities/marketing-account.entity';
import { MarketingAlert } from '../entities/marketing-alert.entity';
import { MarketingAttribution } from '../entities/marketing-attribution.entity';
import { MarketingAuditEvent } from '../entities/marketing-audit.entity';
import { MarketingCampaign } from '../entities/marketing-campaign.entity';
import { MarketingExecution } from '../entities/marketing-execution.entity';
import { MarketingLead } from '../entities/marketing-lead.entity';
import { MarketingWorkflow } from '../entities/marketing-workflow.entity';
import {
  IMarketingRepository,
  MarketingChannelPerformance,
  MarketingDashboard,
} from './marketing.repository.interface';

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
  { id: 'mkt-jessie', name: 'Jessie Allan' },
  { id: 'mkt-ava', name: 'Ava Reynolds' },
  { id: 'mkt-henry', name: 'Henry Pham' },
];

const LEAD_SOURCE_SCORE: Record<MarketingLead['source'], number> = {
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
    this.ensureTenant('tenant-001');
    this.ensureTenant('tenant-002');
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
      dto.industry && ['Manufacturing', 'Retail', 'Technology'].includes(dto.industry) ? 8 : 0;
    const bandBoost =
      dto.employeeBand && ['201-500', '501-1000', '1001+'].includes(dto.employeeBand) ? 6 : 0;
    return Math.max(1, Math.min(99, base + industryBoost + bandBoost));
  }

  private intentFromScore(score: number): MarketingLead['intent'] {
    if (score >= 80) return 'high';
    if (score >= 65) return 'medium';
    return 'low';
  }

  private pickOwner(tenantId: string) {
    const store = this.getStore(tenantId);
    const load = store.campaigns.reduce<Record<string, number>>((acc, item) => {
      acc[item.ownerId] = (acc[item.ownerId] ?? 0) + 1;
      return acc;
    }, {});
    return [...OWNER_POOL].sort((a, b) => (load[a.id] ?? 0) - (load[b.id] ?? 0))[0];
  }

  private addAudit(
    tenantId: string,
    actorId: string,
    action: string,
    entityType: MarketingAuditEvent['entityType'],
    entityId: string,
    detail: string,
  ) {
    const store = this.getStore(tenantId);
    store.audit.unshift({
      id: this.id('mkt-audit'),
      tenantId,
      actorId,
      action,
      entityType,
      entityId,
      detail,
      createdAt: this.now(),
    });
  }

  private createAlertIfMissing(
    tenantId: string,
    payload: Omit<MarketingAlert, 'id' | 'createdAt' | 'updatedAt'>,
  ) {
    const store = this.getStore(tenantId);
    const existing = store.alerts.find(
      (item) =>
        item.type === payload.type &&
        item.entityType === payload.entityType &&
        item.entityId === payload.entityId &&
        !item.acknowledged,
    );
    if (existing) return existing;
    const created: MarketingAlert = {
      id: this.id('mkt-alert'),
      ...payload,
      createdAt: this.now(),
      updatedAt: this.now(),
    };
    store.alerts.unshift(created);
    return created;
  }

  private ensureTenant(tenantId: string): TenantMarketingStore {
    const existing = this.store.get(tenantId);
    if (existing) return existing;

    const campaigns: MarketingCampaign[] = [
      {
        id: `${tenantId}-cmp-001`,
        tenantId,
        name: 'Q2 Enterprise Expansion',
        objective: 'lead_generation',
        channelMix: ['meta_ads', 'google_ads', 'email'],
        ownerId: 'mkt-jessie',
        ownerName: 'Jessie Allan',
        budget: 120000,
        currency: 'USD',
        status: 'active',
        startDate: '2026-04-01',
        endDate: '2026-06-30',
        audience: 'Mid-market retail and manufacturing leaders',
        aiRecommendation: 'Increase retargeting weight for high-intent website visitors.',
        createdAt: this.addDays(-3),
        updatedAt: this.now(),
      },
      {
        id: `${tenantId}-cmp-002`,
        tenantId,
        name: 'Ops Summit Webinar',
        objective: 'nurture',
        channelMix: ['webinar', 'email', 'whatsapp'],
        ownerId: 'mkt-ava',
        ownerName: 'Ava Reynolds',
        budget: 45000,
        currency: 'USD',
        status: 'scheduled',
        startDate: '2026-05-10',
        endDate: '2026-05-31',
        audience: 'COO and finance transformation teams',
        aiRecommendation: 'Use two-touch reminder sequence to improve attendance.',
        createdAt: this.addDays(-2),
        updatedAt: this.now(),
      },
    ];

    const executions: MarketingExecution[] = [
      {
        id: `${tenantId}-exec-001`,
        tenantId,
        campaignId: `${tenantId}-cmp-001`,
        channel: 'meta_ads',
        scheduledAt: this.addDays(-1),
        status: 'running',
        leadsGenerated: 84,
        spend: 18000,
        notes: 'Creative set B currently outperforming by 23%.',
        createdAt: this.addDays(-1),
        updatedAt: this.now(),
      },
      {
        id: `${tenantId}-exec-002`,
        tenantId,
        campaignId: `${tenantId}-cmp-002`,
        channel: 'email',
        scheduledAt: this.addDays(1),
        status: 'scheduled',
        leadsGenerated: 0,
        spend: 0,
        createdAt: this.now(),
        updatedAt: this.now(),
      },
    ];

    const leads: MarketingLead[] = [
      {
        id: `${tenantId}-lead-001`,
        tenantId,
        campaignId: `${tenantId}-cmp-001`,
        source: 'meta_lead_ads',
        companyName: 'Orion Manufacturing',
        contactName: 'Mia Chen',
        email: 'mia.chen@orion.example',
        phone: '+1-202-555-0192',
        country: 'US',
        industry: 'Manufacturing',
        employeeBand: '201-500',
        dedupKey: 'orion-manufacturing-mia.chen@orion.example',
        score: 86,
        intent: 'high',
        status: 'handoff_ready',
        qualificationReason: 'High intent from pricing and demo request signal.',
        createdAt: this.now(),
        updatedAt: this.now(),
      },
      {
        id: `${tenantId}-lead-002`,
        tenantId,
        campaignId: `${tenantId}-cmp-001`,
        source: 'landing_page',
        companyName: 'Northline Group',
        contactName: 'Carlos Nguyen',
        email: 'carlos@northline.example',
        country: 'US',
        industry: 'Retail',
        employeeBand: '51-200',
        dedupKey: 'northline-group-carlos@northline.example',
        score: 72,
        intent: 'medium',
        status: 'scored',
        qualificationReason: 'Strong campaign engagement, no buying window stated.',
        createdAt: this.now(),
        updatedAt: this.now(),
      },
    ];

    const workflows: MarketingWorkflow[] = [
      {
        id: `${tenantId}-wf-001`,
        tenantId,
        name: 'High intent follow-up',
        status: 'active',
        trigger: 'new_lead',
        steps: [
          {
            id: `${tenantId}-wf-001-step-1`,
            order: 1,
            channel: 'email',
            waitHours: 0,
            messageTemplate: 'welcome-high-intent',
          },
          {
            id: `${tenantId}-wf-001-step-2`,
            order: 2,
            channel: 'whatsapp',
            waitHours: 12,
            messageTemplate: 'demo-reminder',
          },
        ],
        aiSuggestion: 'Add retargeting touchpoint for no-reply branch.',
        createdAt: this.addDays(-2),
        updatedAt: this.now(),
      },
    ];

    const accounts: MarketingConnectedAccount[] = [
      {
        id: `${tenantId}-acct-meta`,
        tenantId,
        provider: 'meta',
        accountName: 'Zenvix Meta Business',
        status: 'connected',
        tokenExpiresAt: this.addDays(20),
        scopes: ['ads_read', 'leads_retrieval'],
        lastSyncAt: this.now(),
        createdAt: this.addDays(-10),
        updatedAt: this.now(),
      },
      {
        id: `${tenantId}-acct-google`,
        tenantId,
        provider: 'google',
        accountName: 'Zenvix Google Ads',
        status: 'connected',
        tokenExpiresAt: this.addDays(15),
        scopes: ['adwords.read'],
        lastSyncAt: this.now(),
        createdAt: this.addDays(-10),
        updatedAt: this.now(),
      },
    ];

    const attribution: MarketingAttribution[] = [
      {
        id: `${tenantId}-attr-001`,
        tenantId,
        campaignId: `${tenantId}-cmp-001`,
        leadId: `${tenantId}-lead-001`,
        revenueAttributed: 230000,
        spend: 18000,
        roiPercent: 1177.78,
        createdAt: this.now(),
      },
    ];

    const alerts: MarketingAlert[] = [
      {
        id: `${tenantId}-alert-001`,
        tenantId,
        type: 'lead_spike',
        severity: 'medium',
        entityType: 'campaign',
        entityId: `${tenantId}-cmp-001`,
        message: 'Lead volume 42% above baseline in the last six hours.',
        acknowledged: false,
        createdAt: this.now(),
        updatedAt: this.now(),
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
    this.store.set(tenantId, seeded);
    return seeded;
  }

  private getStore(tenantId: string) {
    return this.ensureTenant(tenantId);
  }

  private findCampaign(tenantId: string, campaignId: string) {
    const campaign = this.getStore(tenantId).campaigns.find((item) => item.id === campaignId);
    if (!campaign) throw new NotFoundException('Campaign not found');
    return campaign;
  }

  private findExecution(tenantId: string, executionId: string) {
    const execution = this.getStore(tenantId).executions.find((item) => item.id === executionId);
    if (!execution) throw new NotFoundException('Execution not found');
    return execution;
  }

  private findLead(tenantId: string, leadId: string) {
    const lead = this.getStore(tenantId).leads.find((item) => item.id === leadId);
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  private findWorkflow(tenantId: string, workflowId: string) {
    const workflow = this.getStore(tenantId).workflows.find((item) => item.id === workflowId);
    if (!workflow) throw new NotFoundException('Workflow not found');
    return workflow;
  }

  private findAccount(tenantId: string, accountId: string) {
    const account = this.getStore(tenantId).accounts.find((item) => item.id === accountId);
    if (!account) throw new NotFoundException('Connected account not found');
    return account;
  }

  async getDashboard(tenantId: string): Promise<MarketingDashboard> {
    const store = this.getStore(tenantId);
    const now = this.now();
    const spendToDate = store.executions.reduce((sum, item) => sum + item.spend, 0);
    const attributedRevenue = store.attribution.reduce(
      (sum, item) => sum + item.revenueAttributed,
      0,
    );
    const blendedRoiPercent =
      spendToDate > 0 ? ((attributedRevenue - spendToDate) / spendToDate) * 100 : 0;
    return {
      activeCampaigns: store.campaigns.filter((item) => item.status === 'active').length,
      leadsToday: store.leads.filter((item) => {
        return (
          item.createdAt.getFullYear() === now.getFullYear() &&
          item.createdAt.getMonth() === now.getMonth() &&
          item.createdAt.getDate() === now.getDate()
        );
      }).length,
      qualifiedLeads: store.leads.filter((item) => item.status === 'qualified').length,
      handoffReady: store.leads.filter((item) => item.status === 'handoff_ready').length,
      spendToDate,
      attributedRevenue,
      blendedRoiPercent: Number(blendedRoiPercent.toFixed(2)),
      connectedAccountsHealthy: store.accounts.filter((item) => item.status === 'connected').length,
    };
  }

  async getChannelPerformance(tenantId: string): Promise<MarketingChannelPerformance[]> {
    const store = this.getStore(tenantId);
    const channels: MarketingExecution['channel'][] = [
      'meta_ads',
      'google_ads',
      'email',
      'whatsapp',
      'webinar',
      'landing_page',
      'event',
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

  async getCampaigns(tenantId: string): Promise<MarketingCampaign[]> {
    return this.getStore(tenantId).campaigns;
  }

  async createCampaign(
    tenantId: string,
    dto: CreateCampaignDto,
    actorId: string,
  ): Promise<MarketingCampaign> {
    const store = this.getStore(tenantId);
    const owner = this.pickOwner(tenantId);
    const created: MarketingCampaign = {
      id: this.id(`${tenantId}-cmp`),
      tenantId,
      name: dto.name,
      objective: dto.objective,
      channelMix: dto.channelMix,
      ownerId: owner.id,
      ownerName: owner.name,
      budget: dto.budget,
      currency: dto.currency ?? 'USD',
      status: 'draft',
      startDate: dto.startDate,
      endDate: dto.endDate,
      audience: dto.audience,
      aiRecommendation:
        'Start with high-intent segment and allocate 60% spend to best-performing channel.',
      createdAt: this.now(),
      updatedAt: this.now(),
    };
    store.campaigns.unshift(created);
    this.addAudit(tenantId, actorId, 'campaign.created', 'campaign', created.id, created.name);
    return created;
  }

  async updateCampaignStatus(
    tenantId: string,
    campaignId: string,
    dto: UpdateCampaignStatusDto,
    actorId: string,
  ): Promise<MarketingCampaign> {
    const campaign = this.findCampaign(tenantId, campaignId);
    campaign.status = dto.status;
    campaign.updatedAt = this.now();
    this.addAudit(
      tenantId,
      actorId,
      'campaign.status_changed',
      'campaign',
      campaign.id,
      dto.status,
    );
    return campaign;
  }

  async getExecutions(tenantId: string): Promise<MarketingExecution[]> {
    return this.getStore(tenantId).executions;
  }

  async scheduleExecution(
    tenantId: string,
    dto: ScheduleExecutionDto,
    actorId: string,
  ): Promise<MarketingExecution> {
    this.findCampaign(tenantId, dto.campaignId);
    const store = this.getStore(tenantId);
    const created: MarketingExecution = {
      id: this.id(`${tenantId}-exec`),
      tenantId,
      campaignId: dto.campaignId,
      channel: dto.channel,
      scheduledAt: new Date(dto.scheduledAt),
      status: 'scheduled',
      leadsGenerated: 0,
      spend: 0,
      notes: dto.notes,
      createdAt: this.now(),
      updatedAt: this.now(),
    };
    store.executions.unshift(created);
    this.addAudit(
      tenantId,
      actorId,
      'execution.scheduled',
      'execution',
      created.id,
      `${created.channel} for ${created.campaignId}`,
    );
    return created;
  }

  async runExecution(
    tenantId: string,
    executionId: string,
    dto: RunExecutionDto,
    actorId: string,
  ): Promise<MarketingExecution> {
    const execution = this.findExecution(tenantId, executionId);
    const failed = dto.failed ?? false;
    execution.status = failed ? 'failed' : 'completed';
    execution.leadsGenerated = dto.leadsGenerated ?? Math.max(8, Math.round(Math.random() * 60));
    execution.spend = dto.spend ?? Math.max(1500, Math.round(Math.random() * 12000));
    execution.updatedAt = this.now();
    if (failed) {
      this.createAlertIfMissing(tenantId, {
        tenantId,
        type: 'campaign_failure',
        severity: 'high',
        entityType: 'campaign',
        entityId: execution.campaignId,
        message: `Execution ${execution.id} failed on channel ${execution.channel}.`,
        acknowledged: false,
      });
    }
    this.addAudit(
      tenantId,
      actorId,
      'execution.ran',
      'execution',
      execution.id,
      `${execution.status}, leads=${execution.leadsGenerated}, spend=${execution.spend}`,
    );
    return execution;
  }

  async getLeads(tenantId: string): Promise<MarketingLead[]> {
    return this.getStore(tenantId).leads;
  }

  async captureLead(
    tenantId: string,
    dto: CaptureLeadDto,
    actorId: string,
  ): Promise<MarketingLead> {
    const store = this.getStore(tenantId);
    const dedupKey = `${dto.companyName}-${dto.email ?? dto.phone ?? dto.contactName}`
      .trim()
      .toLowerCase();
    const duplicate = store.leads.find((item) => item.dedupKey === dedupKey);
    if (duplicate) {
      duplicate.updatedAt = this.now();
      this.addAudit(
        tenantId,
        actorId,
        'lead.deduplicated',
        'lead',
        duplicate.id,
        duplicate.companyName,
      );
      return duplicate;
    }

    const score = this.scoreLead(dto);
    const created: MarketingLead = {
      id: this.id(`${tenantId}-lead`),
      tenantId,
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
      score,
      intent: this.intentFromScore(score),
      status: score >= 75 ? 'qualified' : 'scored',
      qualificationReason:
        score >= 75
          ? 'High score from source quality and firmographic fit.'
          : 'Lead captured and scored; nurture sequence recommended.',
      createdAt: this.now(),
      updatedAt: this.now(),
    };
    store.leads.unshift(created);
    this.addAudit(
      tenantId,
      actorId,
      'lead.captured',
      'lead',
      created.id,
      `${created.companyName} (${created.source})`,
    );
    return created;
  }

  async markLeadHandoffReady(
    tenantId: string,
    leadId: string,
    actorId: string,
  ): Promise<MarketingLead> {
    const lead = this.findLead(tenantId, leadId);
    if (!['scored', 'qualified', 'captured'].includes(lead.status)) {
      throw new BadRequestException('Lead cannot be moved to handoff ready.');
    }
    lead.status = 'handoff_ready';
    lead.updatedAt = this.now();
    this.addAudit(
      tenantId,
      actorId,
      'lead.handoff_ready',
      'lead',
      lead.id,
      lead.companyName,
    );
    return lead;
  }

  async handoffLeadToSales(
    tenantId: string,
    leadId: string,
    actorId: string,
  ): Promise<MarketingLead> {
    const store = this.getStore(tenantId);
    const lead = this.findLead(tenantId, leadId);
    if (!['qualified', 'handoff_ready'].includes(lead.status)) {
      throw new BadRequestException('Lead is not qualified for Sales handoff.');
    }
    lead.status = 'handoff_sent';
    lead.salesHandoffId = this.id('sales-lead');
    lead.updatedAt = this.now();

    if (lead.campaignId) {
      const campaignSpend = store.executions
        .filter((item) => item.campaignId === lead.campaignId)
        .reduce((sum, item) => sum + item.spend, 0);
      const revenueAttributed = Math.max(0, Math.round((lead.score / 100) * 300000));
      const roiPercent =
        campaignSpend > 0
          ? Number((((revenueAttributed - campaignSpend) / campaignSpend) * 100).toFixed(2))
          : 0;
      store.attribution.unshift({
        id: this.id(`${tenantId}-attr`),
        tenantId,
        campaignId: lead.campaignId,
        leadId: lead.id,
        opportunityId: lead.salesHandoffId,
        revenueAttributed,
        spend: campaignSpend,
        roiPercent,
        createdAt: this.now(),
      });
    }
    this.addAudit(
      tenantId,
      actorId,
      'lead.handoff_sent',
      'lead',
      lead.id,
      `Handoff to Sales lead ${lead.salesHandoffId}`,
    );
    return lead;
  }

  async getWorkflows(tenantId: string): Promise<MarketingWorkflow[]> {
    return this.getStore(tenantId).workflows;
  }

  async createWorkflow(
    tenantId: string,
    dto: CreateWorkflowDto,
    actorId: string,
  ): Promise<MarketingWorkflow> {
    const store = this.getStore(tenantId);
    const created: MarketingWorkflow = {
      id: this.id(`${tenantId}-wf`),
      tenantId,
      name: dto.name,
      status: 'draft',
      trigger: dto.trigger,
      steps: dto.steps,
      aiSuggestion: 'Use branch condition for high-intent contacts after step two.',
      createdAt: this.now(),
      updatedAt: this.now(),
    };
    store.workflows.unshift(created);
    this.addAudit(
      tenantId,
      actorId,
      'workflow.created',
      'workflow',
      created.id,
      created.name,
    );
    return created;
  }

  async updateWorkflowStatus(
    tenantId: string,
    workflowId: string,
    dto: UpdateWorkflowStatusDto,
    actorId: string,
  ): Promise<MarketingWorkflow> {
    const workflow = this.findWorkflow(tenantId, workflowId);
    workflow.status = dto.status;
    workflow.updatedAt = this.now();
    this.addAudit(
      tenantId,
      actorId,
      'workflow.status_changed',
      'workflow',
      workflow.id,
      workflow.status,
    );
    return workflow;
  }

  async getConnectedAccounts(tenantId: string): Promise<MarketingConnectedAccount[]> {
    return this.getStore(tenantId).accounts;
  }

  async connectAccount(
    tenantId: string,
    dto: ConnectAccountDto,
    actorId: string,
  ): Promise<MarketingConnectedAccount> {
    const store = this.getStore(tenantId);
    const created: MarketingConnectedAccount = {
      id: this.id(`${tenantId}-acct`),
      tenantId,
      provider: dto.provider,
      accountName: dto.accountName,
      status: 'connected',
      tokenExpiresAt: this.addDays(20),
      scopes: dto.scopes,
      lastSyncAt: this.now(),
      createdAt: this.now(),
      updatedAt: this.now(),
    };
    store.accounts.unshift(created);
    this.addAudit(
      tenantId,
      actorId,
      'account.connected',
      'account',
      created.id,
      `${created.provider}:${created.accountName}`,
    );
    return created;
  }

  async updateAccountStatus(
    tenantId: string,
    accountId: string,
    dto: UpdateAccountStatusDto,
    actorId: string,
  ): Promise<MarketingConnectedAccount> {
    const account = this.findAccount(tenantId, accountId);
    account.status = dto.status;
    account.updatedAt = this.now();
    this.addAudit(
      tenantId,
      actorId,
      'account.status_changed',
      'account',
      account.id,
      account.status,
    );
    return account;
  }

  async getAttribution(tenantId: string): Promise<MarketingAttribution[]> {
    return this.getStore(tenantId).attribution;
  }

  async getAlerts(tenantId: string): Promise<MarketingAlert[]> {
    return this.getStore(tenantId).alerts;
  }

  async acknowledgeAlert(tenantId: string, alertId: string): Promise<MarketingAlert> {
    const alert = this.getStore(tenantId).alerts.find((item) => item.id === alertId);
    if (!alert) throw new NotFoundException('Alert not found');
    alert.acknowledged = true;
    alert.updatedAt = this.now();
    return alert;
  }

  async runHealthSweep(tenantId: string, actorId: string): Promise<MarketingAlert[]> {
    const store = this.getStore(tenantId);
    const now = this.now().getTime();

    store.accounts.forEach((account) => {
      const expiresInHours = (account.tokenExpiresAt.getTime() - now) / (1000 * 60 * 60);
      if (expiresInHours <= 72) {
        this.createAlertIfMissing(tenantId, {
          tenantId,
          type: 'token_expiry',
          severity: expiresInHours <= 24 ? 'high' : 'medium',
          entityType: 'account',
          entityId: account.id,
          message: `${account.provider} token expires soon.`,
          acknowledged: false,
        });
      }
    });

    store.leads.forEach((lead) => {
      if (lead.status === 'handoff_ready' && lead.updatedAt.getTime() < now - 1000 * 60 * 60 * 4) {
        this.createAlertIfMissing(tenantId, {
          tenantId,
          type: 'handoff_delay',
          severity: 'high',
          entityType: 'lead',
          entityId: lead.id,
          message: `Qualified lead ${lead.companyName} not handed off within SLA.`,
          acknowledged: false,
        });
      }
    });

    const todayLeads = store.leads.filter((lead) => {
      const date = lead.createdAt;
      const nowDate = this.now();
      return (
        date.getFullYear() === nowDate.getFullYear() &&
        date.getMonth() === nowDate.getMonth() &&
        date.getDate() === nowDate.getDate()
      );
    }).length;
    if (todayLeads >= 20) {
      const campaignId = store.campaigns[0]?.id ?? 'unknown';
      this.createAlertIfMissing(tenantId, {
        tenantId,
        type: 'lead_spike',
        severity: 'medium',
        entityType: 'campaign',
        entityId: campaignId,
        message: 'Lead volume above daily baseline.',
        acknowledged: false,
      });
    }

    this.addAudit(
      tenantId,
      actorId,
      'health.sweep',
      'alert',
      'health-sweep',
      'Marketing health checks executed.',
    );
    return store.alerts;
  }

  async getAuditEvents(tenantId: string): Promise<MarketingAuditEvent[]> {
    return this.getStore(tenantId).audit;
  }
}

