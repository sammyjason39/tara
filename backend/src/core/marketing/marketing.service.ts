import { Injectable } from '@nestjs/common';
import { CaptureLeadDto } from './dto/capture-lead.dto';
import { ConnectAccountDto } from './dto/connect-account.dto';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { RunExecutionDto } from './dto/run-execution.dto';
import { ScheduleExecutionDto } from './dto/schedule-execution.dto';
import { UpdateAccountStatusDto } from './dto/update-account-status.dto';
import { UpdateCampaignStatusDto } from './dto/update-campaign-status.dto';
import { UpdateWorkflowStatusDto } from './dto/update-workflow-status.dto';
import { IMarketingRepository } from './repositories/marketing.repository.interface';

@Injectable()
export class MarketingService {
  constructor(private readonly repository: IMarketingRepository) {}

  async getDashboard(tenantId: string) {
    return this.repository.getDashboard(tenantId);
  }

  async getChannelPerformance(tenantId: string) {
    return this.repository.getChannelPerformance(tenantId);
  }

  async getCampaigns(tenantId: string) {
    return this.repository.getCampaigns(tenantId);
  }

  async createCampaign(tenantId: string, dto: CreateCampaignDto, actorId: string) {
    return this.repository.createCampaign(tenantId, dto, actorId);
  }

  async updateCampaignStatus(
    tenantId: string,
    campaignId: string,
    dto: UpdateCampaignStatusDto,
    actorId: string,
  ) {
    return this.repository.updateCampaignStatus(tenantId, campaignId, dto, actorId);
  }

  async getExecutions(tenantId: string) {
    return this.repository.getExecutions(tenantId);
  }

  async scheduleExecution(tenantId: string, dto: ScheduleExecutionDto, actorId: string) {
    return this.repository.scheduleExecution(tenantId, dto, actorId);
  }

  async runExecution(
    tenantId: string,
    executionId: string,
    dto: RunExecutionDto,
    actorId: string,
  ) {
    return this.repository.runExecution(tenantId, executionId, dto, actorId);
  }

  async getLeads(tenantId: string) {
    return this.repository.getLeads(tenantId);
  }

  async captureLead(tenantId: string, dto: CaptureLeadDto, actorId: string) {
    return this.repository.captureLead(tenantId, dto, actorId);
  }

  async markLeadHandoffReady(tenantId: string, leadId: string, actorId: string) {
    return this.repository.markLeadHandoffReady(tenantId, leadId, actorId);
  }

  async handoffLeadToSales(tenantId: string, leadId: string, actorId: string) {
    return this.repository.handoffLeadToSales(tenantId, leadId, actorId);
  }

  async getWorkflows(tenantId: string) {
    return this.repository.getWorkflows(tenantId);
  }

  async createWorkflow(tenantId: string, dto: CreateWorkflowDto, actorId: string) {
    return this.repository.createWorkflow(tenantId, dto, actorId);
  }

  async updateWorkflowStatus(
    tenantId: string,
    workflowId: string,
    dto: UpdateWorkflowStatusDto,
    actorId: string,
  ) {
    return this.repository.updateWorkflowStatus(tenantId, workflowId, dto, actorId);
  }

  async getConnectedAccounts(tenantId: string) {
    return this.repository.getConnectedAccounts(tenantId);
  }

  async connectAccount(tenantId: string, dto: ConnectAccountDto, actorId: string) {
    return this.repository.connectAccount(tenantId, dto, actorId);
  }

  async updateAccountStatus(
    tenantId: string,
    accountId: string,
    dto: UpdateAccountStatusDto,
    actorId: string,
  ) {
    return this.repository.updateAccountStatus(tenantId, accountId, dto, actorId);
  }

  async getAttribution(tenantId: string) {
    return this.repository.getAttribution(tenantId);
  }

  async getAlerts(tenantId: string) {
    return this.repository.getAlerts(tenantId);
  }

  async acknowledgeAlert(tenantId: string, alertId: string) {
    return this.repository.acknowledgeAlert(tenantId, alertId);
  }

  async runHealthSweep(tenantId: string, actorId: string) {
    return this.repository.runHealthSweep(tenantId, actorId);
  }

  async getAuditEvents(tenantId: string) {
    return this.repository.getAuditEvents(tenantId);
  }
}

