import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSession } from "@/core/security/session";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { getRoleLabel } from "@/core/security/roles";

/**
 * TenantInfoCard
 * Centralized component to display user and organization context in department sidebars.
 * Replaces hardcoded Tenant/Department/Role blocks across WorkspaceLayouts.
 */
export const TenantInfoCard: React.FC = () => {
  const { user } = useAuth();
  const session = useSession();

  // Lookup company name from user profile or fall back to name from any associated company
  const activeCompany = user?.userCompanies?.find(
    (c) => c.tenantId === session.tenantId
  );
  
  // If no exact match for current tenant context, just use the first available company name
  // to prevent showing "System Workspace" when we have real data available.
  const fallbackCompany = user?.userCompanies?.[0]?.company?.name;
  const companyName = activeCompany?.company?.name || fallbackCompany || "System Workspace";
  
  const userName = user ? `${user.firstName} ${user.lastName}` : "Authenticated User";
  const departmentName = session.departmentName || "General Operations";

  return (
    <WorkspacePanel>
      <div className="space-y-3 py-1">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
            Current Company
          </p>
          <p className="text-sm font-semibold tracking-tight text-foreground">
            {companyName}
          </p>
        </div>
        
        <div className="grid grid-cols-1 gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
              Identity
            </p>
            <p className="text-xs font-medium text-foreground/90">{userName}</p>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                  Department
                </p>
                <p className="text-xs font-medium text-foreground/90">{departmentName}</p>
             </div>
             <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 text-right">
                  Role
                </p>
                <p className="text-[10px] font-black text-primary uppercase text-right">
                  {getRoleLabel(session.role)}
                </p>
             </div>
          </div>
        </div>
      </div>
    </WorkspacePanel>
  );
};

export default TenantInfoCard;
