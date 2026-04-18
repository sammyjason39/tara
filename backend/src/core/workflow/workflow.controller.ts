import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { WorkflowOrchestratorService } from './workflow-orchestrator.service';

@Controller('workflow')
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowOrchestratorService) {}

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
}
