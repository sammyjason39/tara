export type Role = "STAFF" | "DEPT_HEAD" | "ADMIN" | "OWNER" | "SUPERADMIN";

export type PermissionScope =
  | "SELF"
  | "DEPARTMENT"
  | "COMPANY"
  | "TENANT"
  | "GLOBAL";

export const rolesHierarchy: Record<Role, number> = {
  STAFF: 1,
  DEPT_HEAD: 2,
  ADMIN: 3,
  OWNER: 4,
  SUPERADMIN: 5,
};

export const canAccess = (userRole: Role, requiredRole: Role): boolean => {
  return rolesHierarchy[userRole] >= rolesHierarchy[requiredRole];
};

export const scopeAllows = (
  userScope: PermissionScope,
  requiredScope: PermissionScope,
): boolean => {
  const hierarchy: PermissionScope[] = [
    "SELF",
    "DEPARTMENT",
    "COMPANY",
    "TENANT",
    "GLOBAL",
  ];
  return hierarchy.indexOf(userScope) >= hierarchy.indexOf(requiredScope);
};
