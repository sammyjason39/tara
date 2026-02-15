import { useCallback, useEffect, useMemo, useState } from "react";
// cspell:ignore qris gopay shopeepay
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { DataTableShell } from "@/core/tools/DataTableShell";
import { FilterBar } from "@/core/tools/FilterBar";
import { WorkflowRequestCard } from "@/core/tools/WorkflowRequestCard";
import { ApprovalStatusBadge } from "@/core/tools/ApprovalStatusBadge";
import { useSession } from "@/core/security/session";
import { workflowService } from "@/core/services/hr/workflowService";
import { financeService, type FinanceAlert } from "@/core/services/finance/financeService";
import { logService } from "@/core/services/finance/logService";
import type { PaymentMethod } from "@/core/types/finance/payments";
import type { WorkflowRequest } from "@/core/tools/workflows/workflowTypes";

const PAYMENT_METHODS: PaymentMethod[] = [
  "BANK_TRANSFER",
  "QRIS",
  "GOPAY",
  "OVO",
  "DANA",
  "SHOPEEPAY",
  "CARD",
];

export default function MoneyDesk() {
  const session = useSession();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"approvals" | "alerts" | "tasks">("approvals");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("BANK_TRANSFER");
  const [destination, setDestination] = useState("");
  const [purpose, setPurpose] = useState("");

  const [alerts, setAlerts] = useState<FinanceAlert[]>([]);
  const [tasks, setTasks] = useState<WorkflowRequest[]>([]);
  const [approvals, setApprovals] = useState<WorkflowRequest[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowRequest | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<FinanceAlert | null>(null);

  const refreshDesk = useCallback(() => {
    financeService.getAlerts(session.tenantId, session).then(setAlerts);
    financeService.getInbox(session.tenantId, session).then(setTasks);
    setApprovals(
      workflowService
        .listInbox(session.tenantId, session, "PENDING")
        .filter((item) => item.destinationDept === "FINANCE"),
    );
  }, [session]);

  useEffect(() => {
    refreshDesk();
  }, [refreshDesk]);

  const filteredApprovals = useMemo(
    () =>
      approvals.filter((item) =>
        search ? item.entityId.toLowerCase().includes(search.toLowerCase()) : true,
      ),
    [approvals, search],
  );

  const filteredAlerts = useMemo(
    () =>
      alerts.filter((item) =>
        search ? item.title.toLowerCase().includes(search.toLowerCase()) : true,
      ),
    [alerts, search],
  );

  const filteredTasks = useMemo(
    () =>
      tasks.filter((item) =>
        search ? item.entityId.toLowerCase().includes(search.toLowerCase()) : true,
      ),
    [tasks, search],
  );

  const submitPaymentRequest = async () => {
    try {
      await financeService.createPaymentRequest(session.tenantId, session, {
        amount: Number(amount || "0"),
        method,
        destination,
        purpose,
      });
      logService.log(
        session.tenantId,
        session.userId,
        "Created payment request from MoneyDesk",
        `${destination} - ${amount}`,
      );
      setErrorMessage(null);
      setStatusMessage("Payment request created and routed.");
      setDialogOpen(false);
      refreshDesk();
    } catch (error) {
      setStatusMessage(null);
      setErrorMessage(error instanceof Error ? error.message : "Failed to create payment request.");
    }
  };

  const approveTask = (workflowId: string) => {
    try {
      workflowService.approveRequest(session.tenantId, workflowId, session, "Approved from MoneyDesk");
      logService.log(session.tenantId, session.userId, "Workflow approved", workflowId);
      setErrorMessage(null);
      setStatusMessage(`Workflow ${workflowId} approved.`);
      refreshDesk();
    } catch (error) {
      setStatusMessage(null);
      setErrorMessage(error instanceof Error ? error.message : "Failed to approve workflow.");
    }
  };

  const rejectTask = (workflowId: string) => {
    try {
      workflowService.rejectRequest(session.tenantId, workflowId, session, "Rejected from MoneyDesk");
      logService.log(session.tenantId, session.userId, "Workflow rejected", workflowId);
      setErrorMessage(null);
      setStatusMessage(`Workflow ${workflowId} rejected.`);
      refreshDesk();
    } catch (error) {
      setStatusMessage(null);
      setErrorMessage(error instanceof Error ? error.message : "Failed to reject workflow.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Money Desk"
        subtitle="Finance operating inbox for approvals, alerts, and routed tasks."
        primaryAction={<Button onClick={() => setDialogOpen(true)}>Create Payment Request</Button>}
        secondaryActions={
          <Input
            placeholder="Search approvals, alerts, or tasks"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="min-w-[220px]"
          />
        }
      />

      <WorkspacePanel title="Work Queue" description="Cross-module approvals and operational alerts.">
        {statusMessage ? (
          <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {statusMessage}
          </div>
        ) : null}
        {errorMessage ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {errorMessage}
          </div>
        ) : null}
        <Tabs value={tab} onValueChange={(value) => setTab(value as typeof tab)}>
          <TabsList>
            <TabsTrigger value="approvals">Approvals</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
          </TabsList>

          <TabsContent value="approvals" className="mt-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredApprovals.map((flow) => (
                <WorkflowRequestCard
                  key={flow.id}
                  title={`${flow.entityType} | ${flow.entityId}`}
                  subtitle={`From ${flow.makerDept} to ${flow.destinationDept}`}
                  status={flow.status}
                  urgency={flow.status === "PENDING" ? 80 : 40}
                  owner={flow.destinationDept}
                  actionLabel="Review"
                  onAction={() => setSelectedWorkflow(flow)}
                  footer={
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" variant="outline" onClick={() => approveTask(flow.id)}>
                        Approve
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => rejectTask(flow.id)}>
                        Reject
                      </Button>
                    </div>
                  }
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="alerts" className="mt-4">
            {filteredAlerts.length ? (
              filteredAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="mb-2 flex cursor-pointer items-center justify-between rounded-lg border p-3 hover:bg-muted/50"
                  onClick={() => setSelectedAlert(alert)}
                >
                  <div>
                    <p className="font-medium text-foreground">{alert.title}</p>
                    <p className="text-xs text-muted-foreground">{alert.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <ApprovalStatusBadge status={alert.severity.toUpperCase()} />
                    {alert.action ? <Badge variant="outline">{alert.action}</Badge> : null}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No active alerts for this tenant.
              </div>
            )}
          </TabsContent>

          <TabsContent value="tasks" className="mt-4">
            {filteredTasks.length ? (
              filteredTasks.map((task) => (
                <div
                  key={task.id}
                  className="mb-2 flex cursor-pointer items-center justify-between rounded-lg border p-3 hover:bg-muted/50"
                  onClick={() => setSelectedWorkflow(task)}
                >
                  <div>
                    <p className="font-medium text-foreground">
                      {task.entityType} | {task.entityId}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Routed to {task.destinationDept}
                    </p>
                  </div>
                  <ApprovalStatusBadge status={task.status} />
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No tasks routed to Finance.
              </div>
            )}
          </TabsContent>
        </Tabs>
      </WorkspacePanel>

      <WorkspacePanel title="Active Records" description="Live table for finance workflows.">
        <FilterBar searchValue={search} onSearchChange={setSearch} />
        <DataTableShell total={filteredTasks.length} page={1} pageSize={10}>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Entity</th>
                <th className="p-3 text-left">Type</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Requested By</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map((task) => (
                <tr
                  key={task.id}
                  className="cursor-pointer border-t hover:bg-muted/50"
                  onClick={() => setSelectedWorkflow(task)}
                >
                  <td className="p-3">{task.entityId}</td>
                  <td className="p-3 text-muted-foreground">{task.entityType}</td>
                  <td className="p-3">
                    <ApprovalStatusBadge status={task.status} />
                  </td>
                  <td className="p-3 text-muted-foreground">{task.requestedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTableShell>
      </WorkspacePanel>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Payment Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Amount" />
            <Select value={method} onValueChange={(value) => setMethod(value as PaymentMethod)}>
              <SelectTrigger>
                <SelectValue placeholder="Method" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((paymentMethod) => (
                  <SelectItem key={paymentMethod} value={paymentMethod}>
                    {paymentMethod}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={destination}
              onChange={(event) => setDestination(event.target.value)}
              placeholder="Destination"
            />
            <Textarea value={purpose} onChange={(event) => setPurpose(event.target.value)} placeholder="Purpose" />
            <div className="flex justify-end gap-2">
              <Button onClick={submitPaymentRequest}>Create and Route</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedWorkflow} onOpenChange={() => setSelectedWorkflow(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Workflow Detail</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 text-sm gap-y-2">
              <span className="text-muted-foreground">Flow ID:</span>
              <span className="font-mono">{selectedWorkflow?.id}</span>
              <span className="text-muted-foreground">Entity:</span>
              <span className="font-semibold">{selectedWorkflow?.entityType} | {selectedWorkflow?.entityId}</span>
              <span className="text-muted-foreground">Maker Dept:</span>
              <span>{selectedWorkflow?.makerDept}</span>
              <span className="text-muted-foreground">Requested By:</span>
              <span>{selectedWorkflow?.requestedBy}</span>
              <span className="text-muted-foreground">Status:</span>
              <span><ApprovalStatusBadge status={selectedWorkflow?.status || "PENDING"} /></span>
            </div>
            <div className="border-t pt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Finance Review Notes</p>
              <p className="text-xs text-muted-foreground">
                This request was automatically routed based on departmental thresholds.
                Verify supporting documentation in Finance Docs if required.
              </p>
              {selectedWorkflow?.status === "PENDING" && (
                <div className="mt-4 flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => {
                      if (selectedWorkflow) {
                        approveTask(selectedWorkflow.id);
                        setSelectedWorkflow(null);
                      }
                    }}
                  >
                    Approve
                  </Button>
                  <Button
                    className="flex-1"
                    variant="destructive"
                    onClick={() => {
                      if (selectedWorkflow) {
                        rejectTask(selectedWorkflow.id);
                        setSelectedWorkflow(null);
                      }
                    }}
                  >
                    Reject
                  </Button>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedAlert} onOpenChange={() => setSelectedAlert(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Operational Alert</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="rounded-lg bg-rose-50 border border-rose-100 p-3 text-rose-900">
              <p className="font-bold">{selectedAlert?.title}</p>
              <p className="text-sm">{selectedAlert?.description}</p>
            </div>
            <div className="grid grid-cols-2 text-sm gap-y-2">
              <span className="text-muted-foreground">Severity:</span>
              <span className="font-bold uppercase">{selectedAlert?.severity}</span>
              <span className="text-muted-foreground">Action Needed:</span>
              <span className="font-semibold">{selectedAlert?.action || "None"}</span>
            </div>
            <div className="border-t pt-2 text-xs text-muted-foreground">
              <p>Triggered by automated treasury monitoring. System suggests immediate review of linked accounts.</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
