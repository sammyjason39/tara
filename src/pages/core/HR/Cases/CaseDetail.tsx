import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { ActivityThread } from "@/core/tools/activity/ActivityThread";
import { useSession } from "@/core/security/session";
import { caseService } from "@/core/services/hr/caseService";
import { workflowService } from "@/core/services/hr/workflowService";

export default function CaseDetail() {
  const session = useSession();
  const params = useParams();
  const caseId = params.id ?? "";
  const [dialogOpen, setDialogOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const record = useMemo(() => caseService.getCase(session.tenantId, caseId, session), [session, caseId]);

  if (!record) {
    return (
      <WorkspacePanel title="Case not found" description="This case is unavailable.">
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          The case you are looking for does not exist or is outside your scope.
        </div>
      </WorkspacePanel>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Case - ${record.title}`}
        subtitle={`${record.type} - ${record.status}`}
        primaryAction={
          <Button
            onClick={() =>
              caseService.updateStatus(session.tenantId, session, record.id, "resolved")
            }
          >
            Mark Resolved
          </Button>
        }
      />

      <WorkspacePanel title="WorkQueue" description="Case actions and routing.">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              workflowService.createRequest(session.tenantId, session, {
                entityType: "CASE",
                entityId: record.id,
                makerDept: session.departmentId,
                destinationDept: "HR",
                notes: "Case routing",
              });
            }}
          >
            Send to FlowGate
          </Button>
          <Button variant="outline" onClick={() => setDialogOpen(true)}>Escalate</Button>
        </div>
      </WorkspacePanel>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <WorkspacePanel title="Active Records" description="Case summary.">
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span>Owner</span>
              <span className="font-semibold text-foreground">{record.ownerId ?? "Unassigned"}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span>Priority</span>
              <span className="font-semibold text-foreground">{record.priority}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span>Department</span>
              <span className="font-semibold text-foreground">{record.departmentId ?? "-"}</span>
            </div>
          </div>
        </WorkspacePanel>

        <WorkspacePanel title="Pending Approvals" description="Workflow actions for this case.">
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            Route this case through FlowGate to record approvals.
          </div>
        </WorkspacePanel>
      </div>

      <WorkspacePanel title="Insights" description="Activity and collaboration.">
        <ActivityThread
          tenantId={session.tenantId}
          entityType="hr_case"
          entityId={record.id}
          actorId={session.userId}
        />
      </WorkspacePanel>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Escalate Case</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Escalation details" />
            <Button
              onClick={() => {
                caseService.escalateCase(session.tenantId, session, record.id, notes);
                setNotes("");
                setDialogOpen(false);
              }}
            >
              Send Escalation
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


