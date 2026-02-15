import type { HRAuditFields } from "./base";

export type RecruitmentStatus = "open" | "screening" | "interview" | "offer" | "closed" | "rejected";

export interface RecruitmentRequisition extends HRAuditFields {
  id: string;
  tenantId: string;
  title: string;
  departmentId: string;
  status: RecruitmentStatus;
  openings: number;
}
