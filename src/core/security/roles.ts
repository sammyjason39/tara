export const Roles = {
  FINANCE_STAFF: "FINANCE_STAFF",
  HR_STAFF: "HR_STAFF",
  DEPT_HEAD: "DEPT_HEAD",
  FINANCE_DEPT_HEAD: "FINANCE_DEPT_HEAD",
  HR_DEPT_HEAD: "HR_DEPT_HEAD",
  COMPANY_ADMIN: "COMPANY_ADMIN",
  HR_ADMIN: "HR_ADMIN",
  FINANCE_ADMIN: "FINANCE_ADMIN",
  OWNER: "OWNER",
  SUPERADMIN: "SUPERADMIN",
} as const;

export type Role = (typeof Roles)[keyof typeof Roles];

export const RoleList: Role[] = Object.values(Roles);
