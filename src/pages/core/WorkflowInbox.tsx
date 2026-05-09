import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { useSession } from "@/core/security/session";
import { canAccessWorkspace } from "@/core/security/policy";
import { ApprovalInbox } from "@/core/tools/workflows/approvalInbox";
import { Inbox, Activity, CheckSquare, Search } from "lucide-react";
import DepartmentWorkspaceLayout from "@/components/layouts/DepartmentWorkspaceLayout";

const SECTIONS = [
  {
    title: "WORKFLOW",
    items: [
      { id: 'inbox', icon: Inbox, label: "My Inbox", to: "/core/inbox" },
      { id: 'history', icon: Activity, label: "History", to: "/core/inbox/history" },
    ]
  }
];

export default function WorkflowInbox({ noShell = false }: { noShell?: boolean }) {
  const session = useSession();

  const content = (
    <div className="space-y-6 p-6">
      <WorkspacePanel
        title="Inbox controls"
        description="Search and filter workflows across departments."
      >
        <div className="pt-2">
          {canAccessWorkspace(session, "WORKFLOW") ? (
            <ApprovalInbox tenantId={session.tenant_id} session={session} />
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed p-12 text-center bg-slate-50/50 dark:bg-slate-900/20">
              <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <Search className="h-6 w-6 text-slate-400" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                  No Approvals Assigned
                </p>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">
                  You are currently clear of any pending workflow actions.
                </p>
              </div>
            </div>
          )}
        </div>
      </WorkspacePanel>
    </div>
  );

  if (noShell) return content;

  return (
    <DepartmentWorkspaceLayout
      title="Workflow Inbox"
      subtitle="Department-level approvals with audit trails."
      headerIcon={Inbox}
      accentColor="blue"
      engineName="WORKFLOW_ENGINE"
      pulseLabel="Inbox Pulse"
      pulseIcon={Activity}
      sections={SECTIONS}
      routeLabels={{}}
      basePath="/core/inbox"
    >
      {content}
    </DepartmentWorkspaceLayout>
  );
}
