import type { HRAuditFields } from "./base";

export type ReviewCycleStatus = "draft" | "active" | "completed" | "archived";

export interface PerformanceCycle extends HRAuditFields {
  id: string;
  tenantId: string;
  name: string;
  status: ReviewCycleStatus;
  startDate: string;
  endDate: string;
  dueDate: string;
}

export interface PerformanceReview extends HRAuditFields {
  id: string;
  tenantId: string;
  cycleId: string;
  employeeId: string;
  reviewerId: string;
  status: "pending" | "submitted" | "approved";
  score?: number;
  summary?: string;
}
