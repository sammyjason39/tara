import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { DataTableShell } from "@/core/tools/DataTableShell";
import { FilterBar } from "@/core/tools/FilterBar";
import { useSession } from "@/core/security/session";
import { marketingService } from "@/core/services/marketing/marketingService";
import type {
  MarketingAlert,
  MarketingCampaign,
  MarketingDashboardMetrics,
} from "@/core/types/marketing/marketing";

export default function MarketingDashboard() {
  const session = useSession();
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<MarketingDashboardMetrics | null>(
    null,
  );
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [alerts, setAlerts] = useState<MarketingAlert[]>([]);

  const refresh = useCallback(async () => {
    try {
      const [m, c, a] = await Promise.all([
        marketingService.getDashboard(session.tenantId, session),
        marketingService.listCampaigns(session.tenantId, session),
        marketingService.listAlerts(session.tenantId, session),
      ]);
      setMetrics(m);
      setCampaigns(c);
      setAlerts(a);
    } catch (err) {
      console.error("Failed to fetch marketing dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    refresh();
  }, [refresh]);

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

  if (loading || !metrics) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">
          Loading marketing command center...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Marketing Command Center"
        subtitle="Campaign health, lead velocity, real-time handoff readiness, and ROI visibility."
        secondaryActions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                await marketingService.runHealthSweep(
                  session.tenantId,
                  session,
                );
                refresh();
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

      <WorkspacePanel
        title="Campaign Dashboard"
        description="Active campaigns, qualified lead flow, and attribution snapshots."
      >
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
            <p className="text-2xl font-semibold">
              {metrics.spendToDate.toLocaleString()}
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Attributed revenue</p>
            <p className="text-2xl font-semibold">
              {metrics.attributedRevenue.toLocaleString()}
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Blended ROI</p>
            <p className="text-2xl font-semibold">
              {metrics.blendedRoiPercent}%
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Healthy accounts</p>
            <p className="text-2xl font-semibold">
              {metrics.connectedAccountsHealthy}
            </p>
          </div>
        </div>
      </WorkspacePanel>

      {/* --- MODULE CONTRIBUTIONS --- */}
      {metrics.moduleContributions?.retail && (
        <WorkspacePanel
          title="Module Contributions: Retail Footprint"
          description="Physical retail foot traffic and loyalty performance."
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border p-3 border-emerald-500/20 bg-emerald-500/5">
              <p className="text-xs text-muted-foreground">Store Walk-ins</p>
              <p className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
                {metrics.moduleContributions.retail.walkInCustomers.toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg border p-3 border-emerald-500/20 bg-emerald-500/5">
              <p className="text-xs text-muted-foreground">
                Active Loyalty Members
              </p>
              <p className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
                {metrics.moduleContributions.retail.loyaltyActive.toLocaleString()}
              </p>
            </div>
          </div>
        </WorkspacePanel>
      )}

      <WorkspacePanel
        title="Campaign Snapshot"
        description="Current campaigns and execution readiness state."
      >
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
                <Badge
                  variant={item.status === "ACTIVE" ? "secondary" : "outline"}
                >
                  {item.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </WorkspacePanel>

      <WorkspacePanel
        title="Notification Feed"
        description="Lead spike, campaign failure, token expiry, and handoff SLA alerts."
      >
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
                    <Badge
                      variant={
                        item.severity === "HIGH" ? "destructive" : "outline"
                      }
                    >
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
                        onClick={async () => {
                          await marketingService.acknowledgeAlert(
                            session.tenantId,
                            session,
                            item.id,
                          );
                          refresh();
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
