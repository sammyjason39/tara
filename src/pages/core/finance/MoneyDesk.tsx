import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { DataTableShell } from "@/core/tools/DataTableShell";
import { FilterBar } from "@/core/tools/FilterBar";
import { WorkflowRequestCard } from "@/core/tools/WorkflowRequestCard";
import { ApprovalStatusBadge } from "@/core/tools/ApprovalStatusBadge";
import { useSession } from "@/core/security/session";
import { financeService } from "@/core/services/finance/financeService";
import { workflowService } from "@/core/services/hr/workflowService";

export default function MoneyDesk() {
  const session = useSession();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"approvals" | "alerts" | "tasks">("approvals");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [amount, setAmount] = useState("5000000");
  const [method, setMethod] = useState("BANK_TRANSFER");
  const [destination, setDestination] = useState("Vendor A");
  const [purpose, setPurpose] = useState("Payment request");

  const approvals = useMemo(
    () => workflowService.listRequests(session.tenantId, { entityType: "PAYROLL" }),
    [session],
  );
  const alerts = useMemo(
    () => financeService.getAlerts(session.tenantId, session),
    [session],
  );

  const filteredApprovals = approvals.filter((item) =>
    search ? item.entityId.toLowerCase().includes(search.toLowerCase()) : true,
  );
  const filteredAlerts = alerts.filter((item) =>
    search ? item.title.toLowerCase().includes(search.toLowerCase()) : true,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="MoneyDesk"
        subtitle="Finance operational inbox: approvals, alerts, and cash anomalies."
        primaryAction={<Button onClick={() => setDialogOpen(true)}>Create Payment Request</Button>}
        secondaryActions={
          <Input
            placeholder="Search approvals, alerts"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-w-[220px]"
          />
        }
      />

      <WorkspacePanel title="WorkQueue" description="Approvals and alerts requiring action.">
        <Tabs value={tab} onValueChange={(value) => setTab(value as typeof tab)}>
          <TabsList>
            <TabsTrigger value="approvals">Approvals</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
          </TabsList>

          <TabsContent value="approvals" className="mt-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredApprovals.slice(0, 6).map((flow) => (
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

          <TabsContent value="alerts" className="mt-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredAlerts.slice(0, 6).map((alert) => (
                <WorkflowRequestCard
                  key={alert.id}
                  title={alert.title}
                  subtitle={alert.description}
                  status={alert.severity.toUpperCase()}
                  urgency={alert.severity === "high" ? 90 : alert.severity === "medium" ? 70 : 40}
                  owner={alert.type}
                  actionLabel={alert.action ?? "Open"}
                  onAction={() => setDialogOpen(true)}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="tasks" className="mt-4">
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              Tasks sync coming soon (integration hook ready).
            </div>
          </TabsContent>
        </Tabs>
      </WorkspacePanel>

      <WorkspacePanel title="Active Records" description="Finance approvals and alerts table view.">
        <FilterBar searchValue={search} onSearchChange={setSearch} />
        <DataTableShell total={filteredApprovals.length} page={1} pageSize={10}>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Item</th>
                <th className="p-3 text-left">Type</th>
                <th className="p-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredApprovals.map((flow) => (
                <tr key={flow.id} className="border-t">
                  <td className="p-3">{flow.entityId}</td>
                  <td className="p-3 text-muted-foreground">{flow.entityType}</td>
                  <td className="p-3">
                    <ApprovalStatusBadge status={flow.status} />
                  </td>
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
            <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" />
            <Select value={method} onValueChange={setMethod}>
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
            <Input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Destination" />
            <Textarea value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Purpose" />
            <div className="flex justify-end gap-2">
              <Button
                onClick={() => {
                  financeService.createPaymentRequest(session.tenantId, session, {
                    amount: Number(amount || "0"),
                    method,
                    destination,
                    purpose,
                  });
                  setDialogOpen(false);
                }}
              >
                Submit & Route
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
