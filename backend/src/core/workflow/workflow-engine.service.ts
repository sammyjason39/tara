import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../persistence/prisma.service';
import type { TaraEvent } from '../hr/services/event-bus.service';
import { WorkflowDefinitionService } from './workflow-definition.service';
import { WorkflowNodeExecutorService } from './workflow-node-executor.service';
import { WorkflowContextService } from './workflow-context.service';
import type {
  WorkflowExecutionContext,
  WorkflowGraph,
  WorkflowNode,
  WorkflowRunResult,
  WorkflowStepLog,
  WorkflowTestRunOptions,
} from './workflow.types';
import { evaluateCondition, evaluateConditionGroup, renderTemplate } from './workflow-expression.util';

@Injectable()
export class WorkflowEngineService implements OnModuleInit {
  private readonly logger = new Logger(WorkflowEngineService.name);
  private workflowCache: Map<string, Array<{ id: string; graph: WorkflowGraph; name: string }>> = new Map();
  private cacheLoadedAt = 0;
  private readonly CACHE_TTL_MS = 30_000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly definitionService: WorkflowDefinitionService,
    private readonly nodeExecutor: WorkflowNodeExecutorService,
    private readonly contextService: WorkflowContextService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  onModuleInit(): void {
    this.eventEmitter.onAny((eventName: string | string[], payload: TaraEvent) => {
      const name = Array.isArray(eventName) ? eventName.join('.') : eventName;
      if (!name || name.startsWith('workflow.')) return;
      if (!payload?.event_type) return;
      void this.handleEvent(payload).catch((err) => {
        this.logger.error(`Workflow engine failed for ${name}: ${err.message}`, err.stack);
      });
    });
    this.logger.log('Workflow engine listening to all domain events');
  }

  async handleEvent(event: TaraEvent): Promise<void> {
    if (process.env.WORKFLOW_ENGINE_ENABLED === 'false') return;

    const workflows = await this.getWorkflowsForEvent(event.event_type);
    if (workflows.length === 0) return;

    await Promise.all(
      workflows.map((workflow) =>
        this.runWorkflow(workflow.id, workflow.name, workflow.graph, event, {
          triggerEventId: event.event_id,
          isTest: false,
        }),
      ),
    );
  }

  async runWorkflowById(
    workflowId: string,
    options?: WorkflowTestRunOptions,
  ): Promise<WorkflowRunResult> {
    const workflow = await this.definitionService.getById(workflowId);
    const event = this.buildSampleEvent(workflow.trigger_event, options);
    return this.runWorkflow(workflow.id, workflow.name, workflow.graph as WorkflowGraph, event, {
      isTest: true,
    });
  }

  private async runWorkflow(
    workflowId: string,
    workflowName: string,
    graph: WorkflowGraph,
    event: TaraEvent,
    options: { triggerEventId?: string; isTest?: boolean } = {},
  ): Promise<WorkflowRunResult> {
    const execution = await this.prisma.workflowExecution.create({
      data: {
        workflow_id: workflowId,
        trigger_event_id: options.triggerEventId ?? null,
        is_test: options.isTest ?? false,
        status: 'running',
        context: event as any,
        steps_log: [],
      },
    });

    const context: WorkflowExecutionContext = {
      event,
      variables: {},
    };

    const exprContext = await this.contextService.enrich(event, context.variables);

    const steps: WorkflowStepLog[] = [];
    const triggerNode = graph.nodes.find((n) => n.type === 'trigger');
    if (!triggerNode) {
      await this.finishExecution(execution.id, 'failed', steps, 'Workflow missing trigger node');
      return {
        execution_id: execution.id,
        steps,
        status: 'failed',
        error: 'Workflow missing trigger node',
      };
    }

    try {
      const visited = new Set<string>();
      const queue: string[] = [triggerNode.id];

      while (queue.length > 0) {
        const nodeId = queue.shift()!;
        if (visited.has(nodeId)) continue;
        visited.add(nodeId);

        const node = graph.nodes.find((n) => n.id === nodeId);
        if (!node) continue;

        if (node.type === 'trigger') {
          steps.push(this.step(node, 'completed', `Triggered by ${event.event_type}`));
          this.enqueueNext(graph, node.id, queue, 'default');
          continue;
        }

        if (node.type === 'condition') {
          const passed = this.evaluateNodeCondition(exprContext, node);
          const detail = node.data.rules?.length
            ? `condition ${node.data.match ?? 'all'}: ${passed ? 'true' : 'false'} (${node.data.rules.length} rules)`
            : passed
              ? 'condition true'
              : 'condition false';
          steps.push(this.step(node, 'completed', detail));
          this.enqueueNext(graph, node.id, queue, passed ? 'true' : 'false');
          continue;
        }

        if (node.type === 'action') {
          if (node.data.actionType === 'set_variable') {
            const key = String(node.data.config?.key ?? '');
            const raw = String(node.data.config?.value ?? '');
            if (key) {
              context.variables[key] = renderTemplate(raw, { ...exprContext, variables: context.variables });
              exprContext.variables = context.variables;
            }
            steps.push(this.step(node, 'completed', key ? `set variables.${key}` : 'skipped: no key'));
            this.enqueueNext(graph, node.id, queue, 'default');
            continue;
          }

          try {
            const detail = await this.nodeExecutor.executeAction(node, context, exprContext);
            steps.push(this.step(node, 'completed', detail));
            this.enqueueNext(graph, node.id, queue, 'default');
          } catch (err: any) {
            steps.push(this.step(node, 'failed', err.message));
            throw err;
          }
        }
      }

      await this.finishExecution(execution.id, 'completed', steps);
      this.logger.log(`Workflow "${workflowName}" completed (${steps.length} steps)`);
      return { execution_id: execution.id, steps, status: 'completed' };
    } catch (err: any) {
      await this.finishExecution(execution.id, 'failed', steps, err.message);
      if (options.isTest) {
        return { execution_id: execution.id, steps, status: 'failed', error: err.message };
      }
      throw err;
    }
  }

  private evaluateNodeCondition(
    exprContext: Record<string, unknown>,
    node: WorkflowNode,
  ): boolean {
    if (node.data.rules && node.data.rules.length > 0) {
      return evaluateConditionGroup(
        exprContext,
        node.data.rules,
        node.data.match ?? 'all',
      );
    }
    return evaluateCondition(
      exprContext,
      node.data.field ?? '',
      node.data.operator,
      node.data.value,
    );
  }

  private enqueueNext(
    graph: WorkflowGraph,
    nodeId: string,
    queue: string[],
    handle: 'true' | 'false' | 'default',
  ): void {
    const edges = graph.edges.filter((e) => e.source === nodeId);
    const preferred = edges.filter((e) => (e.sourceHandle ?? 'default') === handle);
    const targets = (preferred.length > 0 ? preferred : edges).map((e) => e.target);
    for (const target of targets) {
      if (!queue.includes(target)) queue.push(target);
    }
  }

  private step(
    node: WorkflowNode,
    status: WorkflowStepLog['status'],
    detail?: string,
  ): WorkflowStepLog {
    return {
      node_id: node.id,
      node_type: node.type,
      label: node.data.label,
      status,
      detail,
      at: new Date().toISOString(),
    };
  }

  private async finishExecution(
    executionId: string,
    status: string,
    steps: WorkflowStepLog[],
    error?: string,
  ): Promise<void> {
    await this.prisma.workflowExecution.update({
      where: { id: executionId },
      data: {
        status,
        steps_log: steps as any,
        error: error ?? null,
        completed_at: new Date(),
      },
    });
  }

  private async getWorkflowsForEvent(eventType: string) {
    const now = Date.now();
    if (now - this.cacheLoadedAt > this.CACHE_TTL_MS) {
      const rows = await this.prisma.workflowDefinition.findMany({
        where: {
          is_active: true,
          trigger_event: { not: null },
          published_graph: { not: null },
        },
        select: { id: true, name: true, trigger_event: true, published_graph: true },
      });
      this.workflowCache = new Map();
      for (const row of rows) {
        const key = row.trigger_event!;
        const list = this.workflowCache.get(key) ?? [];
        list.push({
          id: row.id,
          name: row.name,
          graph: row.published_graph as unknown as WorkflowGraph,
        });
        this.workflowCache.set(key, list);
      }
      this.cacheLoadedAt = now;
    }
    return this.workflowCache.get(eventType) ?? [];
  }

  invalidateCache(): void {
    this.cacheLoadedAt = 0;
    this.workflowCache.clear();
  }

  private buildSampleEvent(
    triggerEvent: string | null,
    options?: WorkflowTestRunOptions,
  ): TaraEvent {
    const override = options?.event;
    const payload: Record<string, unknown> = {
      ...(override?.payload as Record<string, unknown> | undefined),
    };

    if (options?.employee_id) {
      payload.employee_id = options.employee_id;
    }
    if (options?.phone) {
      payload.sender_phone = options.phone;
      payload.from = options.phone;
    }

    const actor =
      override?.actor ??
      (options?.actor_employee_id
        ? { id: options.actor_employee_id, type: 'employee' as const }
        : options?.employee_id
          ? { id: options.employee_id, type: 'employee' as const }
          : { id: 'system', type: 'system' as const });

    return {
      event_id: override?.event_id ?? `test-${Date.now()}`,
      event_type: override?.event_type ?? triggerEvent ?? 'test.event',
      event_version: override?.event_version ?? '1.0',
      event_timestamp: override?.event_timestamp ?? new Date(),
      actor,
      entity: override?.entity ?? { id: 'test-entity', type: 'test' },
      payload,
      metadata: {
        source: 'workflow_test',
        ...(options?.phone ? { test_phone: options.phone } : {}),
        ...(override?.metadata ?? {}),
      },
    };
  }
}
