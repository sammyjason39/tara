import type { SessionContext } from "@/core/security/session";
import { audit } from "@/core/logging/audit";
import { notifications } from "@/core/runtime/events/notifications";
import { resolveDepartment } from "@/core/org/departmentResolver";
import { Roles } from "@/core/security/roles";
import { canApproveWorkflow } from "@/core/security/policy";
import {
  approveRequest,
  rejectRequest,
  modifyRequest,
  listWorkflows,
  listWorkflowAudit,
  createWorkflowRequest,
} from "@/core/tools/workflows/workflowEngine";
import type { WorkflowEntityType, WorkflowRequest } from "@/core/tools/workflows/workflowTypes";

export const workflowService = {
  createRequest(
    tenantId: string,
    session: SessionContext,
    input: {
      entityType: WorkflowEntityType;
      entityId: string;
      makerDept: string;
      destinationDept: string;
      notes?: string;
      metadata?: Record<string, string>;
    },
  ) {
    const request = createWorkflowRequest({
      tenantId,
      requestedBy: session.userId,
      makerDept: input.makerDept,
      destinationDept: input.destinationDept,
      entityType: input.entityType,
      entityId: input.entityId,
      notes: input.notes,
      metadata: input.metadata,
    });
    audit.log({
      tenantId,
      actorId: session.userId,
      action: "workflow.create",
      entityType: "workflow",
      entityId: request.id,
      after: { entityType: request.entityType, destinationDept: request.destinationDept },
    });
    notifications.emit(tenantId, {
      title: "Workflow created",
      message: `${request.entityType} request routed to ${request.destinationDept}`,
      type: "info",
    });
    return request;
  },

  listRequests(tenantId: string, filters?: { entityType?: WorkflowEntityType }) {
    return listWorkflows(tenantId, filters);
  },

  listInbox(
    tenantId: string,
    session: SessionContext,
    status?: "PENDING" | "APPROVED" | "REJECTED" | "RETURNED" | "MODIFIED",
  ) {
    const items = listWorkflows(tenantId, status ? { status } : undefined);
    if (
      session.role === Roles.SUPERADMIN ||
      session.role === Roles.OWNER ||
      session.role === Roles.COMPANY_ADMIN
    ) {
      return items;
    }

    const deptCode = resolveDepartment(session.departmentId)?.code ?? session.departmentId;
    return items.filter((flow) => {
      const deptMatch = flow.makerDept === deptCode || flow.destinationDept === deptCode;
      const userMatch = flow.requestedBy === session.userId;
      return deptMatch || userMatch || canApproveWorkflow(session, flow);
    });
  },

  approveRequest(tenantId: string, workflowId: string, session: SessionContext, notes?: string) {
    const updated = approveRequest(tenantId, workflowId, session, notes);
    audit.log({
      tenantId,
      actorId: session.userId,
      action: "workflow.approve",
      entityType: "workflow",
      entityId: workflowId,
      after: { status: updated.status },
    });
    notifications.emit(tenantId, {
      title: "Workflow approved",
      message: `Request ${workflowId} approved`,
      type: "success",
    });
    return updated;
  },

  rejectRequest(tenantId: string, workflowId: string, session: SessionContext, notes?: string) {
    const updated = rejectRequest(tenantId, workflowId, session, notes);
    audit.log({
      tenantId,
      actorId: session.userId,
      action: "workflow.reject",
      entityType: "workflow",
      entityId: workflowId,
      after: { status: updated.status },
    });
    notifications.emit(tenantId, {
      title: "Workflow rejected",
      message: `Request ${workflowId} rejected`,
      type: "warning",
    });
    return updated;
  },

  modifyRequest(tenantId: string, workflowId: string, session: SessionContext, notes?: string) {
    const updated = modifyRequest(tenantId, workflowId, session, notes);
    audit.log({
      tenantId,
      actorId: session.userId,
      action: "workflow.modify",
      entityType: "workflow",
      entityId: workflowId,
      after: { status: updated.status, cycle: updated.cycle },
    });
    notifications.emit(tenantId, {
      title: "Workflow returned",
      message: `Request ${workflowId} returned to maker`,
      type: "info",
    });
    return updated;
  },

  listAudit(tenantId: string, workflowId: string) {
    return listWorkflowAudit(tenantId, workflowId);
  },
};

export type { WorkflowRequest };
