import { Roles, type Role } from "./roles";

export interface SessionContext {
  userId: string;
  tenantId: string;
  locationId: string;
  role: Role;
  departmentId: string;
  token?: string;
}

import { useAuth } from "@/contexts/AuthContext";

export function useSession(): SessionContext {
  const { session } = useAuth();

  // Return a safe empty session if not loaded to prevent crashes
  // (App.tsx routing handles actual redirection for unauthorized users)
  if (!session) {
    return {
      userId: "",
      tenantId: "",
      locationId: "",
      role: Roles.SYSTEM,
      departmentId: "",
    };
  }

  return session;
}

export function ensureTenant(tenantId: string, session: SessionContext): void {
  if (session.role === Roles.SUPERADMIN) return;
  if (tenantId !== session.tenantId) {
    throw new Error("Tenant access denied");
  }
}
