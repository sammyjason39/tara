export type ContractType = "internal" | "external";

export type ContractRecord = {
  id: string;
  tenantId: string;
  title: string;
  type: ContractType;
  status: "draft" | "active" | "expired";
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
};

export type VisaRecord = {
  id: string;
  tenantId: string;
  employeeId: string;
  country: string;
  expiryDate: string;
  status: "active" | "renewal_required" | "expired";
  createdAt: string;
  updatedAt: string;
};
