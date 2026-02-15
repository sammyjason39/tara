import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { DataTableShell } from "@/core/tools/DataTableShell";
import { FilterBar } from "@/core/tools/FilterBar";
import { useSession } from "@/core/security/session";
import { salesService } from "@/core/services/sales/salesService";

export default function SalesDashboard() {
  const session = useSession();
  const [search, setSearch] = useState("");
  const metrics = salesService.getDashboard(session.tenantId);
  const nextActions = useMemo(
    () => salesService.getNextBestActions(session.tenantId),
    [session.tenantId],
  );
  const leads = useMemo(
    () =>
      salesService
        .listLeads(session.tenantId)
        .filter((item) => ["NEW", "ASSIGNED", "CONTACTED", "QUALIFIED"].includes(item.status)),
    [session.tenantId],
  );

  const filteredLeads = useMemo(
    () =>
      leads.filter((item) =>
        search
          ? `${item.companyName} ${item.contactName} ${item.ownerName}`
              .toLowerCase()
              .includes(search.toLowerCase())
          : true,
      ),
    [leads, search],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Command Center"
        subtitle="Daily sales operations: lead SLA, follow-up queue, AI next actions, and pipeline readiness."
        secondaryActions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => salesService.runSlaSweep(session.tenantId, session)}>
              Run SLA Sweep
            </Button>
            <Input
              className="min-w-[220px]"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search leads"
            />
          </div>
        }
      />

      <WorkspacePanel title="Rep Daily Dashboard" description="Leads, follow-ups, pipeline value, and quote approval pressure.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Open leads</p>
            <p className="text-2xl font-semibold">{metrics.openLeads}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">SLA due today</p>
            <p className="text-2xl font-semibold">{metrics.slaDueToday}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Overdue follow-ups</p>
            <p className="text-2xl font-semibold">{metrics.overdueFollowUps}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Open opportunities</p>
            <p className="text-2xl font-semibold">{metrics.openOpportunities}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Pipeline value</p>
            <p className="text-2xl font-semibold">{metrics.pipelineValue.toLocaleString()}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Weighted pipeline</p>
            <p className="text-2xl font-semibold">{metrics.weightedPipelineValue.toLocaleString()}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Pending quote approvals</p>
            <p className="text-2xl font-semibold">{metrics.pendingQuoteApprovals}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Deal risk signals</p>
            <p className="text-2xl font-semibold">{metrics.dealRiskCount}</p>
          </div>
        </div>
      </WorkspacePanel>

      <WorkspacePanel title="AI Next Actions" description="Prioritized next best actions for the sales team.">
        <div className="space-y-2">
          {nextActions.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.detail}</p>
              </div>
              <Badge variant={item.priority === "P1" ? "destructive" : "secondary"}>
                {item.priority}
              </Badge>
            </div>
          ))}
        </div>
      </WorkspacePanel>

      <WorkspacePanel title="Today's Leads" description="SLA-aware lead queue and ownership assignments.">
        <FilterBar searchValue={search} onSearchChange={setSearch} />
        <DataTableShell total={filteredLeads.length} page={1} pageSize={10}>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Company</th>
                <th className="p-3 text-left">Contact</th>
                <th className="p-3 text-left">Owner</th>
                <th className="p-3 text-left">Priority</th>
                <th className="p-3 text-left">SLA Due</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="p-3 font-medium">{item.companyName}</td>
                  <td className="p-3 text-muted-foreground">{item.contactName}</td>
                  <td className="p-3 text-muted-foreground">{item.ownerName}</td>
                  <td className="p-3">
                    <Badge variant={item.priority === "URGENT" ? "destructive" : "outline"}>
                      {item.priority}
                    </Badge>
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {new Date(item.slaDueAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTableShell>
      </WorkspacePanel>
    </div>
  );
}
