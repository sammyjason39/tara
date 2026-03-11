import { useCallback, useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { DataTableShell } from "@/core/tools/DataTableShell";
import { FilterBar } from "@/core/tools/FilterBar";
import { useSession } from "@/core/security/session";
import { salesService } from "@/core/services/sales/salesService";
import type { SalesExecutiveForecast, SalesOpportunity } from "@/core/types/sales/sales";

export default function ForecastDesk() {
  const session = useSession();
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [forecast, setForecast] = useState<SalesExecutiveForecast | null>(null);
  const [opportunities, setOpportunities] = useState<SalesOpportunity[]>([]);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const [f, o] = await Promise.all([
        salesService.getExecutiveForecast(session.tenantId, session),
        salesService.listOpportunities(session.tenantId, session),
      ]);
      setForecast(f);
      setOpportunities(o);
    } catch (err) {
      console.error("Failed to fetch forecast data:", err);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const openOpportunities = useMemo(() => 
    opportunities.filter(
      (item) => item.stage !== "CLOSED_WON" && item.stage !== "CLOSED_LOST",
    ),
    [opportunities]
  );

  const filtered = useMemo(
    () =>
      openOpportunities.filter((item) =>
        search
          ? `${item.accountName} ${item.ownerName} ${item.stage}`
              .toLowerCase()
              .includes(search.toLowerCase())
          : true,
      ),
    [openOpportunities, search],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Executive Forecast"
        subtitle="Forecast confidence, conversion metrics, and pipeline quality for leadership."
        secondaryActions={
          <Input
            className="min-w-[220px]"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search opportunities"
          />
        }
      />

      <WorkspacePanel title="Forecast Summary" description="Executive-ready pipeline and close metrics.">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-7">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Open pipeline</p>
            <p className="text-2xl font-semibold">{forecast ? forecast.openPipelineValue.toLocaleString() : 0}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Weighted forecast</p>
            <p className="text-2xl font-semibold">{forecast ? forecast.weightedForecastValue.toLocaleString() : 0}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Won this period</p>
            <p className="text-2xl font-semibold">{forecast ? forecast.wonThisPeriod.toLocaleString() : 0}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Lost this period</p>
            <p className="text-2xl font-semibold">{forecast ? forecast.lostThisPeriod.toLocaleString() : 0}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Conversion rate</p>
            <p className="text-2xl font-semibold">{forecast ? forecast.conversionRate : 0}%</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Avg cycle (days)</p>
            <p className="text-2xl font-semibold">{forecast ? forecast.avgDealCycleDays : 0}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Forecast accuracy</p>
            <p className="text-2xl font-semibold">{forecast ? forecast.forecastAccuracy : 0}%</p>
          </div>
        </div>
      </WorkspacePanel>

      <WorkspacePanel title="Forecast Table" description="Opportunity-level weighted revenue visibility.">
        <FilterBar searchValue={search} onSearchChange={setSearch} />
        <DataTableShell total={filtered.length} page={1} pageSize={10}>
          {loading ? (
             <div className="p-8 text-center text-muted-foreground italic">Refreshing forecast table...</div>
          ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Account</th>
                <th className="p-3 text-left">Owner</th>
                <th className="p-3 text-left">Stage</th>
                <th className="p-3 text-left">Amount</th>
                <th className="p-3 text-left">Probability</th>
                <th className="p-3 text-left">Weighted</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="p-3 font-medium">{item.accountName}</td>
                  <td className="p-3 text-muted-foreground">{item.ownerName}</td>
                  <td className="p-3">
                    <Badge variant="outline">{item.stage}</Badge>
                  </td>
                  <td className="p-3 text-muted-foreground">{item.amount.toLocaleString()}</td>
                  <td className="p-3 text-muted-foreground">{item.probability}%</td>
                  <td className="p-3 font-medium">
                    {Math.round(item.amount * (item.probability / 100)).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
        </DataTableShell>
      </WorkspacePanel>
    </div>
  );
}
