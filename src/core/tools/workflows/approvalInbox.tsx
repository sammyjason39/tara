import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { DataTableShell } from "@/core/tools/DataTableShell";
import { ApprovalStatusBadge } from "@/core/tools/ApprovalStatusBadge";
import type { SessionContext } from "@/core/security/session";
import { workflowService } from "@/core/services/hr/workflowService";
import type { WorkflowRequest, WorkflowStatus } from "@/core/tools/workflows/workflowTypes";

type ApprovalInboxProps = {
  tenantId: string;
  session: SessionContext;
};

export function ApprovalInbox({ tenantId, session }: ApprovalInboxProps) {
  const [search, setSearch] = useState("");
  const [version, setVersion] = useState(0);
  const [tab, setTab] = useState<"ALL" | WorkflowStatus>("PENDING");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  const workflows = useMemo(
    () => workflowService.listInbox(tenantId, session),
    [tenantId, session, version],
  );

  const statusCounts = workflows.reduce(
    (acc, flow) => {
      acc.ALL += 1;
      acc[flow.status] = (acc[flow.status] ?? 0) + 1;
      return acc;
    },
    {
      ALL: 0,
      PENDING: 0,
      APPROVED: 0,
      REJECTED: 0,
      RETURNED: 0,
      MODIFIED: 0,
    } as Record<"ALL" | WorkflowStatus, number>,
  );

  const filtered = workflows.filter((flow) => {
    if (tab !== "ALL" && flow.status !== tab) return false;
    if (!search) return true;
    const query = search.toLowerCase();
    return (
      flow.entityId.toLowerCase().includes(query) ||
      flow.entityType.toLowerCase().includes(query) ||
      flow.destinationDept.toLowerCase().includes(query) ||
      flow.makerDept.toLowerCase().includes(query) ||
      (flow.notes ?? "").toLowerCase().includes(query)
    );
  });

  const selected = workflows.find((flow) => flow.id === selectedId) ?? null;
  const auditTrail = selected ? workflowService.listAudit(tenantId, selected.id) : [];

  const handleAction = (
    action: "approve" | "reject" | "modify",
    flow: WorkflowRequest,
  ) => {
    if (action === "approve") {
      workflowService.approveRequest(tenantId, flow.id, session, notes || undefined);
    }
    if (action === "reject") {
      workflowService.rejectRequest(tenantId, flow.id, session, notes || undefined);
    }
    if (action === "modify") {
      workflowService.modifyRequest(tenantId, flow.id, session, notes || undefined);
    }
    setNotes("");
    setVersion((prev) => prev + 1);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search approvals"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="min-w-[240px]"
        />
        <Badge variant="outline">Dept: {session.departmentId}</Badge>
      </div>

      <Tabs value={tab} onValueChange={(value) => setTab(value as "ALL" | WorkflowStatus)}>
        <TabsList>
          <TabsTrigger value="PENDING">Pending ({statusCounts.PENDING})</TabsTrigger>
          <TabsTrigger value="APPROVED">Approved ({statusCounts.APPROVED})</TabsTrigger>
          <TabsTrigger value="RETURNED">Returned ({statusCounts.RETURNED})</TabsTrigger>
          <TabsTrigger value="REJECTED">Rejected ({statusCounts.REJECTED})</TabsTrigger>
          <TabsTrigger value="ALL">All ({statusCounts.ALL})</TabsTrigger>
        </TabsList>
        <TabsContent value={tab} className="mt-3">
          <DataTableShell total={filtered.length} page={1} pageSize={10}>
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-3 text-left">Entity</th>
                  <th className="p-3 text-left">Route</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((flow) => (
                  <tr key={flow.id} className="border-t">
                    <td className="p-3">
                      <p className="font-medium">{flow.entityType}</p>
                      <p className="text-xs text-muted-foreground">{flow.entityId}</p>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      <div className="flex flex-col text-xs">
                        <span>Maker: {flow.makerDept}</span>
                        <span>Dest: {flow.destinationDept}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <ApprovalStatusBadge status={flow.status} />
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedId(flow.id)}
                        >
                          Open
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleAction("approve", flow)}
                          disabled={flow.status !== "PENDING"}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAction("modify", flow)}
                          disabled={flow.status !== "PENDING"}
                        >
                          Return
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleAction("reject", flow)}
                          disabled={flow.status !== "PENDING"}
                        >
                          Reject
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DataTableShell>
        </TabsContent>
      </Tabs>

      <Sheet open={Boolean(selectedId)} onOpenChange={(open) => !open && setSelectedId(null)}>
        <SheetContent className="w-full sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Workflow Detail</SheetTitle>
            <SheetDescription>
              Review route, audit trail, and take action.
            </SheetDescription>
          </SheetHeader>
          {selected ? (
            <div className="mt-4 space-y-4">
              <div className="space-y-1 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Entity</span>
                  <span className="font-medium">{selected.entityType}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Request</span>
                  <span className="font-medium">{selected.entityId}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <ApprovalStatusBadge status={selected.status} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Requested by</span>
                  <span className="font-medium">{selected.requestedBy}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Requested at</span>
                  <span className="font-medium">{selected.requestedAt.slice(0, 10)}</span>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="text-sm font-semibold text-foreground">Route Steps</p>
                {selected.steps.map((step, index) => (
                  <div key={step.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                    <div>
                      <p className="font-medium">{step.label}</p>
                      <p className="text-xs text-muted-foreground">
                        Step {index + 1} · Dept {step.dept}
                      </p>
                    </div>
                    <ApprovalStatusBadge status={step.status} />
                  </div>
                ))}
              </div>

              {selected.metadata && Object.keys(selected.metadata).length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-foreground">Metadata</p>
                  <div className="rounded-lg border p-3 text-xs text-muted-foreground">
                    {Object.entries(selected.metadata).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between">
                        <span>{key}</span>
                        <span className="font-medium text-foreground">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-sm font-semibold text-foreground">Decision Notes</p>
                <Textarea
                  placeholder="Add notes for audit trail"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => handleAction("approve", selected)}
                    disabled={selected.status !== "PENDING"}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleAction("modify", selected)}
                    disabled={selected.status !== "PENDING"}
                  >
                    Return
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleAction("reject", selected)}
                    disabled={selected.status !== "PENDING"}
                  >
                    Reject
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="text-sm font-semibold text-foreground">Audit Trail</p>
                {auditTrail.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                    No audit entries yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {auditTrail.map((entry) => (
                      <div key={entry.id} className="rounded-lg border p-3 text-xs text-muted-foreground">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-foreground">{entry.action}</span>
                          <span>{entry.createdAt.slice(0, 10)}</span>
                        </div>
                        <p>Actor: {entry.actorRole}</p>
                        <p>Cycle: {entry.cycle}</p>
                        {entry.notes && <p>Notes: {entry.notes}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              Select a workflow to inspect details.
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default ApprovalInbox;
