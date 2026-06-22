import { TenantScope } from "../../shared/scope/tenant-scope";
import { Injectable, Logger } from "@nestjs/common";
import { CaptureLeadDto } from "./dto/capture-lead.dto";
import { ConnectAccountDto } from "./dto/connect-account.dto";
import { CreateCampaignDto } from "./dto/create-campaign.dto";
import { CreateWorkflowDto } from "./dto/create-workflow.dto";
import { RunExecutionDto } from "./dto/run-execution.dto";
import { ScheduleExecutionDto } from "./dto/schedule-execution.dto";
import { UpdateAccountStatusDto } from "./dto/update-account-status.dto";
import { UpdateCampaignStatusDto } from "./dto/update-campaign-status.dto";
import { UpdateWorkflowStatusDto } from "./dto/update-workflow-status.dto";
import { UpdateAccountSettingsDto } from "./dto/update-account-settings.dto";
import { IMarketingRepository } from "./repositories/marketing.repository.interface";
import { AuditService } from "../../shared/audit/audit.service";
import { AtomicOperationService } from "../shared/atomic";
import { AsyncRejectionService } from "../shared/async";

import { SocialSyncService } from "./social-sync.service";

@Injectable()
export class MarketingService {
  private readonly logger = new Logger(MarketingService.name);

  constructor(
    private readonly repository: IMarketingRepository,
    private readonly auditService: AuditService,
    private readonly socialSyncService: SocialSyncService,
    private readonly atomic: AtomicOperationService,
    private readonly asyncRejection: AsyncRejectionService,
  ) {}

  async getDashboard(ctx: TenantScope) {
    return this.repository.getDashboard(ctx);
  }

  async getChannelPerformance(ctx: TenantScope) {
    return this.repository.getChannelPerformance(ctx);
  }

  async getCampaigns(ctx: TenantScope) {
    return this.repository.getCampaigns(ctx);
  }

  async createCampaign(ctx: TenantScope,
    dto: CreateCampaignDto,
    actor_id: string,
  ) {
    const campaign = await this.repository.createCampaign(
      ctx,
      dto,
      actor_id,
    );
    await this.auditService.log({
      tenant_id: ctx.tenant_id,
      user_id: actor_id,
      module: "marketing",
      action: "CREATE",
      entity_type: "CAMPAIGN",
      entity_id: campaign.id,
      metadata: { name: dto.name, objective: dto.objective },
    });
    return campaign;
  }

  async updateCampaignStatus(ctx: TenantScope,
    campaignId: string,
    dto: UpdateCampaignStatusDto,
    actor_id: string,
  ) {
    // The status transition, its Audit_Trail entry and its Integration_Log
    // outbox event enrol in ONE Atomic_Operation; the transition is validated
    // against the campaign's current status inside the transaction, leaving the
    // campaign in exactly one defined status on rollback (Req 11.3, 4.1, 4.2,
    // 4.4, 6.5).
    return this.atomic.run(async ({ tx, audit, outbox }) => {
      const campaign = await this.repository.updateCampaignStatus(
        ctx,
        campaignId,
        dto,
        actor_id,
        tx,
      );
      await audit({
        tenant_id: ctx.tenant_id,
        user_id: actor_id,
        module: "marketing",
        action: "UPDATE_STATUS",
        entity_type: "CAMPAIGN",
        entity_id: campaignId,
        metadata: { status: dto.status },
      });
      await outbox({
        tenant_id: ctx.tenant_id,
        type: "marketing.campaign.status_changed.v1",
        payload: { campaign_id: campaignId, status: dto.status },
        company_id: ctx.company_id,
      });
      return campaign;
    });
  }

  async getExecutions(ctx: TenantScope) {
    return this.repository.getExecutions(ctx);
  }

  async scheduleExecution(ctx: TenantScope,
    dto: ScheduleExecutionDto,
    actor_id: string,
  ) {
    const execution = await this.repository.scheduleExecution(
      ctx,
      dto,
      actor_id,
    );
    await this.auditService.log({
      tenant_id: ctx.tenant_id,
      user_id: actor_id,
      module: "marketing",
      action: "SCHEDULE",
      entity_type: "EXECUTION",
      entity_id: execution.id,
      metadata: { campaignId: dto.campaignId, scheduledAt: dto.scheduledAt },
    });
    return execution;
  }

  async runExecution(ctx: TenantScope,
    executionId: string,
    dto: RunExecutionDto,
    actor_id: string,
  ) {
    const execution = await this.repository.runExecution(
      ctx,
      executionId,
      dto,
      actor_id,
    );
    await this.auditService.log({
      tenant_id: ctx.tenant_id,
      user_id: actor_id,
      module: "marketing",
      action: "RUN",
      entity_type: "EXECUTION",
      entity_id: executionId,
      metadata: { failed: dto.failed },
    });
    return execution;
  }

  async getLeads(ctx: TenantScope) {
    return this.repository.getLeads(ctx);
  }

  async getContacts(ctx: TenantScope) {
    return this.repository.getContacts(ctx);
  }

  async captureLead(ctx: TenantScope, dto: CaptureLeadDto, actor_id: string) {
    const lead = await this.repository.captureLead(ctx, dto, actor_id);
    await this.auditService.log({ tenant_id: ctx.tenant_id ,
      user_id: actor_id,
      module: "marketing",
      action: "CAPTURE",
      entity_type: "LEAD",
      entity_id: lead.id,
      metadata: { source: dto.source, email: dto.email },
    });
    return lead;
  }

  async markLeadHandoffReady(ctx: TenantScope,
    lead_id: string,
    actor_id: string,
  ) {
    // The readiness transition and its audit entry enrol in one Atomic_Operation;
    // the transition is validated against the lead's current status inside the
    // transaction (Requirements 11.4, 4.1, 4.4).
    return this.atomic.run(async ({ tx, audit }) => {
      const lead = await this.repository.markLeadHandoffReady(
        ctx,
        lead_id,
        actor_id,
        tx,
      );
      await audit({
        tenant_id: ctx.tenant_id,
        user_id: actor_id,
        module: "marketing",
        action: "HANDOFF_READY",
        entity_type: "LEAD",
        entity_id: lead_id,
      });
      return lead;
    });
  }

  async handoffLeadToSales(ctx: TenantScope, lead_id: string, actor_id: string) {
    // Lead_Handoff in ONE Atomic_Operation: the Sales-consumable handoff record,
    // the lead's consumability transfer (status → HANDOFF_SENT + sales_handoff_id
    // link), the Audit_Trail entry and the Integration_Log outbox event all
    // commit together or roll back together. A failed or not-handoff-ready
    // handoff rolls back, leaving the lead consumable only by Marketing
    // (Requirements 11.5, 11.6, 4.1, 4.2, 4.4, 6.5).
    return this.atomic.run(async ({ tx, audit, outbox }) => {
      const lead = await this.repository.handoffLeadToSales(
        ctx,
        lead_id,
        actor_id,
        tx,
      );
      await audit({
        tenant_id: ctx.tenant_id,
        user_id: actor_id,
        module: "marketing",
        action: "HANDOFF_TO_SALES",
        entity_type: "LEAD",
        entity_id: lead_id,
        metadata: { sales_handoff_id: (lead as any).salesHandoffId },
      });
      await outbox({
        tenant_id: ctx.tenant_id,
        type: "marketing.lead.handoff_sent.v1",
        payload: {
          lead_id,
          sales_handoff_id: (lead as any).salesHandoffId,
        },
        company_id: ctx.company_id,
      });
      return lead;
    });
  }

  async getWorkflows(ctx: TenantScope) {
    return this.repository.getWorkflows(ctx);
  }

  async createWorkflow(ctx: TenantScope,
    dto: CreateWorkflowDto,
    actor_id: string,
  ) {
    const workflow = await this.repository.createWorkflow(
      ctx,
      dto,
      actor_id,
    );
    await this.auditService.log({
      tenant_id: ctx.tenant_id,
      user_id: actor_id,
      module: "marketing",
      action: "CREATE",
      entity_type: "WORKFLOW",
      entity_id: workflow.id,
      metadata: { name: dto.name, trigger: dto.trigger },
    });
    return workflow;
  }

  async updateWorkflowStatus(ctx: TenantScope,
    workflowId: string,
    dto: UpdateWorkflowStatusDto,
    actor_id: string,
  ) {
    // The status transition, its audit entry and its outbox event enrol in one
    // Atomic_Operation; the transition is validated against the workflow's
    // current status inside the transaction (Req 11.3, 4.1, 4.2, 4.4, 6.5).
    return this.atomic.run(async ({ tx, audit, outbox }) => {
      const workflow = await this.repository.updateWorkflowStatus(
        ctx,
        workflowId,
        dto,
        actor_id,
        tx,
      );
      await audit({
        tenant_id: ctx.tenant_id,
        user_id: actor_id,
        module: "marketing",
        action: "UPDATE_STATUS",
        entity_type: "WORKFLOW",
        entity_id: workflowId,
        metadata: { status: dto.status },
      });
      await outbox({
        tenant_id: ctx.tenant_id,
        type: "marketing.workflow.status_changed.v1",
        payload: { workflow_id: workflowId, status: dto.status },
        company_id: ctx.company_id,
      });
      return workflow;
    });
  }

  async getConnectedAccounts(ctx: TenantScope) {
    return this.repository.getConnectedAccounts(ctx);
  }

  async connectAccount(ctx: TenantScope,
    dto: ConnectAccountDto,
    actor_id: string,
  ) {
    const account = await this.repository.connectAccount(
      ctx,
      dto,
      actor_id,
    );
    await this.auditService.log({
      tenant_id: ctx.tenant_id,
      user_id: actor_id,
      module: "marketing",
      action: "CONNECT",
      entity_type: "ACCOUNT",
      entity_id: account.id,
      metadata: { provider: dto.provider, account_name: dto.account_name },
    });
    return account;
  }

  async updateAccountSettings(ctx: TenantScope,
    accountId: string,
    dto: UpdateAccountSettingsDto,
    actor_id: string,
  ) {
    const account = await this.repository.updateAccountSettings(
      ctx,
      accountId,
      dto,
      actor_id,
    );
    await this.auditService.log({
      tenant_id: ctx.tenant_id,
      user_id: actor_id,
      module: "marketing",
      action: "UPDATE_SETTINGS",
      entity_type: "CONNECTED_ACCOUNT",
      entity_id: accountId,
      metadata: { ...dto },
    });
    return account;
  }

  async updateAccountStatus(ctx: TenantScope,
    accountId: string,
    dto: UpdateAccountStatusDto,
    actor_id: string,
  ) {
    // The status transition, its audit entry and its outbox event enrol in one
    // Atomic_Operation; the transition is validated against the account's
    // current status inside the transaction (Req 11.3, 4.1, 4.2, 4.4, 6.5).
    return this.atomic.run(async ({ tx, audit, outbox }) => {
      const account = await this.repository.updateAccountStatus(
        ctx,
        accountId,
        dto,
        actor_id,
        tx,
      );
      await audit({
        tenant_id: ctx.tenant_id,
        user_id: actor_id,
        module: "marketing",
        action: "UPDATE_STATUS",
        entity_type: "ACCOUNT",
        entity_id: accountId,
        metadata: { status: dto.status },
      });
      await outbox({
        tenant_id: ctx.tenant_id,
        type: "marketing.account.status_changed.v1",
        payload: { account_id: accountId, status: dto.status },
        company_id: ctx.company_id,
      });
      return account;
    });
  }

  async deleteAccount(ctx: TenantScope, accountId: string, actor_id: string) {
    await this.repository.deleteAccount(ctx, accountId);
    await this.auditService.log({
      tenant_id: ctx.tenant_id,
      user_id: actor_id,
      module: "marketing",
      action: "DELETE",
      entity_type: "ACCOUNT",
      entity_id: accountId,
    });
    return { success: true };
  }

  async triggerManualSync(ctx: TenantScope, accountId: string, actor_id: string) {
    // Wrap the request-bound social sync in the async-rejection deadline guard so
    // it always resolves within the deadline as a typed response and any failure
    // is captured + recorded in the Integration_Log without an unhandled
    // rejection (Req 7.1–7.3, 11.10). A successful sync records its outcome in
    // the Integration_Log inside syncAccount (Req 11.11).
    const result = await this.asyncRejection.runWithDeadline(
      {
        module: "MARKETING",
        operation: "marketing.social.sync.manual",
        tenant_id: ctx.tenant_id,
        user_id: actor_id,
        metadata: { account_id: accountId },
      },
      () => this.socialSyncService.syncAccount(ctx, accountId, actor_id),
    );
    await this.auditService.log({
      tenant_id: ctx.tenant_id,
      user_id: actor_id,
      module: "marketing",
      action: "MANUAL_SYNC",
      entity_type: "ACCOUNT",
      entity_id: accountId,
      metadata: { dataPoints: result.dataPoints },
    });
    return result;
  }

  async getAttribution(ctx: TenantScope) {
    return this.repository.getAttribution(ctx);
  }

  async getAlerts(ctx: TenantScope) {
    return this.repository.getAlerts(ctx);
  }

  async acknowledgeAlert(ctx: TenantScope, alertId: string) {
    return this.repository.acknowledgeAlert(ctx, alertId);
  }

  async runHealthSweep(ctx: TenantScope, actor_id: string) {
    const findings = await this.repository.runHealthSweep(ctx, actor_id);
    await this.auditService.log({ tenant_id: ctx.tenant_id ,
      user_id: actor_id,
      module: "marketing",
      action: "RUN_HEALTH_SWEEP",
      entity_type: "SYSTEM",
      entity_id: "marketing-health",
      metadata: { findingsCount: findings.length },
    });
    return findings;
  }

  async getAuditEvents(ctx: TenantScope) {
    return this.repository.getAuditEvents(ctx);
  }

  async getFunnels(ctx: TenantScope) {
    return this.repository.getFunnels(ctx);
  }

  async createFunnel(ctx: TenantScope, data: any, actor_id: string) {
    const funnel = await this.repository.createFunnel(ctx, data);
    await this.auditService.log({
      tenant_id: ctx.tenant_id,
      user_id: actor_id,
      module: "marketing",
      action: "CREATE",
      entity_type: "FUNNEL",
      entity_id: funnel.id,
      metadata: { name: data.name },
    });
    return funnel;
  }

  async updateFunnel(ctx: TenantScope, id: string, data: any, actor_id: string) {
    const funnel = await this.repository.updateFunnel(ctx, id, data);
    await this.auditService.log({
      tenant_id: ctx.tenant_id,
      user_id: actor_id,
      module: "marketing",
      action: "UPDATE",
      entity_type: "FUNNEL",
      entity_id: id,
      metadata: { name: data.name, status: data.status },
    });
    return funnel;
  }

  async getCreativeAssets(ctx: TenantScope) {
    return this.repository.getCreativeAssets(ctx);
  }

  async createCreativeAsset(ctx: TenantScope, data: any, actor_id: string) {
    // Register the asset record, its Audit_Trail entry and its Integration_Log
    // outbox event in ONE Atomic_Operation so they commit or roll back together
    // (Req 11.7, 4.1, 4.2, 4.4, 6.5). This path registers an asset whose blob is
    // already addressable via an external `url`, so there is no local blob to
    // compensate; the orphan-free guarantee for uploaded blobs is enforced by
    // {@link uploadCreativeAsset}.
    return this.registerCreativeAsset(ctx, data, actor_id);
  }

  /**
   * Atomic creative-asset upload (Req 11.7, 11.8).
   *
   * The asset blob is stored on a non-transactional blob store (local disk via
   * the controller's upload interceptor) BEFORE this method runs, so the store
   * and the DB write cannot share a single database transaction. To still
   * guarantee that "no orphaned asset or record remains on failure", the DB
   * record is registered inside an Atomic_Operation and a compensating action
   * (`compensateBlob`) deletes the already-stored blob if that transaction rolls
   * back. The two outcomes are therefore:
   *
   *   - success: blob stored AND record registered (audit + outbox committed); or
   *   - failure: the transaction rolls back (no record, no audit, no outbox) and
   *     the stored blob is deleted — leaving neither an orphaned blob nor an
   *     orphaned record (Req 11.8).
   *
   * If the blob store itself fails the controller's interceptor rejects before
   * this method is reached, so no DB record is ever created.
   */
  async uploadCreativeAsset(
    ctx: TenantScope,
    data: any,
    actor_id: string,
    compensateBlob?: () => void | Promise<void>,
  ) {
    try {
      return await this.registerCreativeAsset(ctx, data, actor_id);
    } catch (err) {
      // DB registration (or its audit/outbox) failed and rolled back, so no
      // record was persisted. Delete the stored blob so it is not orphaned
      // (Req 11.8). A cleanup failure must not mask the original error.
      if (compensateBlob) {
        try {
          await compensateBlob();
        } catch (cleanupErr) {
          this.logger.error(
            `Failed to clean up orphaned creative-asset blob after a failed ` +
              `registration: ${
                cleanupErr instanceof Error ? cleanupErr.message : String(cleanupErr)
              }`,
          );
        }
      }
      throw err;
    }
  }

  /**
   * Register a creative-asset record together with its Audit_Trail entry and
   * Integration_Log outbox event in a single Atomic_Operation.
   */
  private async registerCreativeAsset(ctx: TenantScope, data: any, actor_id: string) {
    return this.atomic.run(async ({ tx, audit, outbox }) => {
      const asset = await this.repository.createCreativeAsset(ctx, data, tx);
      await audit({
        tenant_id: ctx.tenant_id,
        user_id: actor_id,
        module: "marketing",
        action: "CREATE",
        entity_type: "CREATIVE_ASSET",
        entity_id: asset.id,
        metadata: { name: data.name, type: data.type },
      });
      await outbox({
        tenant_id: ctx.tenant_id,
        type: "marketing.creative_asset.created.v1",
        payload: { asset_id: asset.id, name: data.name, type: data.type },
        company_id: ctx.company_id,
      });
      return asset;
    });
  }

  async updateCreativeAsset(ctx: TenantScope, id: string, data: any, actor_id: string) {
    const asset = await this.repository.updateCreativeAsset(ctx, id, data);
    await this.auditService.log({
      tenant_id: ctx.tenant_id,
      user_id: actor_id,
      module: "marketing",
      action: "UPDATE",
      entity_type: "CREATIVE_ASSET",
      entity_id: id,
      metadata: { name: data.name, type: data.type },
    });
    return asset;
  }
}
