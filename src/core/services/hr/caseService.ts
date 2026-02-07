import type { HRCase } from "@/core/types/hr/case";
import { caseRepo } from "@/core/repositories/hr/caseRepo";
import type { SessionContext } from "@/core/security/session";
import { Roles } from "@/core/security/roles";
import { audit } from "@/core/logging/audit";
import { workflowService } from "./workflowService";

const ensureTenantAccess = (tenantId: string, actor: SessionContext) => {
  if (actor.role === Roles.SUPERADMIN) return;
  if (actor.tenantId !== tenantId) throw new Error("Tenant access denied");
};

export const caseService = {
  listCases(tenantId: string, actor: SessionContext): HRCase[] {
    ensureTenantAccess(tenantId, actor);
    return caseRepo.list(tenantId);
  },

  getCase(tenantId: string, caseId: string, actor: SessionContext): HRCase | undefined {
    ensureTenantAccess(tenantId, actor);
    return caseRepo.get(tenantId, caseId);
  },

  createCase(
    tenantId: string,
    actor: SessionContext,
    payload: Omit<HRCase, "id" | "tenantId" | "createdAt" | "updatedAt">,
  ): HRCase {
    ensureTenantAccess(tenantId, actor);
    const record = caseRepo.create(tenantId, payload);
    audit.log({
      tenantId,
      actorId: actor.userId,
      action: "case.create",
      entityType: "hr_case",
      entityId: record.id,
    });
    return record;
  },

  updateStatus(tenantId: string, actor: SessionContext, caseId: string, status: HRCase["status"]) {
    ensureTenantAccess(tenantId, actor);
    const record = caseRepo.update(tenantId, caseId, { status });
    if (record) {
      audit.log({
        tenantId,
        actorId: actor.userId,
        action: "case.status.update",
        entityType: "hr_case",
        entityId: record.id,
        after: { status },
      });
    }
    return record;
  },

  assignOwner(tenantId: string, actor: SessionContext, caseId: string, ownerId: string) {
    ensureTenantAccess(tenantId, actor);
    const record = caseRepo.update(tenantId, caseId, { ownerId });
    if (record) {
      audit.log({
        tenantId,
        actorId: actor.userId,
        action: "case.assign.owner",
        entityType: "hr_case",
        entityId: record.id,
        after: { ownerId },
      });
    }
    return record;
  },

  escalateCase(tenantId: string, actor: SessionContext, caseId: string, reason?: string) {
    ensureTenantAccess(tenantId, actor);
    const record = caseRepo.get(tenantId, caseId);
    if (!record) {
      throw new Error("Case not found");
    }
    const request = workflowService.createRequest(tenantId, actor, {
      entityType: "CASE",
      entityId: caseId,
      makerDept: actor.departmentId,
      destinationDept: "HR",
      metadata: { caseId, reason: reason ?? "Case escalation" },
    });
    audit.log({
      tenantId,
      actorId: actor.userId,
      action: "case.escalate",
      entityType: "workflow",
      entityId: request.id,
      after: { caseId },
    });
    return request;
  },
};
