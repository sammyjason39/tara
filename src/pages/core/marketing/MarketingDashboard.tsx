import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { DataTableShell } from "@/core/tools/DataTableShell";
import { FilterBar } from "@/core/tools/FilterBar";
import { useSession } from "@/core/security/session";
import { marketingService } from "@/core/services/marketing/marketingService";

export default function MarketingDashboard() {
  const session = useSession();
  const [search, setSearch] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const metrics = useMemo(
    () => marketingService.getDashboard(session.tenantId),
    [refreshKey, session.tenantId],
  );
  const campaigns = useMemo(
    () => marketingService.listCampaigns(session.tenantId),
    [refreshKey, session.tenantId],
  );
  const alerts = useMemo(
    () => marketingService.listAlerts(session.tenantId),
    [refreshKey, session.tenantId],
  );
  const filteredAlerts = useMemo(
    () =>
      alerts.filter((item) =>
        search
          ? `${item.type} ${item.message} ${item.severity}`
              .toLowerCase()
              .includes(search.toLowerCase())
          : true,
      ),
    [alerts, search],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Marketing Command Center"
        subtitle="Campaign health, lead velocity, real-time handoff readiness, and ROI visibility."
        secondaryActions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                marketingService.runHealthSweep(session.tenantId, session);
                setRefreshKey((value) => value + 1);
              }}
            >
              Run Health Sweep
            </Button>
            <Input
              className="min-w-[220px]"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search alerts"
            />
          </div>
        }
      />

      <WorkspacePanel title="Campaign Dashboard" description="Active campaigns, qualified lead flow, and attribution snapshots.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Active campaigns</p>
            <p className="text-2xl font-semibold">{metrics.activeCampaigns}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Leads today</p>
            <p className="text-2xl font-semibold">{metrics.leadsToday}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Qualified leads</p>
            <p className="text-2xl font-semibold">{metrics.qualifiedLeads}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Handoff ready</p>
            <p className="text-2xl font-semibold">{metrics.handoffReady}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Spend to date</p>
            <p className="text-2xl font-semibold">{metrics.spendToDate.toLocaleString()}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Attributed revenue</p>
            <p className="text-2xl font-semibold">{metrics.attributedRevenue.toLocaleString()}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Blended ROI</p>
            <p className="text-2xl font-semibold">{metrics.blendedRoiPercent}%</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Healthy accounts</p>
            <p className="text-2xl font-semibold">{metrics.connectedAccountsHealthy}</p>
          </div>
        </div>
      </WorkspacePanel>

      <WorkspacePanel title="Campaign Snapshot" description="Current campaigns and execution readiness state.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {campaigns.map((item) => (
            <div key={item.id} className="rounded-lg border p-3">
              <p className="text-sm font-medium">{item.name}</p>
              <p className="text-xs text-muted-foreground">{item.audience}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Budget: {item.budget.toLocaleString()} {item.currency}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant="outline">{item.objective}</Badge>
                <Badge variant={item.status === "ACTIVE" ? "secondary" : "outline"}>
                  {item.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </WorkspacePanel>

      <WorkspacePanel title="Notification Feed" description="Lead spike, campaign failure, token expiry, and handoff SLA alerts.">
        <FilterBar searchValue={search} onSearchChange={setSearch} />
        <DataTableShell total={filteredAlerts.length} page={1} pageSize={20}>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Type</th>
                <th className="p-3 text-left">Severity</th>
                <th className="p-3 text-left">Message</th>
                <th className="p-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredAlerts.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="p-3 font-medium">{item.type}</td>
                  <td className="p-3">
                    <Badge variant={item.severity === "HIGH" ? "destructive" : "outline"}>
                      {item.severity}
                    </Badge>
                  </td>
                  <td className="p-3 text-muted-foreground">{item.message}</td>
                  <td className="p-3">
                    {item.acknowledged ? (
                      <Badge variant="secondary">ACKNOWLEDGED</Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          marketingService.acknowledgeAlert(
                            session.tenantId,
                            session,
                            item.id,
                          );
                          setRefreshKey((value) => value + 1);
                        }}
                      >
                        Acknowledge
                      </Button>
                    )}
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
