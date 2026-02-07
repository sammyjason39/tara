import { performanceRepo } from "@/core/repositories/hr/performanceRepo";
import type { PerformanceCycle, PerformanceReview } from "@/core/types/hr/performance";
import type { SessionContext } from "@/core/security/session";
import { Roles } from "@/core/security/roles";
import { audit } from "@/core/logging/audit";
import { workflowService } from "./workflowService";

const ensureTenantAccess = (tenantId: string, actor: SessionContext) => {
  if (actor.role === Roles.SUPERADMIN) return;
  if (actor.tenantId !== tenantId) throw new Error("Tenant access denied");
};

export const performanceService = {
  getCycleOverview(tenantId: string, actor: SessionContext) {
    ensureTenantAccess(tenantId, actor);
    const cycles = performanceRepo.listCycles(tenantId);
    const reviews = performanceRepo.listReviews(tenantId);
    const active = cycles.filter((cycle) => cycle.status === "active").length;
    return {
      cycles,
      reviews,
      activeCycles: active,
      pendingReviews: reviews.filter((review) => review.status !== "completed").length,
    };
  },

  createReviewCycle(
    tenantId: string,
    actor: SessionContext,
    payload: Omit<PerformanceCycle, "id" | "tenantId" | "createdAt" | "updatedAt">,
  ): PerformanceCycle {
    ensureTenantAccess(tenantId, actor);
    const record = performanceRepo.createCycle(tenantId, payload);
    audit.log({
      tenantId,
      actorId: actor.userId,
      action: "performance.cycle.create",
      entityType: "performance_cycle",
      entityId: record.id,
    });
    return record;
  },

  submitReview(
    tenantId: string,
    actor: SessionContext,
    payload: Omit<PerformanceReview, "id" | "tenantId" | "createdAt" | "updatedAt">,
  ): PerformanceReview {
    ensureTenantAccess(tenantId, actor);
    const record = performanceRepo.createReview(tenantId, payload);
    audit.log({
      tenantId,
      actorId: actor.userId,
      action: "performance.review.submit",
      entityType: "performance_review",
      entityId: record.id,
    });
    return record;
  },

  launchCycle(tenantId: string, actor: SessionContext, cycleId: string) {
    ensureTenantAccess(tenantId, actor);
    const record = performanceRepo.updateCycle(tenantId, cycleId, { status: "active" });
    if (record) {
      audit.log({
        tenantId,
        actorId: actor.userId,
        action: "performance.cycle.launch",
        entityType: "performance_cycle",
        entityId: record.id,
      });
    }
    return record;
  },

  runCalibration(tenantId: string, actor: SessionContext, cycleId: string) {
    ensureTenantAccess(tenantId, actor);
    const record = performanceRepo.updateCycle(tenantId, cycleId, { status: "calibrating" });
    if (record) {
      audit.log({
        tenantId,
        actorId: actor.userId,
        action: "performance.cycle.calibrate",
        entityType: "performance_cycle",
        entityId: record.id,
      });
    }
    return record;
  },

  requestReviewApproval(tenantId: string, actor: SessionContext, reviewId: string, employeeId: string) {
    ensureTenantAccess(tenantId, actor);
    const request = workflowService.createRequest(tenantId, actor, {
      entityType: "PERFORMANCE",
      entityId: reviewId,
      makerDept: actor.departmentId,
      destinationDept: "HR",
      metadata: { employeeId, reviewId },
    });
    audit.log({
      tenantId,
      actorId: actor.userId,
      action: "performance.review.route",
      entityType: "workflow",
      entityId: request.id,
    });
    return request;
  },
};
