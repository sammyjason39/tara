import { useMemo } from "react";
import { useSession } from "@/core/security/session";
import { useIdentity } from "@/core/identity/context";

export interface SchedulingContext {
  activeDepartmentId: string | null;
  canManageAll: boolean;
  isLockedToDepartment: boolean;
}

/**
 * useDepartmentalScheduling
 * Orchestrates permission-aware workforce management.
 * Enforces context-locking for HODs and global visibility for HR.
 */
export function useDepartmentalScheduling(workspaceDeptId?: string): SchedulingContext {
  const session = useSession();
  const { state: identity } = useIdentity();

  const schedulingContext = useMemo(() => {
    // 1. Determine if user has HR / Global Admin privileges
    const isHR = identity.roles.some(role => 
      role.permissions.some(p => p.resource === "*" || p.resource === "HR")
    );

    // 2. Resolve the active department based on workspace context or user assignment
    // If HR, they can switch between all; if HOD, they are locked to their own dept.
    const userDeptId = session.department_id || identity.user?.departmentId;
    
    const activeId = isHR ? (workspaceDeptId || null) : (userDeptId || null);

    return {
      activeDepartmentId: activeId,
      canManageAll: isHR,
      isLockedToDepartment: !isHR && !!userDeptId
    };
  }, [session, identity, workspaceDeptId]);

  return schedulingContext;
}
