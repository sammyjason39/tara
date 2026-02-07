import { Roles, type Role } from "./roles";

export interface SessionContext {
  userId: string;
  tenantId: string;
  role: Role;
  departmentId: string;
}

export function useSession(): SessionContext {
  return {
    userId: "user-demo",
    tenantId: "tenant-demo",

    // DEV ACCESS (so Finance renders)
    role: Roles.SUPERADMIN,

    departmentId: "dept-ops",
  };
}
