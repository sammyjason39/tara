import { trainingRepo } from "@/core/repositories/hr/trainingRepo";
import type { TrainingAssignment, TrainingProgram } from "@/core/types/hr/training";
import type { SessionContext } from "@/core/security/session";
import { Roles } from "@/core/security/roles";
import { audit } from "@/core/logging/audit";
import { workflowService } from "./workflowService";

const ensureTenantAccess = (tenantId: string, actor: SessionContext) => {
  if (actor.role === Roles.SUPERADMIN) return;
  if (actor.tenantId !== tenantId) throw new Error("Tenant access denied");
};

export const trainingService = {
  listPrograms(tenantId: string, actor: SessionContext): TrainingProgram[] {
    ensureTenantAccess(tenantId, actor);
    return trainingRepo.listPrograms(tenantId);
  },

  listAssignments(tenantId: string, actor: SessionContext): TrainingAssignment[] {
    ensureTenantAccess(tenantId, actor);
    return trainingRepo.listAssignments(tenantId);
  },

  getComplianceStatus(tenantId: string, actor: SessionContext) {
    ensureTenantAccess(tenantId, actor);
    const assignments = trainingRepo.listAssignments(tenantId);
    const completed = assignments.filter((item) => item.status === "completed").length;
    const overdue = assignments.filter((item) => item.status !== "completed").length;
    return {
      assigned: assignments.length,
      completed,
      overdue,
      completionRate: assignments.length ? Math.round((completed / assignments.length) * 100) : 0,
    };
  },

  assignTraining(
    tenantId: string,
    actor: SessionContext,
    payload: { employeeId: string; programId: string; status?: TrainingAssignment["status"] },
  ): TrainingAssignment {
    ensureTenantAccess(tenantId, actor);
    const record = trainingRepo.assignTraining(tenantId, {
      employeeId: payload.employeeId,
      programId: payload.programId,
      status: payload.status ?? "planned",
      assignedAt: new Date().toISOString().slice(0, 10),
    });
    audit.log({
      tenantId,
      actorId: actor.userId,
      action: "training.assign",
      entityType: "training_assignment",
      entityId: record.id,
      after: { programId: record.programId, employeeId: record.employeeId },
    });
    return record;
  },

  createProgram(
    tenantId: string,
    actor: SessionContext,
    payload: Omit<TrainingProgram, "id" | "tenantId" | "createdAt" | "updatedAt">,
  ) {
    ensureTenantAccess(tenantId, actor);
    const record = trainingRepo.createProgram(tenantId, payload);
    audit.log({
      tenantId,
      actorId: actor.userId,
      action: "training.program.create",
      entityType: "training_program",
      entityId: record.id,
    });
    return record;
  },

  bulkAssign(
    tenantId: string,
    actor: SessionContext,
    payload: { employeeIds: string[]; programId: string },
  ) {
    ensureTenantAccess(tenantId, actor);
    const records = payload.employeeIds.map((employeeId) =>
      trainingRepo.assignTraining(tenantId, {
        employeeId,
        programId: payload.programId,
        status: "planned",
        assignedAt: new Date().toISOString().slice(0, 10),
      }),
    );
    audit.log({
      tenantId,
      actorId: actor.userId,
      action: "training.bulk.assign",
      entityType: "training_assignment",
      entityId: payload.programId,
      after: { count: records.length },
    });
    return records;
  },

  exportCompliance(tenantId: string, actor: SessionContext) {
    ensureTenantAccess(tenantId, actor);
    const assignments = trainingRepo.listAssignments(tenantId);
    audit.log({
      tenantId,
      actorId: actor.userId,
      action: "training.export",
      entityType: "training_assignment",
      entityId: "export",
      after: { count: assignments.length },
    });
    return assignments;
  },

  requestComplianceReview(tenantId: string, actor: SessionContext, employeeId: string) {
    ensureTenantAccess(tenantId, actor);
    const request = workflowService.createRequest(tenantId, actor, {
      entityType: "TRAINING",
      entityId: employeeId,
      makerDept: actor.departmentId,
      destinationDept: "HR",
      metadata: { employeeId },
    });
    audit.log({
      tenantId,
      actorId: actor.userId,
      action: "training.escalate",
      entityType: "workflow",
      entityId: request.id,
    });
    return request;
  },

  completeTraining(tenantId: string, actor: SessionContext, assignmentId: string) {
    ensureTenantAccess(tenantId, actor);
    const record = trainingRepo.updateAssignment(tenantId, assignmentId, { status: "completed" });
    if (record) {
      audit.log({
        tenantId,
        actorId: actor.userId,
        action: "training.complete",
        entityType: "training_assignment",
        entityId: record.id,
      });
    }
    return record;
  },
};
