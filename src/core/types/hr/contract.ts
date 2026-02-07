import type { HRAuditFields } from "./base";

export type ContractStatus = "draft" | "active" | "expired" | "terminated";
export type ContractType = "employment" | "vendor" | "visa" | "tax" | "policy";

export interface Contract extends HRAuditFields {
  id: string;
  tenantId: string;
  employeeId?: string;
  title: string;
  type: ContractType;
  status: ContractStatus;
  startDate: string;
  endDate?: string;
  documentUrl?: string;
  notes?: string;
  approvalId?: string;
}
