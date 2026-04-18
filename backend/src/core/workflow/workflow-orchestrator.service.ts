import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { EventBusService } from '../../shared/events/event-bus.service';
import { PrismaService } from '../../persistence/prisma.service';
import { WorkflowController } from './workflow.controller';

@Injectable()
export class WorkflowOrchestratorService implements OnModuleInit {
  private readonly logger = new Logger(WorkflowOrchestratorService.name);

  constructor(
    private readonly eventBus: EventBusService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    await this.ensureDefinitionsExist();
    this.registerWorkflowListeners();
  }

  private async ensureDefinitionsExist() {
    const tenants = await this.prisma.companies.findMany({ select: { id: true } });
    for (const tenant of tenants) {
      await this.prisma.workflow_definitions.upsert({
        where: { 
          tenant_id_name_version: {
            tenant_id: tenant.id,
            name: 'RETAIL_SALE_FLOW',
            version: 1,
          }
        },
        create: {
          id: uuidv4(),
          updated_at: new Date(),
          tenant_id: tenant.id,
          name: 'RETAIL_SALE_FLOW',
          version: 1,
          steps: [
            { event: 'RETAIL_SALE_COMPLETED', state: 'SALE_COMPLETED', order: 1 },
            { event: 'STOCK_MOVEMENT_CREATED', state: 'STOCK_MOVED', order: 2 },
            { event: 'JOURNAL_ENTRY_CREATED', state: 'LEDGER_POSTED', order: 3, isFinal: true },
          ] as any,
        },
        update: {
          steps: [
            { event: 'RETAIL_SALE_COMPLETED', state: 'SALE_COMPLETED', order: 1 },
            { event: 'STOCK_MOVEMENT_CREATED', state: 'STOCK_MOVED', order: 2 },
            { event: 'JOURNAL_ENTRY_CREATED', state: 'LEDGER_POSTED', order: 3, isFinal: true },
          ] as any,
        }
      });
    }
  }

  private registerWorkflowListeners() {
    // RETAIL_SALE_FLOW tracker
    this.eventBus.subscribe('RETAIL_SALE_COMPLETED', 'workflow-retail-init', async (event) => {
      if (event.correlation_id) {
        await this.initiateWorkflow(event.correlation_id, 'RETAIL_SALE_COMPLETED', event.tenant_id, event.payload, 'RETAIL_SALE_FLOW', event.id);
      }
    });

    this.eventBus.subscribe('STOCK_MOVEMENT_CREATED', 'workflow-retail-stock', async (event) => {
      if (event.correlation_id) {
        await this.processStep(event.correlation_id, 'STOCK_MOVEMENT_CREATED', event.tenant_id, event.payload, event.id, 'workflow-retail-stock');
      }
    });

    this.eventBus.subscribe('JOURNAL_ENTRY_CREATED', 'workflow-retail-ledger', async (event) => {
      if (event.correlation_id) {
        await this.processStep(event.correlation_id, 'JOURNAL_ENTRY_CREATED', event.tenant_id, event.payload, event.id, 'workflow-retail-ledger');
      }
    });

    // Failure listener
    this.eventBus.subscribe('WORKFLOW_STEP_FAILED', 'workflow-failure-handler', async (event) => {
      if (event.correlation_id) {
        await this.handleWorkflowFailure(event.correlation_id, event.payload.error, event.payload.originalEventType, event.id);
      }
    });
  }

  private async initiateWorkflow(correlation_id: string, event_type: string, tenant_id: string, payload: any, workflowName: string, eventId?: string) {
    if (!correlation_id) return;

    this.logger.log(`Initiating workflow ${workflowName} for correlation_id: ${correlation_id}`);

    const definition = await this.prisma.workflow_definitions.findFirst({
      where: { name: workflowName, tenant_id: tenant_id, active: true }
    });

    if (!definition) {
      this.logger.warn(`Active workflow definition ${workflowName} not found for tenant ${tenant_id}`);
      return;
    }

    const steps = definition.steps as any[];
    const firstStep = steps.find(s => s.event === event_type && s.order === 1);

    if (!firstStep) {
      this.logger.error(`Event ${event_type} is not the valid trigger for workflow ${workflowName}`);
      return;
    }

    await this.prisma.workflow_instances.upsert({
      where: { correlation_id: correlation_id },
      create: {
        id: uuidv4(),
        updated_at: new Date(),
        tenant_id: tenant_id,
        workflow_definition_id: definition.id,
        correlation_id,
        root_event_id: eventId,
        status: 'IN_PROGRESS',
        current_state: firstStep.state,
        context: payload,
        steps_executed: [
          { event_type, status: 'DONE', timestamp: new Date(), eventId }
        ] as any,
      },
      update: {
        status: 'IN_PROGRESS',
        current_state: firstStep.state,
        root_event_id: eventId,
        context: payload,
        steps_executed: [
          { event_type, status: 'DONE', timestamp: new Date(), eventId }
        ] as any,
      }
    });
  }

  private async processStep(correlation_id: string, event_type: string, tenant_id: string, payload: any, eventId?: string, handlerName?: string) {
    if (!correlation_id) return;

    const instance = await this.prisma.workflow_instances.findUnique({
      where: { correlation_id: correlation_id },
      include: { workflow_definitions: true }
    });

    if (!instance || instance.status !== 'IN_PROGRESS') {
      return;
    }

    const validation = await this.validateTransition(instance, event_type);
    if (!validation.valid) {
      this.logger.error(`Workflow Violation [${instance.correlation_id}]: ${validation.error}`);
      return;
    }

    const nextStep = validation.step;
    const stepsExecuted = (instance.steps_executed as any[]) || [];
    stepsExecuted.push({ event_type, status: 'DONE', timestamp: new Date(), eventId, handlerName });

    await this.prisma.workflow_instances.update({
      where: { id: instance.id },
      data: {
        current_state: nextStep.state,
        status: nextStep.isFinal ? 'COMPLETED' : 'IN_PROGRESS',
        steps_executed: stepsExecuted as any,
        context: { ...(instance.context as any || {}), ...payload }
      }
    });

    this.logger.log(`Workflow Step [${correlation_id}]: Transitioned to ${nextStep.state} (${nextStep.isFinal ? 'COMPLETED' : 'IN_PROGRESS'})`);
  }

  private async validateTransition(instance: any, event_type: string): Promise<{ valid: boolean; step?: any; error?: string }> {
    const steps = instance.workflowDefinition.steps as any[];
    const currentStep = steps.find(s => s.state === instance.current_state);
    
    if (!currentStep) {
      return { valid: false, error: `Current state ${instance.current_state} not found in definition` };
    }

    const nextStep = steps.find(s => s.order === currentStep.order + 1);

    if (!nextStep) {
      return { valid: false, error: `No next step defined after ${instance.currentState}` };
    }

    if (nextStep.event !== event_type) {
      return { valid: false, error: `Unexpected event. Expected ${nextStep.event}, got ${event_type}` };
    }

    return { valid: true, step: nextStep };
  }

  private async handleWorkflowFailure(correlation_id: string, error: string, event_type: string, eventId?: string) {
    if (!correlation_id) return;

    const instance = await this.prisma.workflow_instances.findUnique({
      where: { correlation_id: correlation_id }
    });

    if (!instance || instance.status === 'COMPLETED' || instance.status === 'FAILED') {
      return;
    }

    const stepsExecuted = (instance.steps_executed as any[]) || [];
    stepsExecuted.push({ event_type, status: 'FAILED', timestamp: new Date(), error, eventId });

    await this.prisma.workflow_instances.update({
      where: { id: instance.id },
      data: {
        status: 'FAILED',
        failure_at: new Date(),
        failure_reason: error,
        steps_executed: stepsExecuted as any,
      }
    });
  }

  // Public Query API
  async getWorkflowInstance(correlation_id: string) {
    return this.prisma.workflow_instances.findUnique({
      where: { correlation_id: correlation_id },
      include: { workflow_definitions: true }
    });
  }

  async getWorkflowSteps(correlation_id: string) {
    const instance = await this.prisma.workflow_instances.findUnique({
      where: { correlation_id: correlation_id }
    });
    return instance?.steps_executed || [];
  }

  async getWorkflowWithEvents(correlation_id: string) {
    const instance = await this.prisma.workflow_instances.findUnique({
      where: { correlation_id: correlation_id },
      include: { workflow_definitions: true }
    });

    if (!instance) return null;

    const eventChain = await this.eventBus.getEventChain(correlation_id);

    return {
      workflow: instance,
      eventChain,
    };
  }
}
