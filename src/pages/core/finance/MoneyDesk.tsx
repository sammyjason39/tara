import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { DataTableShell } from "@/core/tools/DataTableShell";
import { FilterBar } from "@/core/tools/FilterBar";
import { WorkflowRequestCard } from "@/core/tools/WorkflowRequestCard";
import { ApprovalStatusBadge } from "@/core/tools/ApprovalStatusBadge";
import { useSession } from "@/core/security/session";
import {
  FinanceAlert,
  financeService,
} from "@/core/services/finance/financeService";
import { workflowService } from "@/core/services/hr/workflowService";
import { logService } from "@/core/services/finance/logService";
import { WorkflowRequest } from "@/core/workflow/types";

type PaymentMethod =
  | "BANK_TRANSFER"
  | "QRIS"
  | "GOPAY"
  | "OVO"
  | "DANA"
  | "SHOPEEPAY";

export default function MoneyDesk() {
  const session = useSession();

  // UI State
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"approvals" | "alerts" | "tasks">("approvals");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [amount, setAmount] = useState("5000000");
  const [method, setMethod] = useState<PaymentMethod>("BANK_TRANSFER");
  const [destination, setDestination] = useState("Vendor A");
  const [purpose, setPurpose] = useState("Payment request");

  // Mock workflow data
  const approvals = useMemo(
    () =>
      workflowService.listRequests(session.tenantId, { entityType: "PAYROLL" }),
    [session],
  );

  const [alerts, setAlerts] = useState<FinanceAlert[]>([]);
  const [tasks, setTasks] = useState<WorkflowRequest[]>([]);

  // Fetch alerts and tasks on mount / session change
  useEffect(() => {
    financeService.getAlerts(session.tenantId, session).then((data) => {
    setAlerts(data.map((a) => ({
      id: a.id,
      title: a.message, // or a.name depending on your type
      status: a.status.toLowerCase() as "pending" | "approved" | "rejected",
    })));
  });
}, [session]);
    financeService.getInbox(session.tenantId, session).then(setTasks);
  }, [session]);

  // Filters
  const filteredApprovals = approvals.filter((item) =>
    search ? item.entityId.toLowerCase().includes(search.toLowerCase()) : true,
  );
  const filteredAlerts = alerts.filter((item) =>
    search ? item.title.toLowerCase().includes(search.toLowerCase()) : true,
  );
  const filteredTasks = tasks.filter((item) =>
    search ? item.title.toLowerCase().includes(search.toLowerCase()) : true,
  );

  // Handle submission of payment request
  const submitPaymentRequest = () => {
    const request = {
      amount: Number(amount || "0"),
      method,
      destination,
      purpose,
      tenantId: session.tenantId,
      requestedBy: session.userId,
      approvalStages: ["Finance", "DeptHead", "CFO"], // multi-level
    };

    // Mock API call
    financeService.createPaymentRequest(session.tenantId, session, request);

    // Log action
    logService.log(
      session.tenantId,
      session.userId,
      `Created Payment Request: ${JSON.stringify(request)}`,
    );

    // Close dialog
    setDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="MoneyDesk"
        subtitle="Finance operational inbox: approvals, alerts, tasks, and cash anomalies."
        primaryAction={
          <Button onClick={() => setDialogOpen(true)}>
            Create Payment Request
          </Button>
        }
        secondaryActions={
          <Input
            placeholder="Search approvals, alerts, tasks"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-w-[220px]"
          />
        }
      />

      {/* WorkQueue Panel */}
      <WorkspacePanel
        title="WorkQueue"
        description="Active approvals, alerts, and tasks."
      >
        <Tabs
          value={tab}
          onValueChange={(value) => setTab(value as typeof tab)}
        >
          <TabsList>
            <TabsTrigger value="approvals">Approvals</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
          </TabsList>

          {/* Approvals */}
          <TabsContent value="approvals" className="mt-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredApprovals.map((flow) => (
                <WorkflowRequestCard
                  key={flow.id}
                  title={`${flow.entityType} · ${flow.entityId}`}
                  subtitle={`Dept: ${flow.destinationDept}`}
                  status={flow.status}
                  urgency={flow.status === "PENDING" ? 80 : 50}
                  owner={flow.destinationDept}
                  actionLabel="Open"
                  onAction={() => setDialogOpen(true)}
                />
              ))}
            </div>
          </TabsContent>

          {/* Alerts */}
          <TabsContent value="alerts" className="mt-4">
            {filteredAlerts.length ? (
              filteredAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="rounded-lg border p-3 mb-2 flex justify-between items-center"
                >
                  <p>{alert.title}</p>
                  <ApprovalStatusBadge status={alert.status} />
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No alerts. Integration with finance services coming soon.
              </div>
            )}
          </TabsContent>

          {/* Tasks */}
          <TabsContent value="tasks" className="mt-4">
            {filteredTasks.length ? (
              filteredTasks.map((task) => (
                <div
                  key={task.id}
                  className="rounded-lg border p-3 mb-2 flex justify-between items-center"
                >
                  <p>{task.title}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDialogOpen(true)}
                  >
                    Open
                  </Button>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No tasks. Sync with other modules ready.
              </div>
            )}
          </TabsContent>
        </Tabs>
      </WorkspacePanel>

      {/* Active Records Panel */}
      <WorkspacePanel
        title="Active Records"
        description="All approvals, alerts, and tasks in table view."
      >
        <FilterBar searchValue={search} onSearchChange={setSearch} />
        <DataTableShell total={filteredApprovals.length} page={1} pageSize={10}>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Item</th>
                <th className="p-3 text-left">Type</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Requested By</th>
              </tr>
            </thead>
            <tbody>
              {filteredApprovals.map((flow) => (
                <tr key={flow.id} className="border-t">
                  <td className="p-3">{flow.entityId}</td>
                  <td className="p-3 text-muted-foreground">
                    {flow.entityType}
                  </td>
                  <td className="p-3">
                    <ApprovalStatusBadge status={flow.status} />
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {flow.requestedBy}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTableShell>
      </WorkspacePanel>

      {/* Payment Request Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Payment Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount"
            />
            <Select
              value={method}
              onValueChange={(v: string) => setMethod(v as PaymentMethod)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                <SelectItem value="QRIS">QRIS</SelectItem>
                <SelectItem value="GOPAY">GoPay</SelectItem>
                <SelectItem value="OVO">OVO</SelectItem>
                <SelectItem value="DANA">Dana</SelectItem>
                <SelectItem value="SHOPEEPAY">ShopeePay</SelectItem>
              </SelectContent>
            </Select>
            <Input
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Destination"
            />
            <Textarea
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="Purpose"
            />
            <div className="flex justify-end gap-2">
              <Button onClick={submitPaymentRequest}>Submit & Route</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
