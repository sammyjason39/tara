import { useCallback, useEffect, useMemo, useState } from "react";
// cspell:ignore qris gopay shopeepay
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CreditCard, Send, CheckCircle2, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { DataTableShell } from "@/core/tools/DataTableShell";
import { FilterBar } from "@/core/tools/FilterBar";
import { WorkflowRequestCard } from "@/core/tools/WorkflowRequestCard";
import { ApprovalStatusBadge } from "@/core/tools/ApprovalStatusBadge";
import { useSession } from "@/core/security/session";
import { financeService } from "@/core/services/finance/financeService";
import { logService } from "@/core/services/finance/logService";
import { Landmark, TrendingUp, TrendingDown, ArrowRightLeft, AlertTriangle } from "lucide-react";
import { formatNumber } from "@/lib/format";
import type { FinanceAlert } from "@/core/types/finance/assets";
import type {
  PaymentMethod,
  FinancePaymentRow,
} from "@/core/types/finance/payments";
import type { WorkflowRequest } from "@/core/tools/workflows/workflowTypes";
import { CreatePaymentModal } from "@/core/finance/FinanceModalForms";

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
  const [tab, setTab] = useState<"approvals" | "alerts" | "tasks" | "payments" | "sources">(
    "approvals",
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("BANK_TRANSFER");
  const [destination, setDestination] = useState("");
  const [purpose, setPurpose] = useState("");

  const [source, setSource] = useState("");
  const [department, setDepartment] = useState("");
  const [extraInfo, setExtraInfo] = useState("");

  const [alerts, setAlerts] = useState<FinanceAlert[]>([]);
  const [tasks, setTasks] = useState<WorkflowRequest[]>([]);
  const [approvals, setApprovals] = useState<WorkflowRequest[]>([]);
  const [moneySources, setMoneySources] = useState<
    Array<{ id: string; name: string; currency: string }>
  >([]);
  const [payments, setPayments] = useState<FinancePaymentRow[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedWorkflow, setSelectedWorkflow] =
    useState<WorkflowRequest | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<FinanceAlert | null>(null);
  const [editingSource, setEditingSource] = useState<any>(null);
  const [limitMin, setLimitMin] = useState("");
  const [limitMax, setLimitMax] = useState("");
  const [isUpdatingLimit, setIsUpdatingLimit] = useState(false);

  const refreshDesk = useCallback(() => {
    financeService
      .getInbox(session.tenant_id, session)
      .then((inbox) => {
        if (inbox.alerts) {
          setAlerts(inbox.alerts);
        }
        if (inbox.pendingPayments) {
          const mappedTasks: WorkflowRequest[] = (Array.isArray(inbox.pendingPayments) ? inbox.pendingPayments : []).map((p) => ({
            id: p.id,
            tenantId: session.tenant_id,
            entityType: "PAYMENT",
            entityId: p.beneficiary,
            makerDept: "FINANCE",
            destinationDept: "FINANCE",
            status: p.status === "PENDING_APPROVAL" ? "PENDING" : (p.status as any),
            requestedBy: "SYSTEM",
            requestedAt: p.scheduledDate || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            cycle: 1,
            steps: [],
            route: { nodes: [], edges: [], startNodeId: "" },
            currentStepId: "",
          }));
          setTasks(mappedTasks);
          setApprovals((Array.isArray(mappedTasks) ? mappedTasks : []).filter((item) => item.status === "PENDING"));
        }
      })
      .catch(() => {});
    financeService
      .getMoneySources(session.tenant_id, session)
      .then(setMoneySources)
      .catch(() => {});
    financeService
      .listPayments(session.tenant_id, session)
      .then(setPayments)
      .catch(() => {});
  }, [session]);

  useEffect(() => {
    refreshDesk();
  }, [refreshDesk]);

  const filteredApprovals = useMemo(
    () =>
      (Array.isArray(approvals) ? approvals : []).filter((item) =>
        search
          ? item.entityId.toLowerCase().includes(search.toLowerCase())
          : true,
      ),
    [approvals, search],
  );

  const filteredAlerts = useMemo(
    () =>
      (Array.isArray(alerts) ? alerts : []).filter((item) =>
        search ? item.title.toLowerCase().includes(search.toLowerCase()) : true,
      ),
    [alerts, search],
  );

  const filteredTasks = useMemo(
    () =>
      (Array.isArray(tasks) ? tasks : []).filter((item) =>
        search
          ? item.entityId.toLowerCase().includes(search.toLowerCase())
          : true,
      ),
    [tasks, search],
  );

  const filteredPayments = useMemo(
    () =>
      (Array.isArray(payments) ? payments : []).filter((item) =>
        search
          ? item.beneficiary.toLowerCase().includes(search.toLowerCase())
          : true,
      ),
    [payments, search],
  );

  const isHighLevel = ["OWNER", "FINANCE_HOD", "ADMIN"].includes(
    session.role?.toUpperCase() || "",
  );

  const submitPaymentRequest = async () => {
    try {
      let parsedExtra = undefined;
      try {
        if (extraInfo) parsedExtra = JSON.parse(extraInfo);
      } catch (e) {
        // Skip
      }

      await financeService.createPaymentRequest(session.tenant_id, session, {
        amount: Number(amount || "0"),
        method,
        source: source || undefined,
        beneficiary: destination,
        departmentId: department || undefined,
        purpose,
        extraInfo: parsedExtra,
      });
      logService.log(
        session.tenant_id,
        session.user_id,
        "Created payment request from MoneyDesk",
        `${destination} - ${amount}`,
      );
      setErrorMessage(null);
      setStatusMessage(
        isHighLevel
          ? "Payment request directly processed."
          : "Payment request routed for approval.",
      );
      setDialogOpen(false);
      refreshDesk();
    } catch (error) {
      setStatusMessage(null);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to create payment request.",
      );
    }
  };

  const approveTask = (workflowId: string) => {
    financeService
      .updatePaymentStatus(session.tenant_id, workflowId, "APPROVED", session)
      .then(() => {
        logService.log(
          session.tenant_id,
          session.user_id,
          "Workflow approved",
          workflowId,
        );
        setErrorMessage(null);
        setStatusMessage(`Workflow ${workflowId} approved.`);
        refreshDesk();
      })
      .catch((error: Error) => {
        setStatusMessage(null);
        setErrorMessage(error?.message || "Failed to approve workflow.");
      });
  };

  const rejectTask = (workflowId: string) => {
    financeService
      .updatePaymentStatus(session.tenant_id, workflowId, "REJECTED", session)
      .then(() => {
        logService.log(
          session.tenant_id,
          session.user_id,
          "Workflow rejected",
          workflowId,
        );
        setErrorMessage(null);
        setStatusMessage(`Workflow ${workflowId} rejected.`);
        refreshDesk();
      })
      .catch((error: Error) => {
        setStatusMessage(null);
        setErrorMessage(error?.message || "Failed to reject workflow.");
      });
  };

  const handleUpdateLimits = async () => {
    if (!editingSource) return;
    setIsUpdatingLimit(true);
    try {
      await financeService.updateMoneySource(session.tenant_id, editingSource.id, {
        minLimit: limitMin ? Number(limitMin) : null,
        maxLimit: limitMax ? Number(limitMax) : null,
      }, session);
      
      setStatusMessage(`Thresholds updated for ${editingSource.name}`);
      setEditingSource(null);
      refreshDesk();
    } catch (error) {
      setErrorMessage("Failed to update thresholds");
    } finally {
      setIsUpdatingLimit(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Money Desk"
        subtitle="Treasury control center for liquidity management and payment execution."
        primaryAction={
          <Button onClick={() => setDialogOpen(true)}>
            Create Payment Request
          </Button>
        }
        secondaryActions={
          <Input
            placeholder="Search payments or accounts"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="min-w-[220px]"
          />
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        {(Array.isArray(moneySources) ? moneySources : []).slice(0, 3).map((source) => (
          <div key={source.id} className="bg-card p-4 rounded-xl border border-primary/10 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{source.name}</p>
              <p className="text-xl font-black text-primary">{source.currency} {formatNumber((source as any).balance ?? 0)}</p>
            </div>
            <div className="p-2 bg-primary/5 rounded-lg">
              <Landmark className="w-5 h-5 text-primary" />
            </div>
          </div>
        ))}
      </div>

      <WorkspacePanel
        title="Treasury Ops & Work Queue"
        description="Active payment requests and treasury alerts requiring immediate action."
      >
        {statusMessage ? (
          <div className="mb-4 rounded-lg border border-success/30 bg-success px-3 py-2 text-sm text-success">
            {statusMessage}
          </div>
        ) : null}
        {errorMessage ? (
          <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive px-3 py-2 text-sm text-destructive">
            {errorMessage}
          </div>
        ) : null}
        <Tabs
          value={tab}
          onValueChange={(value) => setTab(value as typeof tab)}
        >
          <TabsList>
            <TabsTrigger value="approvals">Approvals</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="sources">Money Sources</TabsTrigger>
          </TabsList>

          <TabsContent value="approvals" className="mt-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {(Array.isArray(filteredApprovals) ? filteredApprovals : []).map((flow) => (
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
                    <div
                      className="flex gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => approveTask(flow.id)}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => rejectTask(flow.id)}
                      >
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
              (Array.isArray(filteredAlerts) ? filteredAlerts : []).map((alert) => (
                <div
                  key={alert.id}
                  className="mb-2 flex cursor-pointer items-center justify-between rounded-lg border p-3 hover:bg-muted/50"
                  onClick={() => setSelectedAlert(alert)}
                >
                  <div>
                    <p className="font-medium text-foreground">{alert.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {alert.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <ApprovalStatusBadge
                      status={(alert.severity || "info").toUpperCase()}
                    />
                    {alert.action ? (
                      <Badge variant="outline">{alert.action}</Badge>
                    ) : null}
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
              (Array.isArray(filteredTasks) ? filteredTasks : []).map((task) => (
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

          <TabsContent value="payments" className="mt-4">
            {filteredPayments.length ? (
              <div className="space-y-2">
                {(Array.isArray(filteredPayments) ? filteredPayments : []).map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50"
                  >
                    <div>
                      <p className="font-medium text-foreground">
                        {p.beneficiary}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {p.currency} {formatNumber(p.amount)} •{" "}
                        {new Date(p.scheduledDate || "").toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{p.method}</Badge>
                      <ApprovalStatusBadge status={p.status} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No payment transactions found.
              </div>
            )}
          </TabsContent>

          <TabsContent value="sources" className="mt-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {(Array.isArray(moneySources) ? moneySources : []).map((source: any) => (
                <div key={source.id} className="bg-card p-4 rounded-xl border border-primary/10 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{source.name}</p>
                      <p className="text-lg font-black text-primary">{source.currency} {formatNumber(source.balance ?? 0)}</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-primary"
                      onClick={() => {
                        setEditingSource(source);
                        setLimitMin(source.minLimit?.toString() || "");
                        setLimitMax(source.maxLimit?.toString() || "");
                      }}
                    >
                      <ArrowRightLeft className="w-4 h-4 rotate-90" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-border">
                    <div>
                      <p className="text-[8px] font-black uppercase text-muted-foreground mb-0.5">Min Limit</p>
                      <p className={`text-xs font-bold ${source.balance < (source.minLimit || 0) ? "text-destructive" : "text-muted-foreground"}`}>
                        {source.minLimit ? `${source.currency} ${formatNumber(source.minLimit)}` : "Not Set"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black uppercase text-muted-foreground mb-0.5">Max Limit</p>
                      <p className={`text-xs font-bold ${source.balance > (source.maxLimit || 999999999) ? "text-destructive" : "text-muted-foreground"}`}>
                        {source.maxLimit ? `${source.currency} ${formatNumber(source.maxLimit)}` : "Not Set"}
                      </p>
                    </div>
                  </div>
                  {(source.balance < (source.minLimit || 0) || source.balance > (source.maxLimit || 999999999)) && (
                    <div className="mt-3 flex items-center gap-2 text-destructive bg-destructive p-2 rounded-lg border border-destructive/30 animate-pulse">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span className="text-[9px] font-black uppercase tracking-tighter">THRESHOLD VIOLATION</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </WorkspacePanel>

      <WorkspacePanel
        title="Active Records"
        description="All finance payment transactions — includes internal requests and retail orders."
      >
        <FilterBar searchValue={search} onSearchChange={setSearch} />
        <DataTableShell total={filteredPayments.length} page={1} pageSize={10}>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Beneficiary</th>
                <th className="p-3 text-left">Amount</th>
                <th className="p-3 text-left">Method</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.length > 0 ? (
                (Array.isArray(filteredPayments) ? filteredPayments : []).map((p) => (
                  <tr key={p.id} className="border-t hover:bg-muted/50">
                    <td className="p-3 font-medium">{p.beneficiary}</td>
                    <td className="p-3 text-muted-foreground">
                      {p.currency} {formatNumber(p.amount)}
                    </td>
                    <td className="p-3">
                      <Badge variant="outline">{p.method}</Badge>
                    </td>
                    <td className="p-3">
                      <ApprovalStatusBadge status={p.status} />
                    </td>
                    <td className="p-3 text-muted-foreground text-xs">
                      {p.scheduledDate
                        ? new Date(p.scheduledDate).toLocaleDateString()
                        : "—"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="p-4 text-center text-muted-foreground"
                  >
                    No payment records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </DataTableShell>
      </WorkspacePanel>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <div className="grid md:grid-cols-[1fr_2fr]">
            {/* Left Info Panel */}
            <div className="bg-muted p-6 flex flex-col justify-between">
              <div>
                <CreditCard className="w-8 h-8 text-primary mb-4" />
                <DialogTitle className="text-xl mb-2">
                  {isHighLevel ? "Create Payment" : "Request Payment"}
                </DialogTitle>
                <p className="text-sm text-muted-foreground">
                  Initiate outgoing transfers to external beneficiaries, suppliers, or issue reimbursements.
                </p>
                <div className="mt-8 space-y-4">
                  <div className="bg-background p-3 rounded-lg border shadow-sm">
                    <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Source Default</p>
                    <p className="font-semibold text-sm">
                      {source ? moneySources.find((s) => s.id === source)?.name : "Main Treasury"}
                    </p>
                  </div>
                  <div className="flex justify-center -my-2 relative z-10">
                    <div className="bg-background border rounded-full p-1 drop-shadow-sm">
                      <Send className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="bg-background p-3 rounded-lg border shadow-sm">
                    <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Authorization</p>
                    <p className="font-semibold text-sm flex items-center gap-1">
                      {isHighLevel ? (
                        <><CheckCircle2 className="w-4 h-4 text-success" /> Direct Processing</>
                      ) : (
                        <><Info className="w-4 h-4 text-primary" /> Route to Finance HOD</>
                      )}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-primary/5 p-4 rounded-lg mt-8 border border-primary/10">
                <p className="text-xs text-primary font-medium flex items-center gap-1.5">
                  <Info className="w-4 h-4" /> Policy Compliance
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Ensure the purpose aligns with departmental OPEX/CAPEX budgets.
                </p>
              </div>
            </div>

            {/* Right Form Panel */}
            <div className="p-6">
              <div className="space-y-6">
                <div>
                  <label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">Payment Amount (IDR)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-muted-foreground font-medium">Rp</span>
                    <Input
                      className="pl-9 text-lg font-medium"
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                      placeholder="0"
                      type="number"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">Payment Method</label>
                    <Select
                      value={method}
                      onValueChange={(value) => setMethod(value as PaymentMethod)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Payment Method" />
                      </SelectTrigger>
                      <SelectContent>
                        {(Array.isArray(PAYMENT_METHODS) ? PAYMENT_METHODS : []).map((paymentMethod) => (
                          <SelectItem key={paymentMethod} value={paymentMethod}>
                            {paymentMethod.replace("_", " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">Funding Source</label>
                    <Select value={source} onValueChange={setSource}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Source Account" />
                      </SelectTrigger>
                      <SelectContent>
                        {(Array.isArray(moneySources) ? moneySources : []).map((ms) => (
                          <SelectItem key={ms.id} value={ms.id}>
                            {ms.name} ({ms.currency})
                          </SelectItem>
                        ))}
                        {moneySources.length === 0 && (
                          <SelectItem value="none" disabled>
                            No accounts available
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">Beneficiary</label>
                    <Input
                      value={destination}
                      onChange={(event) => setDestination(event.target.value)}
                      placeholder="Name / Account Number"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">Requesting Dept</label>
                    <Input
                      value={department}
                      onChange={(event) => setDepartment(event.target.value)}
                      placeholder="Department ID (e.g. IT, HR)"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">Purpose of Payment</label>
                  <Textarea
                    value={purpose}
                    onChange={(event) => setPurpose(event.target.value)}
                    placeholder="Provide clear justification..."
                    className="resize-none"
                    rows={2}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">Extra Metadata (JSON)</label>
                  <Textarea
                    value={extraInfo}
                    onChange={(event) => setExtraInfo(event.target.value)}
                    placeholder='{"invoiceId": "INV-1234"}'
                    className="font-mono text-xs resize-none"
                    rows={2}
                  />
                </div>

                <div className="border-t pt-4 flex justify-end gap-3 mt-4">
                  <Button onClick={() => setDialogOpen(false)} variant="outline">
                    Cancel
                  </Button>
                  <Button onClick={submitPaymentRequest} className="gap-2">
                    <Send className="w-4 h-4" />
                    {isHighLevel ? "Process Payment" : "Submit Request"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!selectedWorkflow}
        onOpenChange={() => setSelectedWorkflow(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Workflow Detail</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 text-sm gap-y-2">
              <span className="text-muted-foreground">Flow ID:</span>
              <span className="font-mono">{selectedWorkflow?.id}</span>
              <span className="text-muted-foreground">Entity:</span>
              <span className="font-semibold">
                {selectedWorkflow?.entityType} | {selectedWorkflow?.entityId}
              </span>
              <span className="text-muted-foreground">Maker Dept:</span>
              <span>{selectedWorkflow?.makerDept}</span>
              <span className="text-muted-foreground">Requested By:</span>
              <span>{selectedWorkflow?.requestedBy}</span>
              <span className="text-muted-foreground">Status:</span>
              <span>
                <ApprovalStatusBadge
                  status={selectedWorkflow?.status || "PENDING"}
                />
              </span>
            </div>
            <div className="border-t pt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Finance Review Notes
              </p>
              <p className="text-xs text-muted-foreground">
                This request was automatically routed based on departmental
                thresholds. Verify supporting documentation in Finance Docs if
                required.
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

      <Dialog
        open={!!selectedAlert}
        onOpenChange={() => setSelectedAlert(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Operational Alert</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="rounded-lg bg-destructive border border-destructive/30 p-3 text-destructive">
              <p className="font-bold">{selectedAlert?.title}</p>
              <p className="text-sm">{selectedAlert?.description}</p>
            </div>
            <div className="grid grid-cols-2 text-sm gap-y-2">
              <span className="text-muted-foreground">Severity:</span>
              <span className="font-bold uppercase">
                {selectedAlert?.severity}
              </span>
              <span className="text-muted-foreground">Action Needed:</span>
              <span className="font-semibold">
                {selectedAlert?.action || "None"}
              </span>
            </div>
            <div className="border-t pt-2 text-xs text-muted-foreground">
              <p>
                Triggered by automated treasury monitoring. System suggests
                immediate review of linked accounts.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editingSource}
        onOpenChange={() => setEditingSource(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Configure Thresholds</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="bg-primary/5 p-3 rounded-lg border border-primary/10 mb-4">
              <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">Target Account</p>
              <p className="font-black text-sm">{editingSource?.name}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Min Balance Limit</label>
                <Input 
                  type="number" 
                  value={limitMin} 
                  onChange={e => setLimitMin(e.target.value)} 
                  placeholder="No limit"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Max Balance Limit</label>
                <Input 
                  type="number" 
                  value={limitMax} 
                  onChange={e => setLimitMax(e.target.value)} 
                  placeholder="No limit"
                />
              </div>
            </div>

            <div className="bg-warning border border-warning/30 p-3 rounded-lg text-[10px] text-warning font-bold uppercase tracking-widest leading-relaxed">
              <Info className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
              Violations will trigger real-time alerts in the Money Desk and notify the treasury team.
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setEditingSource(null)}>Cancel</Button>
              <Button className="flex-1" disabled={isUpdatingLimit} onClick={handleUpdateLimits}>
                {isUpdatingLimit ? "Saving..." : "Save Configuration"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
