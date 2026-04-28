import React, { useState } from "react";
import { PageShell } from "@/core/ui/PageShell";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkforceScheduler } from "@/core/ui/WorkforceScheduler";
import { useDepartmentalScheduling } from "@/core/hooks/useDepartmentalScheduling";
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
  title 
}: DepartmentScheduleStudioProps) {
  const session = useSession();
  const { activeDepartmentId, canManageAll } = useDepartmentalScheduling(workspaceDeptId);
  const [selectedDeptId, setSelectedDeptId] = useState(activeDepartmentId || workspaceDeptId);

  return (
    <PageShell
      header={
        <PageHeader
          title={`${title} Schedule`}
          subtitle={`Manage personnel shifts, availability, and coverage for the ${selectedDeptId} department.`}
        />
      }
    >
      <div className="max-w-[1600px] mx-auto">
        <WorkforceScheduler 
          departmentId={selectedDeptId} 
          title={`${selectedDeptId} Staffing Matrix`}
          isHR={canManageAll}
          onDepartmentChange={setSelectedDeptId}
        />
      </div>
    </PageShell>
  );
}
