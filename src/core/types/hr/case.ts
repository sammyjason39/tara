import type { HRAuditFields } from "./base";

export type CaseType =
  | "dispute"
  | "payroll_correction"
  | "misconduct"
  | "visa_escalation"
  | "termination";

export type CaseStatus = "open" | "in_review" | "resolved" | "closed";

export interface HRCase extends HRAuditFields {
  id: string;
  tenantId: string;
  title: string;
  type: CaseType;
  status: CaseStatus;
  employeeId?: string;
  departmentId?: string;
  ownerId?: string;
  priority: "low" | "medium" | "high";
}
