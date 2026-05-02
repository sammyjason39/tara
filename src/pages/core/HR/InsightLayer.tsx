import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { DataTableShell } from "@/core/tools/DataTableShell";
import { FilterBar } from "@/core/tools/FilterBar";
import { useSession } from "@/core/security/session";
import { analyticsService } from "@/core/services/hr/analyticsService";
import { workflowService } from "@/core/services/hr/workflowService";

export default function InsightLayer() {
  const session = useSession();
  const [search, setSearch] = useState("");
  const [reportId, setReportId] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);

  useEffect(() => {
    analyticsService.listMetrics(session.tenant_id, session).then(setMetrics);
    const flows = workflowService.listRequests(session.tenant_id);
    setApprovals((Array.isArray(flows) ? flows : []).filter((flow: any) => flow.status === "PENDING"));
  }, [session]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="InsightLayer"
        subtitle="Workforce intelligence with risk and cost forecasting."
        primaryAction={
          <Button
            onClick={async () => {
              const id = await analyticsService.generateReport(session.tenant_id, session);
              setReportId(id);
            }}
          >
            Generate Report
          </Button>
        }
        secondaryActions={<Input placeholder="Search insights" className="min-w-[200px]" value={search} onChange={(e) => setSearch(e.target.value)} />}
      />

      <WorkspacePanel title="WorkQueue" description="Analytics actions and alerts.">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              if (reportId) {
                analyticsService.shareReport(session.tenant_id, session, reportId);
              }
            }}
          >
            Share to Exec
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              const target = reportId ?? "insight-report";
              analyticsService.routeInsight(session.tenant_id, session, target);
            }}
          >
            Send to FlowGate
          </Button>
        </div>
      </WorkspacePanel>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <WorkspacePanel title="Active Records" description="Enterprise intelligence metrics.">
          <FilterBar searchValue={search} onSearchChange={setSearch} />
          <DataTableShell total={metrics.length} page={1} pageSize={4}>
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-3 text-left">Metric</th>
                  <th className="p-3 text-left">Value</th>
                </tr>
              </thead>
              <tbody>
                {metrics
                  .filter((metric) =>
                    search ? metric.label.toLowerCase().includes(search.toLowerCase()) : true,
                  )
                  .map((metric) => (
                    <tr key={metric.id} className="border-t">
                      <td className="p-3">{metric.label}</td>
                      <td className="p-3 text-muted-foreground">{metric.value}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </DataTableShell>
        </WorkspacePanel>

        <WorkspacePanel title="Pending Approvals" description="Intelligence-related approvals.">
          <div className="space-y-3 text-sm text-muted-foreground">
            {approvals.slice(0, 3).map((flow) => (
              <div key={flow.id} className="flex items-center justify-between rounded-lg border p-3">
                <span>{flow.entityType}</span>
                <Button size="sm" variant="outline" onClick={() => workflowService.approveRequest(session.tenant_id, flow.id, session)}>
                  Review
                </Button>
              </div>
            ))}
          </div>
        </WorkspacePanel>
      </div>

      <WorkspacePanel title="Insights" description="Decision-ready HR intelligence.">
        <div className="space-y-3 text-sm text-muted-foreground">
          <div className="rounded-lg border p-3">
            Workforce risk index is trending above baseline. Consider routing to FlowGate for mitigation.
          </div>
          <div className="rounded-lg border p-3">
            Payroll forecast indicates elevated cost next cycle due to overtime.
          </div>
        </div>
      </WorkspacePanel>
    </div>
  );
}
