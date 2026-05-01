export const Roles = {
  FINANCE_STAFF: "FINANCE_STAFF",
  HR_STAFF: "HR_STAFF",
  DEPT_HEAD: "DEPT_HEAD",
  FINANCE_DEPT_HEAD: "FINANCE_DEPT_HEAD",
  HR_DEPT_HEAD: "HR_DEPT_HEAD",
  SALES_STAFF: "SALES_STAFF",
  SALES_ADMIN: "SALES_ADMIN",
  IT_STAFF: "IT_STAFF",
  IT_ADMIN: "IT_ADMIN",
  COMPANY_ADMIN: "COMPANY_ADMIN",
  HR_ADMIN: "HR_ADMIN",
  FINANCE_ADMIN: "FINANCE_ADMIN",
  OWNER: "OWNER",
  SUPERADMIN: "SUPERADMIN",
  SYSTEM: "SYSTEM",
} as const;

export type Role = (typeof Roles)[keyof typeof Roles];

export const RoleList: Role[] = Object.values(Roles);
