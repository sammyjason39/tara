export type HrDocumentType =
  | "contract"
  | "visa"
  | "policy"
  | "payroll_export"
  | "kpi_report";

export type HrDocumentRecord = {
  id: string;
  tenantId: string;
  type: HrDocumentType;
  title: string;
  status: "draft" | "active" | "archived";
  createdAt: string;
  updatedAt: string;
};
