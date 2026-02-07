import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { DataTableShell } from "@/core/tools/DataTableShell";
import { ApprovalStatusBadge } from "@/core/tools/ApprovalStatusBadge";
import { FilterBar } from "@/core/tools/FilterBar";
import { useSession } from "@/core/security/session";
import { payrollService } from "@/core/services/hr/payrollService";
import { workflowService } from "@/core/services/hr/workflowService";
import { useBackgroundRefresh } from "@/core/runtime/events/useBackgroundRefresh";
import { Roles } from "@/core/security/roles";

export default function PayCycleStudio() {
  const session = useSession();
  const [version, setVersion] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [periodStart, setPeriodStart] = useState("2026-02-01");
  const [periodEnd, setPeriodEnd] = useState("2026-02-15");
  const [search, setSearch] = useState("");
  const [varianceNote, setVarianceNote] = useState("");
  const refresh = useCallback(() => setVersion((prev) => prev + 1), []);
  useBackgroundRefresh(refresh, 20000);
  const financeAllowed = ([Roles.SUPERADMIN, Roles.OWNER, Roles.COMPANY_ADMIN, Roles.FINANCE_ADMIN] as readonly string[]).includes(session.role);
  const runs = useMemo(() => {
    const items = payrollService.listRuns(session.tenantId, session);
    if (!search) return items;
    return items.filter((run) => run.id.toLowerCase().includes(search.toLowerCase()));
  }, [session, version, search]);
  const workflows = useMemo(
    () => workflowService.listRequests(session.tenantId, { entityType: "PAYROLL" }),
    [session, version],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="PayCycle Studio"
        subtitle="Payroll preparation, variance checks, and FlowGate submission."
        primaryAction={
          <Button onClick={() => setDialogOpen(true)}>Create Payroll Run</Button>
        }
        secondaryActions={<Input placeholder="Search payroll runs" className="min-w-[200px]" />}
      />

      <WorkspacePanel title="WorkQueue" description="Payroll actions and escalation.">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => payrollService.lockAttendance(session.tenantId, session, periodStart, periodEnd)}
          >
            Lock Attendance
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              const target = runs[0];
              if (target) {
                const result = payrollService.runVarianceCheck(session.tenantId, session, target.id);
                setVarianceNote(`Variance score for ${result.runId}: ${result.varianceScore}`);
              }
            }}
          >
            Run Variance Check
          </Button>
        </div>
        {varianceNote ? (
          <div className="mt-3 rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
            {varianceNote}
          </div>
        ) : null}
      </WorkspacePanel>

      <WorkspacePanel title="Active Records" description="Payroll runs and status.">
        <FilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search payroll runs"
          onReset={() => setSearch("")}
        />
        <DataTableShell total={runs.length} page={1} pageSize={10}>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Period</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id} className="border-t">
                  <td className="p-3">{run.periodStart} - {run.periodEnd}</td>
                  <td className="p-3 text-muted-foreground">{run.status}</td>
                  <td className="p-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        payrollService.submitForApproval(session.tenantId, session, run.id);
                        setVersion((prev) => prev + 1);
                      }}
                      disabled={run.status !== "draft"}
                    >
                      Submit to FlowGate
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="ml-2"
                      onClick={() => {
                        payrollService.approveRun(session.tenantId, session, run.id);
                        setVersion((prev) => prev + 1);
                      }}
                      disabled={run.status !== "pending" || !financeAllowed}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="ml-2"
                      onClick={() => payrollService.exportJournal(session.tenantId, session, run.id)}
                      disabled={run.status !== "approved" || !financeAllowed}
                    >
                      Export Journal
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTableShell>
      </WorkspacePanel>

      <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <WorkspacePanel title="Pending Approvals" description="Finance approvals for payroll runs.">
          <div className="space-y-3">
            {workflows.map((flow) => (
              <div key={flow.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{flow.entityId}</p>
                  <p className="text-xs text-muted-foreground">Dept: {flow.destinationDept}</p>
                </div>
                <ApprovalStatusBadge status={flow.status} />
              </div>
            ))}
          </div>
        </WorkspacePanel>

        <WorkspacePanel title="Insights" description="Payroll readiness signals.">
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span>Total runs</span>
              <span className="font-semibold text-foreground">{runs.length}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span>Pending approval</span>
              <span className="font-semibold text-foreground">
                {workflows.filter((flow) => flow.status === "PENDING").length}
              </span>
            </div>
          </div>
        </WorkspacePanel>
      </div>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Run Payroll</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Period start</label>
              <Input value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Period end</label>
              <Input value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
            </div>
            <Button
              onClick={() => {
                payrollService.prepareCycle(session.tenantId, session, periodStart, periodEnd);
                setDialogOpen(false);
                setVersion((prev) => prev + 1);
              }}
            >
              Create Run
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
