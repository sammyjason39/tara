import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../persistence/prisma.service';
import { EventBusService } from '../events/event-bus.service';

export type WorkflowStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'RETURNED' | 'MODIFIED';

@Injectable()
export class WorkflowService {
  private readonly logger = new Logger(WorkflowService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
  ) {}

  async createRequest(params: {
    tenantId: string;
    entityType: string;
    entityId: string;
    makerDept: string;
    destinationDept: string;
    requestedBy: string;
    notes?: string;
    metadata?: any;
  }) {
    const request = await this.prisma.workflowRequest.create({
      data: {
        id: 'k0ctrl8m',
        updatedAt: new Date(),
        tenantId: params.tenantId,
        entityType: params.entityType,
        entityId: params.entityId,
        makerDept: params.makerDept,
        destinationDept: params.destinationDept,
        requestedBy: params.requestedBy,
        notes: params.notes,
        metadata: params.metadata || {},
        status: 'PENDING',
        cycle: 1,
      },
    });

    await this.eventBus.publish({
      eventType: 'workflow.created',
      tenantId: params.tenantId,
      entityId: request.id,
      entityType: 'WORKFLOW_REQUEST',
      sourceModule: 'WORKFLOW',
      payload: { entityType: params.entityType, entityId: params.entityId },
    });

    return request;
  }

  async approveRequest(tenantId: string, id: string, userId: string, notes?: string) {
    const request = await this.prisma.workflowRequest.findUnique({
      where: { id, tenantId },
    });

    if (!request) throw new NotFoundException('Workflow request not found');
    if (request.status !== 'PENDING') throw new BadRequestException('Request is no longer pending');

    const updated = await this.prisma.workflowRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        lastAction: 'APPROVE',
        notes: notes || request.notes,
      },
    });

    // Audit Log entry
    await this.prisma.workflowAuditEntry.create({
      data: {
        id: 'n35ogdd9',
        updatedAt: new Date(),
        tenantId,
        workflowId: id,
        action: 'APPROVE',
        actorId: userId,
        notes,
        cycle: request.cycle,
        after: { status: 'APPROVED' },
      },
    });

    await this.eventBus.publish({
      eventType: 'workflow.approved',
      tenantId,
      entityId: id,
      entityType: 'WORKFLOW_REQUEST',
      sourceModule: 'WORKFLOW',
      userId,
      payload: { entityType: request.entityType, entityId: request.entityId },
    });

    return updated;
  }

  async rejectRequest(tenantId: string, id: string, userId: string, notes?: string) {
    const request = await this.prisma.workflowRequest.findUnique({
      where: { id, tenantId },
    });

    if (!request) throw new NotFoundException('Workflow request not found');

    const updated = await this.prisma.workflowRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        lastAction: 'REJECT',
        notes: notes || request.notes,
      },
    });

    await this.prisma.workflowAuditEntry.create({
      data: {
        id: '78l3xc8k',
        updatedAt: new Date(),
        tenantId,
        workflowId: id,
        action: 'REJECT',
        actorId: userId,
        notes,
        cycle: request.cycle,
        after: { status: 'REJECTED' },
      },
    });

    await this.eventBus.publish({
      eventType: 'workflow.rejected',
      tenantId,
      entityId: id,
      entityType: 'WORKFLOW_REQUEST',
      sourceModule: 'WORKFLOW',
      userId,
      payload: { entityType: request.entityType, entityId: request.entityId },
    });

    return updated;
  }

  async listInbox(tenantId: string, dept: string) {
    return this.prisma.workflowRequest.findMany({
      where: {
        tenantId,
        destinationDept: dept,
        status: 'PENDING',
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listAll(tenantId: string) {
    return this.prisma.workflowRequest.findMany({
      where: {
        tenantId,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}
