import type { PerformanceCycle, PerformanceReview } from "@/core/types/hr/performance";
import { ensureSeed, nextId, saveToStorage } from "./storage";

const cycleKey = (tenantId: string) => `hr:${tenantId}:performance-cycles`;
const reviewKey = (tenantId: string) => `hr:${tenantId}:performance-reviews`;

const seedCycles = (tenantId: string): PerformanceCycle[] => [
  {
    id: `${tenantId}-cycle-001`,
    tenantId,
    name: "Q1 2026 Review",
    status: "active",
    startDate: "2026-01-15",
    endDate: "2026-03-31",
    dueDate: "2026-03-10",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: `${tenantId}-cycle-000`,
    tenantId,
    name: "Q4 2025 Review",
    status: "completed",
    startDate: "2025-10-01",
    endDate: "2025-12-31",
    dueDate: "2026-01-15",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const seedReviews = (tenantId: string): PerformanceReview[] => [
  {
    id: `${tenantId}-review-001`,
    tenantId,
    cycleId: `${tenantId}-cycle-001`,
    employeeId: `${tenantId}-emp-001`,
    reviewerId: `${tenantId}-emp-002`,
    status: "pending",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const performanceRepo = {
  listCycles(tenantId: string): PerformanceCycle[] {
    return ensureSeed(cycleKey(tenantId), seedCycles(tenantId));
  },

  listReviews(tenantId: string): PerformanceReview[] {
    return ensureSeed(reviewKey(tenantId), seedReviews(tenantId));
  },

  createCycle(
    tenantId: string,
    payload: Omit<PerformanceCycle, "id" | "tenantId" | "createdAt" | "updatedAt">,
  ): PerformanceCycle {
    const cycles = this.listCycles(tenantId);
    const now = new Date().toISOString();
    const cycle: PerformanceCycle = {
      ...payload,
      id: nextId(`${tenantId}-cycle`),
      tenantId,
      createdAt: now,
      updatedAt: now,
    };
    const updated = [cycle, ...cycles];
    saveToStorage(cycleKey(tenantId), updated);
    return cycle;
  },

  createReview(
    tenantId: string,
    payload: Omit<PerformanceReview, "id" | "tenantId" | "createdAt" | "updatedAt">,
  ): PerformanceReview {
    const reviews = this.listReviews(tenantId);
    const now = new Date().toISOString();
    const review: PerformanceReview = {
      ...payload,
      id: nextId(`${tenantId}-review`),
      tenantId,
      createdAt: now,
      updatedAt: now,
    };
    const updated = [review, ...reviews];
    saveToStorage(reviewKey(tenantId), updated);
    return review;
  },

  updateCycle(
    tenantId: string,
    cycleId: string,
    patch: Partial<PerformanceCycle>,
  ): PerformanceCycle | null {
    const cycles = this.listCycles(tenantId);
    let updatedCycle: PerformanceCycle | null = null;
    const updated = cycles.map((cycle) => {
      if (cycle.id !== cycleId) return cycle;
      updatedCycle = { ...cycle, ...patch, updatedAt: new Date().toISOString() };
      return updatedCycle;
    });
    if (!updatedCycle) return null;
    saveToStorage(cycleKey(tenantId), updated);
    return updatedCycle;
  },
};
