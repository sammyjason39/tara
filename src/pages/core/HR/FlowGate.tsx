import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { DataTableShell } from "@/core/tools/DataTableShell";
import { ApprovalStatusBadge } from "@/core/tools/ApprovalStatusBadge";
import { FeedbackAlert } from "@/core/tools/FeedbackAlert";
import { useSession } from "@/core/security/session";
import { workflowService } from "@/core/services/hr/workflowService";
import { useBackgroundRefresh } from "@/core/runtime/events/useBackgroundRefresh";
import type { AuditEntry } from "@/core/tools/workflows/auditLogTypes";

export default function FlowGate() {
  const session = useSession();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [version, setVersion] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [entityType, setEntityType] = useState<"PAYROLL" | "LEAVE" | "CONTRACT" | "RECRUITMENT" | "TRAINING" | "PERFORMANCE" | "CASE">("PAYROLL");
  const [entityId, setEntityId] = useState("");
  const [destinationDept, setDestinationDept] = useState("HR");
  const [selectedAuditEntry, setSelectedAuditEntry] = useState<AuditEntry | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const clearStatus = () => {
    setStatusMessage(null);
    setErrorMessage(null);
  };
  const refresh = useCallback(() => setVersion((prev) => prev + 1), []);
  useBackgroundRefresh(refresh, 15000);

  const workflows = useMemo(
    () => workflowService.listRequests(session.tenantId),
    [session, version],
  );

  const selected = workflows.find((flow) => flow.id === selectedId) ?? workflows[0] ?? null;
  const auditTrail = selected ? workflowService.listAudit(session.tenantId, selected.id) : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="FlowGate"
        subtitle="Approval routing OS with full audit chain."
        primaryAction={<Button onClick={() => setDialogOpen(true)}>New Route</Button>}
        secondaryActions={<Input placeholder="Search requests" className="min-w-[200px]" />}
      />

      <FeedbackAlert message={statusMessage} error={errorMessage} onClear={clearStatus} />

      <WorkspacePanel title="WorkQueue" description="Requests awaiting action.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {workflows.slice(0, 6).map((flow) => (
            <div
              key={flow.id}
              className={`rounded-lg border p-4 ${selected?.id === flow.id ? "border-primary" : ""}`}
            >
              <p className="text-sm font-semibold text-foreground">{flow.entityType}</p>
              <p className="text-xs text-muted-foreground">Dept: {flow.destinationDept}</p>
              <div className="mt-2">
                <ApprovalStatusBadge status={flow.status} />
              </div>
              <Button
                size="sm"
                variant="outline"
                className="mt-3"
                onClick={() => {
                  setSelectedId(flow.id);
                  setDetailOpen(true);
                }}
              >
                Open Details
              </Button>
            </div>
          ))}
        </div>
      </WorkspacePanel>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <WorkspacePanel title="Active Records" description="Route timeline and current step.">
          {selected ? (
            <div className="space-y-3">
              {selected.steps.map((step, index) => (
                <div key={step.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Step {index + 1}</div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">{step.label}</p>
                    <p className="text-xs text-muted-foreground">Dept: {step.dept}</p>
                  </div>
                  <ApprovalStatusBadge status={step.status} />
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
              Select a request to see its pipeline.
            </div>
          )}
        </WorkspacePanel>

        <WorkspacePanel title="Pending Approvals" description="Approve, reject, or modify workflow.">
          {selected ? (
            <div className="space-y-3">
              <Input
                placeholder="Decision notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => {
                    try {
                      workflowService.approveRequest(session.tenantId, selected.id, session, notes);
                      setStatusMessage("Request approved successfully.");
                      setNotes("");
                      setVersion((prev) => prev + 1);
                    } catch (err) {
                      setErrorMessage("Approval failed.");
                    }
                  }}
                >
                  Approve
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    try {
                      workflowService.modifyRequest(session.tenantId, selected.id, session, notes);
                      setStatusMessage("Request status set to MODIFIED/RETURNED.");
                      setNotes("");
                      setVersion((prev) => prev + 1);
                    } catch (err) {
                      setErrorMessage("Modification failed.");
                    }
                  }}
                >
                  Modify
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    try {
                      workflowService.rejectRequest(session.tenantId, selected.id, session, notes);
                      setStatusMessage("Request rejected.");
                      setNotes("");
                      setVersion((prev) => prev + 1);
                    } catch (err) {
                      setErrorMessage("Rejection failed.");
                    }
                  }}
                >
                  Reject
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
              Select a request to act on it.
            </div>
          )}
        </WorkspacePanel>
      </div>

      <WorkspacePanel title="Audit Trail" description="Immutable approval history.">
        <DataTableShell total={auditTrail.length} page={1} pageSize={10}>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Action</th>
                <th className="p-3 text-left">Actor</th>
                <th className="p-3 text-left">Cycle</th>
                <th className="p-3 text-left">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {auditTrail.map((entry) => (
                <tr
                  key={entry.id}
                  className="cursor-pointer border-t hover:bg-muted/50"
                  onClick={() => setSelectedAuditEntry(entry)}
                >
                  <td className="p-3">{entry.action}</td>
                  <td className="p-3 text-muted-foreground">{entry.actorRole}</td>
                  <td className="p-3 text-muted-foreground">{entry.cycle}</td>
                  <td className="p-3 text-muted-foreground">{entry.createdAt.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTableShell>
      </WorkspacePanel>

      <WorkspacePanel title="Insights" description="FlowGate activity overview.">
        <div className="grid gap-3 md:grid-cols-3 text-sm text-muted-foreground">
          <div className="rounded-lg border p-3">
            <p className="text-xs">Total requests</p>
            <p className="text-lg font-semibold text-foreground">{workflows.length}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs">Pending</p>
            <p className="text-lg font-semibold text-foreground">
              {workflows.filter((flow) => flow.status === "PENDING").length}
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs">Returned</p>
            <p className="text-lg font-semibold text-foreground">
              {workflows.filter((flow) => flow.status === "RETURNED").length}
            </p>
          </div>
        </div>
      </WorkspacePanel>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Workflow Route</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={entityType} onValueChange={(value) => setEntityType(value as typeof entityType)}>
              <SelectTrigger>
                <SelectValue placeholder="Entity type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PAYROLL">Payroll</SelectItem>
                <SelectItem value="LEAVE">Leave</SelectItem>
                <SelectItem value="CONTRACT">Contract</SelectItem>
                <SelectItem value="RECRUITMENT">Recruitment</SelectItem>
                <SelectItem value="TRAINING">Training</SelectItem>
                <SelectItem value="PERFORMANCE">Performance</SelectItem>
                <SelectItem value="CASE">Case</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Entity ID"
              value={entityId}
              onChange={(event) => setEntityId(event.target.value)}
            />
            <Select value={destinationDept} onValueChange={setDestinationDept}>
              <SelectTrigger>
                <SelectValue placeholder="Destination dept" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="HR">HR</SelectItem>
                <SelectItem value="FINANCE">Finance</SelectItem>
                <SelectItem value="LEGAL">Legal</SelectItem>
                <SelectItem value="OPERATIONS">Operations</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
            <Button
              onClick={() => {
                try {
                  workflowService.createRequest(session.tenantId, session, {
                    entityType,
                    entityId: entityId || `${entityType.toLowerCase()}-${Date.now()}`,
                    makerDept: session.departmentId,
                    destinationDept,
                    notes,
                  });
                  setStatusMessage(`New ${entityType} route created successfully.`);
                  setEntityId("");
                  setNotes("");
                  setDialogOpen(false);
                  setVersion((prev) => prev + 1);
                } catch (err) {
                  setErrorMessage("Failed to create route.");
                }
              }}
            >
              Create Route
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Workflow Case Detail</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-2">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <span className="text-muted-foreground block text-xs uppercase tracking-wider">Type</span>
                <span className="font-bold text-primary">{selected?.entityType}</span>
              </div>
              <div className="space-y-1 text-right">
                <span className="text-muted-foreground block text-xs uppercase tracking-wider">Status</span>
                <ApprovalStatusBadge status={selected?.status || "UNKNOWN"} />
              </div>
              <div className="space-y-1">
                <span className="text-muted-foreground block text-xs uppercase tracking-wider">Maker Dept</span>
                <span>{selected?.makerDept}</span>
              </div>
              <div className="space-y-1 text-right">
                <span className="text-muted-foreground block text-xs uppercase tracking-wider">Created</span>
                <span className="font-mono text-xs">{selected?.requestedAt}</span>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold mb-3">Routing Pipeline</h4>
              <div className="space-y-2">
                {selected?.steps.map((step, idx) => (
                  <div key={step.id} className="flex items-center gap-3 rounded-md border p-2 bg-muted/30">
                    <span className="text-xs text-muted-foreground">#{idx + 1}</span>
                    <div className="flex-1">
                      <p className="text-xs font-medium">{step.label}</p>
                      <p className="text-[10px] text-muted-foreground italic">{step.dept}</p>
                    </div>
                    <ApprovalStatusBadge status={step.status} />
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold mb-3">Action context</h4>
              <p className="text-sm text-foreground bg-muted p-3 rounded-md min-h-[60px]">
                {selected?.notes || "No additional notes provided by initiator."}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedAuditEntry} onOpenChange={() => setSelectedAuditEntry(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Audit Entry Detail</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 text-sm gap-y-2">
              <span className="text-muted-foreground">Action:</span>
              <span className="font-semibold">{selectedAuditEntry?.action}</span>
              <span className="text-muted-foreground">Actor:</span>
              <span>{selectedAuditEntry?.actorId} ({selectedAuditEntry?.actorRole})</span>
              <span className="text-muted-foreground">Cycle:</span>
              <span>Cycle {selectedAuditEntry?.cycle}</span>
              <span className="text-muted-foreground">Timestamp:</span>
              <span>{selectedAuditEntry?.createdAt}</span>
            </div>
            <div className="border-t pt-2 text-xs text-muted-foreground">
              <p>This is an immutable record of the workflow transition. Any modifications to the route itself are logged in the kernel system audit.</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
