import type { HRAuditFields } from "./base";

export type TrainingStatus = "planned" | "in_progress" | "completed" | "overdue";

export interface TrainingProgram extends HRAuditFields {
  id: string;
  tenantId: string;
  name: string;
  status: TrainingStatus;
  completionRate: number;
  dueDate?: string;
}

export interface TrainingAssignment extends HRAuditFields {
  id: string;
  tenantId: string;
  programId: string;
  employeeId: string;
  status: TrainingStatus;
  assignedAt: string;
  completedAt?: string;
}
