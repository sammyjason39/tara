import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventBusService } from '../../shared/events/event-bus.service';
import { PrismaService } from '../../persistence/prisma.service';

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
    const tenants = await this.prisma.company.findMany({ select: { id: true } });
    for (const tenant of tenants) {
      await this.prisma.workflowDefinition.upsert({
        where: { 
          tenantId_name_version: {
            tenantId: tenant.id,
            name: 'RETAIL_SALE_FLOW',
            version: 1,
          }
        },
        create: {
          tenantId: tenant.id,
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
      if (event.correlationId) {
        await this.initiateWorkflow(event.correlationId, 'RETAIL_SALE_COMPLETED', event.tenantId, event.payload, 'RETAIL_SALE_FLOW', event.id);
      }
    });

    this.eventBus.subscribe('STOCK_MOVEMENT_CREATED', 'workflow-retail-stock', async (event) => {
      if (event.correlationId) {
        await this.processStep(event.correlationId, 'STOCK_MOVEMENT_CREATED', event.tenantId, event.payload, event.id, 'workflow-retail-stock');
      }
    });

    this.eventBus.subscribe('JOURNAL_ENTRY_CREATED', 'workflow-retail-ledger', async (event) => {
      if (event.correlationId) {
        await this.processStep(event.correlationId, 'JOURNAL_ENTRY_CREATED', event.tenantId, event.payload, event.id, 'workflow-retail-ledger');
      }
    });

    // Failure listener
    this.eventBus.subscribe('WORKFLOW_STEP_FAILED', 'workflow-failure-handler', async (event) => {
      if (event.correlationId) {
        await this.handleWorkflowFailure(event.correlationId, event.payload.error, event.payload.originalEventType, event.id);
      }
    });
  }

  private async initiateWorkflow(correlationId: string, eventType: string, tenantId: string, payload: any, workflowName: string, eventId?: string) {
    if (!correlationId) return;

    this.logger.log(`Initiating workflow ${workflowName} for correlationId: ${correlationId}`);

    const definition = await this.prisma.workflowDefinition.findFirst({
      where: { name: workflowName, tenantId, active: true }
    });

    if (!definition) {
      this.logger.warn(`Active workflow definition ${workflowName} not found for tenant ${tenantId}`);
      return;
    }

    const steps = definition.steps as any[];
    const firstStep = steps.find(s => s.event === eventType && s.order === 1);

    if (!firstStep) {
      this.logger.error(`Event ${eventType} is not the valid trigger for workflow ${workflowName}`);
      return;
    }

    await this.prisma.workflowInstance.upsert({
      where: { correlationId },
      create: {
        tenantId,
        workflowDefinitionId: definition.id,
        correlationId,
        rootEventId: eventId,
        status: 'IN_PROGRESS',
        currentState: firstStep.state,
        context: payload,
        stepsExecuted: [
          { eventType, status: 'DONE', timestamp: new Date(), eventId }
        ] as any,
      },
      update: {
        status: 'IN_PROGRESS',
        currentState: firstStep.state,
        rootEventId: eventId,
        context: payload,
        stepsExecuted: [
          { eventType, status: 'DONE', timestamp: new Date(), eventId }
        ] as any,
      }
    });
  }

  private async processStep(correlationId: string, eventType: string, tenantId: string, payload: any, eventId?: string, handlerName?: string) {
    if (!correlationId) return;

    const instance = await this.prisma.workflowInstance.findUnique({
      where: { correlationId },
      include: { workflowDefinition: true }
    });

    if (!instance || instance.status !== 'IN_PROGRESS') {
      return;
    }

    const validation = await this.validateTransition(instance, eventType);
    if (!validation.valid) {
      this.logger.error(`Workflow Violation [${instance.correlationId}]: ${validation.error}`);
      return;
    }

    const nextStep = validation.step;
    const stepsExecuted = (instance.stepsExecuted as any[]) || [];
    stepsExecuted.push({ eventType, status: 'DONE', timestamp: new Date(), eventId, handlerName });

    await this.prisma.workflowInstance.update({
      where: { id: instance.id },
      data: {
        currentState: nextStep.state,
        status: nextStep.isFinal ? 'COMPLETED' : 'IN_PROGRESS',
        stepsExecuted: stepsExecuted as any,
        context: { ...(instance.context as any || {}), ...payload }
      }
    });

    this.logger.log(`Workflow Step [${correlationId}]: Transitioned to ${nextStep.state} (${nextStep.isFinal ? 'COMPLETED' : 'IN_PROGRESS'})`);
  }

  private async validateTransition(instance: any, eventType: string): Promise<{ valid: boolean; step?: any; error?: string }> {
    const steps = instance.workflowDefinition.steps as any[];
    const currentStep = steps.find(s => s.state === instance.currentState);
    
    if (!currentStep) {
      return { valid: false, error: `Current state ${instance.currentState} not found in definition` };
    }

    const nextStep = steps.find(s => s.order === currentStep.order + 1);

    if (!nextStep) {
      return { valid: false, error: `No next step defined after ${instance.currentState}` };
    }

    if (nextStep.event !== eventType) {
      return { valid: false, error: `Unexpected event. Expected ${nextStep.event}, got ${eventType}` };
    }

    return { valid: true, step: nextStep };
  }

  private async handleWorkflowFailure(correlationId: string, error: string, eventType: string, eventId?: string) {
    if (!correlationId) return;

    const instance = await this.prisma.workflowInstance.findUnique({
      where: { correlationId }
    });

    if (!instance || instance.status === 'COMPLETED' || instance.status === 'FAILED') {
      return;
    }

    const stepsExecuted = (instance.stepsExecuted as any[]) || [];
    stepsExecuted.push({ eventType, status: 'FAILED', timestamp: new Date(), error, eventId });

    await this.prisma.workflowInstance.update({
      where: { id: instance.id },
      data: {
        status: 'FAILED',
        failureAt: new Date(),
        failureReason: error,
        stepsExecuted: stepsExecuted as any,
      }
    });
  }

  // Public Query API
  async getWorkflowInstance(correlationId: string) {
    return this.prisma.workflowInstance.findUnique({
      where: { correlationId },
      include: { workflowDefinition: true }
    });
  }

  async getWorkflowSteps(correlationId: string) {
    const instance = await this.prisma.workflowInstance.findUnique({
      where: { correlationId }
    });
    return instance?.stepsExecuted || [];
  }

  async getWorkflowWithEvents(correlationId: string) {
    const instance = await this.prisma.workflowInstance.findUnique({
      where: { correlationId },
      include: { workflowDefinition: true }
    });

    if (!instance) return null;

    const eventChain = await this.eventBus.getEventChain(correlationId);

    return {
      workflow: instance,
      eventChain,
    };
  }
}
