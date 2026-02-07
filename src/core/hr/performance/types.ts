export type KpiTemplate = {
  id: string;
  tenantId: string;
  departmentId: string;
  title: string;
  weight: number;
  createdAt: string;
  updatedAt: string;
};

export type ReviewCycle = {
  id: string;
  tenantId: string;
  name: string;
  startDate: string;
  endDate: string;
  dueDate: string;
  status: "draft" | "active" | "closed";
  createdAt: string;
  updatedAt: string;
};
