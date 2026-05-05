import { PageShell } from "@/core/ui/PageShell";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { useSession } from "@/core/security/session";
import { canAccessWorkspace } from "@/core/security/policy";
import { ApprovalInbox } from "@/core/tools/workflows/approvalInbox";

export default function WorkflowInbox({ noShell = false }: { noShell?: boolean }) {
  const session = useSession();

  const content = (
    <div className="space-y-6">
      <WorkspacePanel
        title="Inbox controls"
        description="Search and filter workflows across departments."
      >
        {canAccessWorkspace(session, "WORKFLOW") ? (
          <ApprovalInbox tenantId={session.tenant_id} session={session} />
        ) : (
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            You do not have approvals assigned.
          </div>
        )}
      </WorkspacePanel>
    </div>
  );

  if (noShell) return content;

  return (
    <PageShell
      header={
        <PageHeader
          title="Workflow Inbox"
          subtitle="Department-level approvals with audit trails."
        />
      }
    >
      {content}
    </PageShell>
  );
}
