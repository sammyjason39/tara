import { recruitmentRepo } from "@/core/repositories/hr/recruitmentRepo";
import type { RecruitmentRequisition } from "@/core/types/hr/recruitment";
import type { SessionContext } from "@/core/security/session";
import { Roles } from "@/core/security/roles";
import { audit } from "@/core/logging/audit";
import { workflowService } from "./workflowService";

const ensureTenantAccess = (tenantId: string, actor: SessionContext) => {
  if (actor.role === Roles.SUPERADMIN) return;
  if (actor.tenantId !== tenantId) throw new Error("Tenant access denied");
};

export type CandidateRecord = {
  id: string;
  name: string;
  role: string;
  stage: "sourcing" | "screening" | "interview" | "offer";
  departmentId: string;
  requisitionId: string;
};

export const recruitmentService = {
  getPipelineStages() {
    return ["sourcing", "screening", "interview", "offer"] as const;
  },
  listRequisitions(tenantId: string, actor: SessionContext): RecruitmentRequisition[] {
    ensureTenantAccess(tenantId, actor);
    return recruitmentRepo.list(tenantId);
  },

  listCandidates(tenantId: string, actor: SessionContext): CandidateRecord[] {
    ensureTenantAccess(tenantId, actor);
    const requisitions = recruitmentRepo.list(tenantId);
    return requisitions.map((req, index) => ({
      id: `${req.id}-cand-${index + 1}`,
      name: `Candidate ${index + 1}`,
      role: req.title,
      stage:
        req.status === "open"
          ? "sourcing"
          : req.status === "screening"
            ? "screening"
            : req.status === "offer"
              ? "offer"
              : "interview",
      departmentId: req.departmentId,
      requisitionId: req.id,
    }));
  },

  createRequisition(
    tenantId: string,
    actor: SessionContext,
    payload: Omit<RecruitmentRequisition, "id" | "tenantId" | "createdAt" | "updatedAt">,
  ) {
    ensureTenantAccess(tenantId, actor);
    const record = recruitmentRepo.create(tenantId, payload);
    workflowService.createRequest(tenantId, actor, {
      entityType: "RECRUITMENT",
      entityId: record.id,
      makerDept: actor.departmentId,
      destinationDept: "HR",
      metadata: { title: record.title },
    });
    audit.log({
      tenantId,
      actorId: actor.userId,
      action: "recruitment.create",
      entityType: "requisition",
      entityId: record.id,
      after: { title: record.title },
    });
    return record;
  },

  scheduleInterview(tenantId: string, actor: SessionContext, candidateId: string, notes?: string) {
    ensureTenantAccess(tenantId, actor);
    audit.log({
      tenantId,
      actorId: actor.userId,
      action: "recruitment.interview.schedule",
      entityType: "candidate",
      entityId: candidateId,
      after: { notes },
    });
  },

  routeCandidate(tenantId: string, actor: SessionContext, candidateId: string) {
    ensureTenantAccess(tenantId, actor);
    const request = workflowService.createRequest(tenantId, actor, {
      entityType: "RECRUITMENT",
      entityId: candidateId,
      makerDept: actor.departmentId,
      destinationDept: "HR",
      metadata: { candidateId },
    });
    audit.log({
      tenantId,
      actorId: actor.userId,
      action: "recruitment.route.flowgate",
      entityType: "workflow",
      entityId: request.id,
    });
    return request;
  },
};
