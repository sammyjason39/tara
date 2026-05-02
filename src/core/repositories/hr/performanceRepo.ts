import type { PerformanceCycle, PerformanceReview, ReviewCycleStatus } from "@/core/types/hr/performance";
import { prisma } from "@/core/persistence/database/client";
// Triggering IDE type refresh

/**
 * Mapping helper for Performance Cycle
 */
const mapToCycle = (db: any): PerformanceCycle => ({
  id: db.id,
  tenantId: db.tenantId,
  name: db.name,
  status: db.status as ReviewCycleStatus,
  startDate: db.startDate.toISOString().split('T')[0],
  endDate: db.endDate.toISOString().split('T')[0],
  dueDate: db.dueDate.toISOString().split('T')[0],
  createdAt: db.createdAt.toISOString(),
  updatedAt: db.updatedAt.toISOString(),
} as PerformanceCycle);

/**
 * Mapping helper for Performance Review
 */
const mapToReview = (db: any): PerformanceReview => ({
  id: db.id,
  tenantId: db.tenantId,
  cycleId: db.cycleId,
  employeeId: db.employeeId,
  reviewerId: db.reviewerId,
  status: db.status as any,
  score: db.rating || undefined,
  summary: db.comments || undefined,
  createdAt: db.createdAt.toISOString(),
  updatedAt: db.updatedAt.toISOString(),
} as PerformanceReview);

export const performanceRepo = {
  /**
   * Cycles
   */
  async listCycles(tenantId: string): Promise<PerformanceCycle[]> {
    const cycles = await prisma.performanceCycle.findMany({
      where: { tenantId: tenantId },
      orderBy: { startDate: 'desc' },
    });
    return (Array.isArray(cycles) ? cycles : []).map(mapToCycle);
  },

  async createCycle(
    tenantId: string,
    payload: Omit<PerformanceCycle, "id" | "tenantId" | "createdAt" | "updatedAt">,
  ): Promise<PerformanceCycle> {
    const cycle = await prisma.performanceCycle.create({
      data: {
        tenantId: tenantId,
        name: payload.name,
        status: payload.status,
        startDate: new Date(payload.startDate),
        endDate: new Date(payload.endDate),
        dueDate: new Date(payload.dueDate),
      },
    });
    return mapToCycle(cycle);
  },

  async updateCycle(
    tenantId: string,
    cycleId: string,
    patch: Partial<PerformanceCycle>,
  ): Promise<PerformanceCycle | null> {
    const data: any = {};
    if (patch.name) data.name = patch.name;
    if (patch.status) data.status = patch.status;
    if (patch.startDate) data.startDate = new Date(patch.startDate);
    if (patch.endDate) data.endDate = new Date(patch.endDate);
    if (patch.dueDate) data.dueDate = new Date(patch.dueDate);

    const updated = await prisma.performanceCycle.update({
      where: { id: cycleId, tenantId: tenantId },
      data,
    });
    return mapToCycle(updated);
  },

  /**
   * Reviews
   */
  async listReviews(tenantId: string): Promise<PerformanceReview[]> {
    const reviews = await prisma.performanceReview.findMany({
      where: { tenantId: tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return (Array.isArray(reviews) ? reviews : []).map(mapToReview);
  },

  async createReview(
    tenantId: string,
    payload: Omit<PerformanceReview, "id" | "tenantId" | "createdAt" | "updatedAt">,
  ): Promise<PerformanceReview> {
    const review = await prisma.performanceReview.create({
      data: {
        tenantId: tenantId,
        cycleId: payload.cycleId,
        employeeId: payload.employeeId,
        reviewerId: payload.reviewerId,
        status: payload.status,
        rating: payload.score,
        comments: payload.summary,
      },
    });
    return mapToReview(review);
  },
};
