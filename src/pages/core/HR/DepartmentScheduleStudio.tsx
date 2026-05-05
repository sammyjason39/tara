import React, { useState } from "react";
import { PageShell } from "@/core/ui/PageShell";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkforceScheduler } from "@/core/ui/WorkforceScheduler";
import { useDepartmentalGovernance } from "@/core/hooks/useDepartmentalGovernance";
import { useSession } from "@/core/security/session";

interface DepartmentScheduleStudioProps {
  workspaceDeptId: string;
  title: string;
}

/**
 * DepartmentScheduleStudio
 * A unified, permission-aware scheduling interface for any department.
 */
export default function DepartmentScheduleStudio({ 
  workspaceDeptId, 
  title,
  noShell = false
}: DepartmentScheduleStudioProps & { noShell?: boolean }) {
  const session = useSession();
  const { canManagePersonnel } = useDepartmentalGovernance();
  const [selectedDeptId, setSelectedDeptId] = useState(workspaceDeptId);

  const content = (
    <div className="max-w-[1600px] mx-auto">
      <WorkforceScheduler 
        departmentId={selectedDeptId} 
        title={`${selectedDeptId} Staffing Matrix`}
        isHR={canManagePersonnel}
        onDepartmentChange={setSelectedDeptId}
      />
    </div>
  );

  if (noShell) return content;

  return (
    <PageShell
      header={
        <PageHeader
          title={`${title} Schedule`}
          subtitle={`Manage personnel shifts, availability, and coverage for the ${selectedDeptId} department.`}
        />
      }
    >
      {content}
    </PageShell>
  );
}
