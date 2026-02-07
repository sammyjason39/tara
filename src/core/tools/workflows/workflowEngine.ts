import type {
  WorkflowRequest,
  WorkflowStatus,
  WorkflowEntityType,
  WorkflowRouteGraph,
  WorkflowStep,
} from "./workflowTypes";
import { getRepo } from "@/core/persistence/repositoryRegistry";
import { appendAuditLog } from "./auditLogger";
import { emitActivity } from "@/core/activity/activityFeedService";
import { canApproveWorkflow } from "@/core/security/policy";
import type { SessionContext } from "@/core/security/session";

const createId = (prefix: string) =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? `${prefix}-${crypto.randomUUID()}`
    : `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

type WorkflowCreateInput = {
  tenantId: string;
  entityType: WorkflowEntityType;
  entityId: string;
  makerDept: string;
  destinationDept: string;
  requestedBy: string;
  notes?: string;
  metadata?: Record<string, string>;
  steps?: Array<{ label: string; dept: string }>;
};

const buildDefaultRoute = (
  makerDept: string,
  destinationDept: string,
  steps?: Array<{ label: string; dept: string }>,
): { route: WorkflowRouteGraph; stepList: WorkflowStep[] } => {
  const baseSteps = steps?.length
    ? steps
    : [
        { label: `${makerDept} Review`, dept: makerDept },
        { label: `${destinationDept} Approval`, dept: destinationDept },
      ];

  const stepList: WorkflowStep[] = baseSteps.map((step) => ({
    id: createId("step"),
    label: step.label,
    dept: step.dept,
    status: "PENDING",
  }));

  const nodes = stepList.map((step) => ({
    id: step.id,
    dept: step.dept,
    label: step.label,
  }));

  const edges = stepList.slice(0, -1).map((step, index) => ({
    from: step.id,
    to: stepList[index + 1].id,
  }));

  return {
    route: {
      nodes,
      edges,
      startNodeId: stepList[0]?.id ?? createId("node"),
      endNodeId: stepList[stepList.length - 1]?.id,
    },
    stepList,
  };
};

export function createWorkflowRequest(input: WorkflowCreateInput): WorkflowRequest {
  const now = new Date().toISOString();
  const { route, stepList } = buildDefaultRoute(
    input.makerDept,
    input.destinationDept,
    input.steps,
  );
  const request: WorkflowRequest = {
    id: createId("workflow"),
    tenantId: input.tenantId,
    entityType: input.entityType,
    entityId: input.entityId,
    makerDept: input.makerDept,
    destinationDept: stepList[0]?.dept ?? input.destinationDept,
    status: "PENDING",
    requestedBy: input.requestedBy,
    requestedAt: now,
    updatedAt: now,
    cycle: 1,
    steps: stepList,
    route,
    currentStepId: stepList[0]?.id ?? "",
    lastAction: "CREATE",
    notes: input.notes,
    metadata: input.metadata,
  };
  const repo = getRepo("workflow");
  repo.createWorkflow(input.tenantId, request);
  appendAuditLog({
    tenantId: input.tenantId,
    workflowId: request.id,
    action: "WORKFLOW_CREATED",
    actorId: input.requestedBy,
    actorRole: "SYSTEM",
    actorDept: input.makerDept,
    cycle: request.cycle,
    after: { status: request.status, destinationDept: request.destinationDept },
  });
  emitActivity({
    tenantId: input.tenantId,
    type: "WORKFLOW_CREATED",
    actorId: input.requestedBy,
    actorRole: "SYSTEM",
    entityId: request.id,
    entityType: request.entityType,
  });
  return request;
}

export function listWorkflows(
  tenantId: string,
  filters: Partial<{
    status: WorkflowStatus;
    entityType: WorkflowEntityType;
    destinationDept: string;
  }> = {},
): WorkflowRequest[] {
  const repo = getRepo("workflow");
  return repo.listWorkflows(tenantId).filter((flow) => {
    const matchStatus = filters.status ? flow.status === filters.status : true;
    const matchType = filters.entityType ? flow.entityType === filters.entityType : true;
    const matchDept = filters.destinationDept
      ? flow.destinationDept === filters.destinationDept
      : true;
    return matchStatus && matchType && matchDept;
  });
}

export function getWorkflow(
  tenantId: string,
  workflowId: string,
): WorkflowRequest | undefined {
  return getRepo("workflow").getWorkflow(tenantId, workflowId);
}

function updateWorkflow(
  tenantId: string,
  workflow: WorkflowRequest,
  status: WorkflowStatus,
  action: WorkflowRequest["lastAction"],
  updates: Partial<WorkflowRequest> = {},
): WorkflowRequest {
  const next: WorkflowRequest = {
    ...workflow,
    status,
    lastAction: action,
    updatedAt: new Date().toISOString(),
    ...updates,
  };
  return getRepo("workflow").updateWorkflow(tenantId, next);
}

const resolveNextStep = (workflow: WorkflowRequest) => {
  const currentIndex = workflow.steps.findIndex((step) => step.id === workflow.currentStepId);
  if (currentIndex === -1) return undefined;
  return workflow.steps[currentIndex + 1];
};

export function approveRequest(
  tenantId: string,
  workflowId: string,
  session: SessionContext,
  notes?: string,
): WorkflowRequest {
  const workflow = getRepo("workflow").getWorkflow(tenantId, workflowId);
  if (!workflow) {
    throw new Error("Workflow not found");
  }
  if (workflow.status !== "PENDING") {
    throw new Error("Workflow is not pending");
  }
  if (!canApproveWorkflow(session, workflow)) {
    throw new Error("Not authorized to approve workflow");
  }
  const updatedSteps: WorkflowStep[] = workflow.steps.map((step) =>
    step.id === workflow.currentStepId
      ? {
          ...step,
          status: "APPROVED" as const,
          decidedBy: session.userId,
          decidedAt: new Date().toISOString(),
          notes,
        }
      : step,
  );
  const nextStep = resolveNextStep({ ...workflow, steps: updatedSteps });
  const updated = updateWorkflow(tenantId, workflow, nextStep ? "PENDING" : "APPROVED", "APPROVE", {
    steps: updatedSteps,
    destinationDept: nextStep?.dept ?? workflow.destinationDept,
    currentStepId: nextStep?.id ?? workflow.currentStepId,
    notes,
  });
  appendAuditLog({
    tenantId,
    workflowId,
    action: "WORKFLOW_APPROVED",
    actorId: session.userId,
    actorRole: session.role,
    actorDept: session.departmentId,
    notes,
    cycle: updated.cycle,
    before: { status: workflow.status },
    after: { status: updated.status, destinationDept: updated.destinationDept },
  });
  emitActivity({
    tenantId,
    type: "WORKFLOW_APPROVED",
    actorId: session.userId,
    actorRole: session.role,
    entityId: workflowId,
    entityType: updated.entityType,
  });
  return updated;
}

export function rejectRequest(
  tenantId: string,
  workflowId: string,
  session: SessionContext,
  notes?: string,
): WorkflowRequest {
  const workflow = getRepo("workflow").getWorkflow(tenantId, workflowId);
  if (!workflow) {
    throw new Error("Workflow not found");
  }
  if (workflow.status !== "PENDING") {
    throw new Error("Workflow is not pending");
  }
  if (!canApproveWorkflow(session, workflow)) {
    throw new Error("Not authorized to reject workflow");
  }
  const updatedSteps: WorkflowStep[] = workflow.steps.map((step) =>
    step.id === workflow.currentStepId
      ? {
          ...step,
          status: "REJECTED" as const,
          decidedBy: session.userId,
          decidedAt: new Date().toISOString(),
          notes,
        }
      : step,
  );
  const updated = updateWorkflow(tenantId, workflow, "REJECTED", "REJECT", {
    steps: updatedSteps,
    notes,
  });
  appendAuditLog({
    tenantId,
    workflowId,
    action: "WORKFLOW_REJECTED",
    actorId: session.userId,
    actorRole: session.role,
    actorDept: session.departmentId,
    notes,
    cycle: updated.cycle,
    before: { status: workflow.status },
    after: { status: updated.status },
  });
  emitActivity({
    tenantId,
    type: "WORKFLOW_REJECTED",
    actorId: session.userId,
    actorRole: session.role,
    entityId: workflowId,
    entityType: updated.entityType,
  });
  return updated;
}

export function modifyRequest(
  tenantId: string,
  workflowId: string,
  session: SessionContext,
  notes?: string,
): WorkflowRequest {
  const workflow = getRepo("workflow").getWorkflow(tenantId, workflowId);
  if (!workflow) {
    throw new Error("Workflow not found");
  }
  if (workflow.status !== "PENDING") {
    throw new Error("Workflow is not pending");
  }
  if (!canApproveWorkflow(session, workflow)) {
    throw new Error("Not authorized to modify workflow");
  }
  const resetSteps = workflow.steps.map((step, index) => ({
    ...step,
    status: "PENDING" as const,
    decidedBy: undefined,
    decidedAt: undefined,
    notes: index === 0 ? notes : undefined,
  }));
  const updated = updateWorkflow(tenantId, workflow, "RETURNED", "MODIFY", {
    cycle: workflow.cycle + 1,
    steps: resetSteps,
    currentStepId: resetSteps[0]?.id ?? workflow.currentStepId,
    destinationDept: workflow.makerDept,
    notes,
  });
  appendAuditLog({
    tenantId,
    workflowId,
    action: "WORKFLOW_MODIFIED",
    actorId: session.userId,
    actorRole: session.role,
    actorDept: session.departmentId,
    notes,
    cycle: updated.cycle,
    before: { status: workflow.status },
    after: { status: updated.status, destinationDept: updated.destinationDept },
  });
  emitActivity({
    tenantId,
    type: "WORKFLOW_RETURNED",
    actorId: session.userId,
    actorRole: session.role,
    entityId: workflowId,
    entityType: updated.entityType,
  });
  return updated;
}

export function listWorkflowInbox(
  tenantId: string,
  destinationDept: string,
  status?: WorkflowStatus,
): WorkflowRequest[] {
  return listWorkflows(tenantId, { destinationDept, status });
}

export function listWorkflowAudit(
  tenantId: string,
  workflowId: string,
) {
  return getRepo("workflow").listAuditEntries(tenantId, workflowId);
}
