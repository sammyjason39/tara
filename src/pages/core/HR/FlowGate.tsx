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
import { useSession } from "@/core/security/session";
import { workflowService } from "@/core/services/hr/workflowService";
import { useBackgroundRefresh } from "@/core/runtime/events/useBackgroundRefresh";

export default function FlowGate() {
  const session = useSession();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [version, setVersion] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [entityType, setEntityType] = useState<"PAYROLL" | "LEAVE" | "CONTRACT" | "RECRUITMENT" | "TRAINING" | "PERFORMANCE" | "CASE">("PAYROLL");
  const [entityId, setEntityId] = useState("");
  const [destinationDept, setDestinationDept] = useState("HR");
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
              <Button size="sm" variant="outline" className="mt-3" onClick={() => setSelectedId(flow.id)}>
                Open
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
                    workflowService.approveRequest(session.tenantId, selected.id, session, notes);
                    setNotes("");
                    setVersion((prev) => prev + 1);
                  }}
                >
                  Approve
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    workflowService.modifyRequest(session.tenantId, selected.id, session, notes);
                    setNotes("");
                    setVersion((prev) => prev + 1);
                  }}
                >
                  Modify
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    workflowService.rejectRequest(session.tenantId, selected.id, session, notes);
                    setNotes("");
                    setVersion((prev) => prev + 1);
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
                <tr key={entry.id} className="border-t">
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
                workflowService.createRequest(session.tenantId, session, {
                  entityType,
                  entityId: entityId || `${entityType.toLowerCase()}-${Date.now()}`,
                  makerDept: session.departmentId,
                  destinationDept,
                  notes,
                });
                setEntityId("");
                setNotes("");
                setDialogOpen(false);
                setVersion((prev) => prev + 1);
              }}
            >
              Create Route
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
