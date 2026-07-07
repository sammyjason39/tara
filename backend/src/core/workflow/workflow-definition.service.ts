import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../persistence/prisma.service';
import type { WorkflowGraph } from './workflow.types';
import { extractTriggerEventFromGraph, hasUnpublishedChanges } from './workflow-graph.util';

export type WorkflowDto = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  trigger_event: string | null;
  is_active: boolean;
  is_system: boolean;
  version: number;
  graph: WorkflowGraph;
  published_graph: WorkflowGraph | null;
  published_at: Date | null;
  created_at: Date;
  updated_at: Date;
  updated_by: string | null;
  is_published: boolean;
  has_unpublished_changes: boolean;
};

@Injectable()
export class WorkflowDefinitionService {
  constructor(private readonly prisma: PrismaService) {}

  private toDto(row: any): WorkflowDto {
    const graph = row.graph as WorkflowGraph;
    const publishedGraph = (row.published_graph as WorkflowGraph | null) ?? null;
    return {
      ...row,
      graph,
      published_graph: publishedGraph,
      is_published: publishedGraph != null,
      has_unpublished_changes: hasUnpublishedChanges(
        graph,
        publishedGraph,
        row.published_at,
        row.updated_at,
      ),
    };
  }

  async list(filters?: { category?: string; is_active?: boolean }) {
    const rows = await this.prisma.workflowDefinition.findMany({
      where: {
        ...(filters?.category ? { category: filters.category } : {}),
        ...(filters?.is_active !== undefined ? { is_active: filters.is_active } : {}),
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
    return rows.map((row) => this.toDto(row));
  }

  async getById(id: string) {
    const row = await this.prisma.workflowDefinition.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Workflow tidak ditemukan');
    return this.toDto(row);
  }

  async getBySlug(slug: string) {
    const row = await this.prisma.workflowDefinition.findUnique({ where: { slug } });
    if (!row) throw new NotFoundException('Workflow tidak ditemukan');
    return this.toDto(row);
  }

  async create(data: {
    slug: string;
    name: string;
    description?: string;
    category: string;
    trigger_event?: string;
    graph: WorkflowGraph;
    is_active?: boolean;
    updated_by?: string;
  }) {
    const triggerEvent = data.trigger_event ?? extractTriggerEventFromGraph(data.graph);
    const row = await this.prisma.workflowDefinition.create({
      data: {
        slug: data.slug,
        name: data.name,
        description: data.description ?? null,
        category: data.category,
        trigger_event: triggerEvent ?? null,
        graph: data.graph as any,
        is_active: false,
        is_system: false,
        updated_by: data.updated_by ?? null,
      },
    });
    return this.toDto(row);
  }

  async update(
    id: string,
    data: {
      name?: string;
      description?: string;
      category?: string;
      trigger_event?: string;
      graph?: WorkflowGraph;
      is_active?: boolean;
      updated_by?: string;
    },
  ) {
    const existing = await this.getById(id);
    const graph = data.graph ?? existing.graph;
    const triggerEvent =
      data.trigger_event ??
      (data.graph ? extractTriggerEventFromGraph(data.graph) : undefined);

    const row = await this.prisma.workflowDefinition.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.category !== undefined ? { category: data.category } : {}),
        ...(triggerEvent !== undefined ? { trigger_event: triggerEvent } : {}),
        ...(data.graph !== undefined ? { graph: data.graph as any, version: { increment: 1 } } : {}),
        ...(data.is_active !== undefined ? { is_active: data.is_active } : {}),
        updated_by: data.updated_by ?? null,
        updated_at: new Date(),
      },
    });
    return this.toDto(row);
  }

  async publish(id: string, updatedBy?: string) {
    const existing = await this.getById(id);
    const triggerEvent = extractTriggerEventFromGraph(existing.graph);
    const row = await this.prisma.workflowDefinition.update({
      where: { id },
      data: {
        published_graph: existing.graph as any,
        published_at: new Date(),
        trigger_event: triggerEvent,
        updated_by: updatedBy ?? null,
        updated_at: new Date(),
      },
    });
    return this.toDto(row);
  }

  async activate(id: string, updatedBy?: string) {
    const existing = await this.getById(id);
    if (!existing.published_graph) {
      throw new BadRequestException('Workflow harus di-publish terlebih dahulu sebelum diaktifkan');
    }
    const row = await this.prisma.workflowDefinition.update({
      where: { id },
      data: {
        is_active: true,
        updated_by: updatedBy ?? null,
        updated_at: new Date(),
      },
    });
    return this.toDto(row);
  }

  async deactivate(id: string, updatedBy?: string) {
    await this.getById(id);
    const row = await this.prisma.workflowDefinition.update({
      where: { id },
      data: {
        is_active: false,
        updated_by: updatedBy ?? null,
        updated_at: new Date(),
      },
    });
    return this.toDto(row);
  }

  async delete(id: string) {
    const row = await this.getById(id);
    if (row.is_system) {
      throw new Error('Workflow sistem tidak bisa dihapus — nonaktifkan saja');
    }
    await this.prisma.workflowDefinition.delete({ where: { id } });
  }

  async listExecutions(workflowId: string, limit = 20, isTest?: boolean) {
    return this.prisma.workflowExecution.findMany({
      where: {
        workflow_id: workflowId,
        ...(isTest !== undefined ? { is_test: isTest } : {}),
      },
      orderBy: { started_at: 'desc' },
      take: limit,
    });
  }

  async getExecution(workflowId: string, executionId: string) {
    const row = await this.prisma.workflowExecution.findFirst({
      where: { id: executionId, workflow_id: workflowId },
    });
    if (!row) throw new NotFoundException('Eksekusi workflow tidak ditemukan');
    return row;
  }
}
