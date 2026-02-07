import type { HRAuditFields } from "./base";

export type DepartmentStatus = "active" | "inactive";

export interface Department extends HRAuditFields {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  parentId?: string;
  headId?: string;
  costCenter?: string;
  status: DepartmentStatus;
}
