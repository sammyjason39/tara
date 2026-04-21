import { Controller, Get, Param, Post, Body, Req, NotFoundException, UseInterceptors } from '@nestjs/common';
import { WorkflowOrchestratorService } from './workflow-orchestrator.service';
import { AutomationService } from '../../shared/automation/automation.service';
import { TenantInterceptor } from '../../gateway/tenant.interceptor';
import { TenantContext } from '../../gateway/tenant-context.interface';
import { Request } from 'express';

interface RequestWithTenant extends Request {
  tenantContext: TenantContext;
}

@Controller('v1/workflow')
@UseInterceptors(TenantInterceptor)
export class WorkflowController {
  constructor(
    private readonly workflowService: WorkflowOrchestratorService,
    private readonly automationService: AutomationService,
  ) {}

  @Get(':correlation_id')
  async getWorkflowInstance(@Param('correlation_id') correlation_id: string) {
    const instance = await this.workflowService.getWorkflowInstance(correlation_id);
    if (!instance) {
      throw new NotFoundException(`Workflow instance with correlation_id ${correlation_id} not found`);
    }
    return instance;
  }

  @Get(':correlation_id/steps')
  async getWorkflowSteps(@Param('correlation_id') correlation_id: string) {
    const steps = await this.workflowService.getWorkflowSteps(correlation_id);
    if (!steps) {
      throw new NotFoundException(`Steps for correlation_id ${correlation_id} not found`);
    }
    return steps;
  }

  @Get(':correlation_id/trace')
  async getWorkflowWithEvents(@Param('correlation_id') correlation_id: string) {
    const trace = await this.workflowService.getWorkflowWithEvents(correlation_id);
    if (!trace) {
      throw new NotFoundException(`Workflow trace for correlation_id ${correlation_id} not found`);
    }
    return trace;
  }

  /**
   * POST /v1/workflow/trigger/manual
   * Manually trigger an event-based workflow.
   */
  @Post('trigger/manual')
  async triggerManual(
    @Req() request: RequestWithTenant,
    @Body() body: { event_type: string, payload: any }
  ) {
    const { tenant_id, user_id } = request.tenantContext;
    return this.automationService.triggerManual(tenant_id, body, user_id || 'system');
  }
}
