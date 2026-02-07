export type DocumentType =
  | "CONTRACT"
  | "VISA_FILE"
  | "POLICY"
  | "PAYROLL_EXPORT"
  | "KPI_REPORT";

export type DocumentRecord = {
  id: string;
  tenantId: string;
  type: DocumentType;
  title: string;
  status: "draft" | "active" | "archived";
  createdAt: string;
  updatedAt: string;
  ownerId?: string;
  metadata?: Record<string, string>;
};
