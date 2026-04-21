import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { DataTableShell } from "@/core/tools/DataTableShell";
import { WorkflowRequestCard } from "@/core/tools/WorkflowRequestCard";
import { ApprovalStatusBadge } from "@/core/tools/ApprovalStatusBadge";
import {
  AlertTriangle, Activity, Wallet, ArrowRight, CheckSquare, Clock,
} from "lucide-react";
import type { FinanceAlert } from "@/core/types/finance/assets";
import type { FinancePaymentRow } from "@/core/types/finance/payments";
import type { WorkflowRequest } from "@/core/tools/workflows/workflowTypes";
import { SectionLabel, EmptyState } from "./DashboardPrimitives";

interface WorkQueueProps {
  tab: "approvals" | "alerts" | "tasks" | "payments";
  onTabChange: (t: "approvals" | "alerts" | "tasks" | "payments") => void;
  approvals: WorkflowRequest[];
  alerts: FinanceAlert[];
  tasks: WorkflowRequest[];
  payments: FinancePaymentRow[];
  onSelectWorkflow: (w: WorkflowRequest) => void;
  onSelectAlert: (a: FinanceAlert) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export function WorkQueueSection({
  tab, onTabChange,
  approvals, alerts, tasks, payments,
  onSelectWorkflow, onSelectAlert,
  onApprove, onReject,
}: WorkQueueProps) {
  const navigate = useNavigate();

  return (
    <section>
      <SectionLabel
        label="Operations Inbox"
        sub="Cross-module approvals, alerts, tasks, and payment records"
      />
      <WorkspacePanel
        title="Work Queue"
        description="Live finance operations inbox — routed approvals and pending activities"
        className="rounded-3xl border-slate-100 bg-white shadow-sm"
      >
        <Tabs value={tab} onValueChange={(v) => onTabChange(v as typeof tab)}>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6 mt-2">
            <TabsList className="h-12 bg-slate-50 p-1 border border-slate-200/80 rounded-2xl w-fit">
              <TabsTrigger value="approvals" className="rounded-xl px-5 font-bold text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">
                Approvals
                {approvals.length > 0 && (
                  <Badge variant="secondary" className="ml-2 bg-primary/10 text-primary text-[10px]">
                    {approvals.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="alerts" className="rounded-xl px-5 font-bold text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">
                Alerts
                {alerts.length > 0 && (
                  <Badge variant="destructive" className="ml-2 text-[10px]">
                    {alerts.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="tasks" className="rounded-xl px-5 font-bold text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">
                Tasks
                {tasks.length > 0 && (
                  <Badge variant="secondary" className="ml-2 text-[10px]">
                    {tasks.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="payments" className="rounded-xl px-5 font-bold text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">
                Payments
              </TabsTrigger>
            </TabsList>
            <Button variant="ghost" size="sm" className="text-xs font-bold text-primary rounded-xl"
              onClick={() => navigate("/core/finance/payflow")}>
              View All <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Approvals */}
          <TabsContent value="approvals" className="mt-0">
            {approvals.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {approvals.map((flow) => (
                  <WorkflowRequestCard
                    key={flow.id}
                    title={`${flow.entityType} | ${flow.entityId}`}
                    subtitle={`${flow.makerDept} → ${flow.destinationDept}`}
                    status={flow.status}
                    urgency={flow.status === "PENDING" ? 80 : 40}
                    owner={flow.destinationDept}
                    actionLabel="Review"
                    onAction={() => onSelectWorkflow(flow)}
                    footer={
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button size="sm"
                          className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold"
                          onClick={() => onApprove(flow.id)}>
                          Approve
                        </Button>
                        <Button size="sm"
                          className="rounded-xl text-xs font-bold border border-rose-200 bg-rose-50 text-rose-500 hover:bg-rose-100 shadow-none"
                          onClick={() => onReject(flow.id)}>
                          Reject
                        </Button>
                      </div>
                    }
                  />
                ))}
              </div>
            ) : (
              <EmptyState icon={CheckSquare} color="text-primary" bg="bg-primary/10"
                title="Clear Inbox" desc="No pending approvals await your execution." />
            )}
          </TabsContent>

          {/* Alerts */}
          <TabsContent value="alerts" className="mt-0">
            {alerts.length ? (
              <div className="grid gap-3">
                {alerts.map((alert) => (
                  <button key={alert.id}
                    className="flex w-full cursor-pointer items-center justify-between rounded-2xl border bg-white p-5 shadow-sm transition-all hover:bg-slate-50 hover:shadow-md hover:-translate-y-0.5 text-left"
                    onClick={() => onSelectAlert(alert)}>
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-rose-50 flex items-center justify-center border border-rose-100">
                        <AlertTriangle className="h-5 w-5 text-rose-500" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{alert.title}</p>
                        <p className="text-xs font-medium text-slate-400 mt-0.5">{alert.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <ApprovalStatusBadge status={alert.severity.toUpperCase()} />
                      {alert.action && (
                        <Badge variant="outline" className="rounded-xl text-xs">{alert.action}</Badge>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState icon={Activity} color="text-emerald-500" bg="bg-emerald-50"
                title="No Critical Alerts" desc="All systems nominal — no active financial breach alerts." />
            )}
          </TabsContent>

          {/* Tasks */}
          <TabsContent value="tasks" className="mt-0">
            {tasks.length ? (
              <div className="grid gap-3">
                {tasks.map((task) => (
                  <button key={task.id}
                    className="flex w-full cursor-pointer items-center justify-between rounded-2xl border bg-white p-5 shadow-sm transition-all hover:bg-slate-50 hover:shadow-md hover:-translate-y-0.5 text-left"
                    onClick={() => onSelectWorkflow(task)}>
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center border border-indigo-100">
                        <Activity className="h-5 w-5 text-indigo-500" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{task.entityType} | {task.entityId}</p>
                        <p className="text-xs font-medium text-slate-400 mt-0.5">Routed → {task.destinationDept}</p>
                      </div>
                    </div>
                    <ApprovalStatusBadge status={task.status} />
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState icon={Clock} color="text-slate-400" bg="bg-slate-100"
                title="Zero Routings" desc="Nothing has been dispatched to the Finance layer." />
            )}
          </TabsContent>

          {/* Payments */}
          <TabsContent value="payments" className="mt-0">
            {payments.length ? (
              <div className="grid gap-3">
                {payments.map((p) => (
                  <div key={p.id}
                    className="flex items-center justify-between rounded-2xl border bg-white p-5 shadow-sm transition-all hover:bg-slate-50 hover:shadow-md cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-primary/5 flex items-center justify-center border border-primary/10">
                        <Wallet className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{p.beneficiary}</p>
                        <p className="text-xs font-medium text-slate-400 mt-0.5">
                          {p.currency}{" "}
                          <span className="font-black text-slate-700">{p.amount.toLocaleString()}</span>
                          {" · "}
                          {new Date(p.scheduledDate || "").toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="rounded-xl text-xs">{p.method}</Badge>
                      <ApprovalStatusBadge status={p.status} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={Wallet} color="text-slate-400" bg="bg-slate-100"
                title="Empty Logs" desc="No payment records exist for the active tenant context." />
            )}
          </TabsContent>
        </Tabs>
      </WorkspacePanel>

      {/* Full Payment Ledger table */}
      <WorkspacePanel
        title="Payment Ledger"
        description="Full transactional history filtered by current search scope"
        className="rounded-3xl border-slate-100 bg-white shadow-sm mt-5"
      >
        <DataTableShell total={payments.length} page={1} pageSize={10}>
          <div className="rounded-2xl overflow-hidden border border-slate-100 mt-4">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/80">
                <tr>
                  {["Beneficiary", "Amount", "Method", "Status", "Date"].map((h) => (
                    <th key={h}
                      className="p-4 text-left text-[11px] font-black uppercase tracking-widest text-slate-400">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-50">
                {payments.length > 0 ? (
                  payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors cursor-pointer">
                      <td className="p-4 font-bold text-slate-900">{p.beneficiary}</td>
                      <td className="p-4 font-bold text-slate-700">
                        {p.currency} {p.amount.toLocaleString()}
                      </td>
                      <td className="p-4">
                        <Badge variant="outline" className="rounded-xl text-xs font-bold">{p.method}</Badge>
                      </td>
                      <td className="p-4"><ApprovalStatusBadge status={p.status} /></td>
                      <td className="p-4 text-slate-400 font-medium text-xs">
                        {p.scheduledDate ? new Date(p.scheduledDate).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="p-10 text-center text-slate-400 font-medium">
                      No payment records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </DataTableShell>
      </WorkspacePanel>
    </section>
  );
}
