import type { PerformanceCycle, PerformanceReview } from "@/core/types/hr/performance";
import type { SessionContext } from "@/core/security/session";
import { apiRequest } from "@/core/api/apiClient";
import { workflowService } from "./workflowService";

export const performanceService = {
  async getCycleOverview(tenantId: string, actor: SessionContext) {
    const [cycles, reviews] = await Promise.all([
      apiRequest<PerformanceCycle[]>("/v1/hr/performance/cycles", "GET", actor),
      apiRequest<PerformanceReview[]>("/v1/hr/performance/reviews", "GET", actor),
    ]);

    return {
      cycles,
      reviews,
      activeCycles: cycles.filter(c => c.status === "active").length,
      pendingReviews: reviews.filter(r => r.status === "pending").length,
    };
  },

  async createReviewCycle(
    tenantId: string,
    actor: SessionContext,
    payload: Omit<PerformanceCycle, "id" | "tenantId" | "createdAt" | "updatedAt">,
  ): Promise<PerformanceCycle> {
    const cycle = await apiRequest<PerformanceCycle>(
      "/hr/performance/cycles",
      "POST",
      actor,
      payload
    );

    workflowService.createRequest(tenantId, actor, {
      entityType: "PERFORMANCE",
      entityId: cycle.id,
      makerDept: actor.departmentId,
      destinationDept: "HR",
      metadata: { title: cycle.name },
    });
    return cycle;
  },

  async submitReview(
    tenantId: string,
    actor: SessionContext,
    payload: Omit<PerformanceReview, "id" | "tenantId" | "createdAt" | "updatedAt"> & { cycleId: string; employeeId: string; reviewerId: string },
  ): Promise<PerformanceReview> {
    return apiRequest<PerformanceReview>(
      "/hr/performance/reviews",
      "POST",
      actor,
      payload
    );
  },

  async launchCycle(tenantId: string, actor: SessionContext, cycleId: string) {
    return apiRequest<PerformanceCycle>(
      `/hr/performance/cycles/${cycleId}`,
      "PATCH",
      actor,
      { status: "active" }
    );
  },

  async runCalibration(tenantId: string, actor: SessionContext, cycleId: string) {
    return { id: cycleId, status: "calibrated" } as any;
  },

  async requestReviewApproval(tenantId: string, actor: SessionContext, reviewId: string, employeeId: string) {
    return workflowService.createRequest(tenantId, actor, {
      entityType: "PERFORMANCE",
      entityId: reviewId,
      makerDept: actor.departmentId,
      destinationDept: "HR",
      metadata: { employeeId, reviewId },
    });
  },
};

