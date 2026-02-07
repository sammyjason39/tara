export const DepartmentCodes = [
  "HR",
  "FINANCE",
  "LEGAL",
  "PROCUREMENT",
  "OPERATIONS",
  "IT",
  "ADMIN",
] as const;

export type DepartmentCode = (typeof DepartmentCodes)[number];

export type Department = {
  id: string;
  code: DepartmentCode;
  name: string;
  createdAt: string;
  updatedAt: string;
  status: "active" | "inactive";
};
