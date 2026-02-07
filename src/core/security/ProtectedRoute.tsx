import type React from "react";
import type { PermissionKey } from "./permissions";
import type { ScopeLevel } from "./access";
import { canAccess } from "./access";
import { useSession } from "./session";
import UnauthorizedPage from "@/pages/core/Unauthorized";

interface ProtectedRouteProps {
  permission: PermissionKey;
  scope: ScopeLevel;
  children: React.ReactNode;
}

export function ProtectedRoute({ permission, scope, children }: ProtectedRouteProps) {
  const session = useSession();
  const allowed = canAccess({
    role: session.role,
    permission,
    scope,
    tenantMatch: true,
  });

  if (!allowed) {
    return <UnauthorizedPage />;
  }

  return <>{children}</>;
}

export default ProtectedRoute;
