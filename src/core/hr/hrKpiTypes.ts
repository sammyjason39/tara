export type KpiTemplate = {
  id: string;
  tenantId: string;
  departmentId: string;
  title: string;
  description?: string;
  weight: number;
  status: "active" | "archived";
  createdAt: string;
  updatedAt: string;
};

export type ReviewCycle = {
  id: string;
  tenantId: string;
  departmentId: string;
  period: string;
  status: "draft" | "active" | "closed";
  createdAt: string;
  updatedAt: string;
};
