import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { DataTableShell } from "@/core/tools/DataTableShell";
import { FilterBar } from "@/core/tools/FilterBar";
import { useSession } from "@/core/security/session";
import { salesService } from "@/core/services/sales/salesService";

export default function ForecastDesk() {
  const session = useSession();
  const [search, setSearch] = useState("");
  const forecast = useMemo(
    () => salesService.getExecutiveForecast(session.tenantId),
    [session.tenantId],
  );
  const opportunities = useMemo(
    () => salesService.listOpportunities(session.tenantId),
    [session.tenantId],
  );
  const openOpportunities = opportunities.filter(
    (item) => item.stage !== "CLOSED_WON" && item.stage !== "CLOSED_LOST",
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
            <p className="text-2xl font-semibold">{forecast.openPipelineValue.toLocaleString()}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Weighted forecast</p>
            <p className="text-2xl font-semibold">{forecast.weightedForecastValue.toLocaleString()}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Won this period</p>
            <p className="text-2xl font-semibold">{forecast.wonThisPeriod.toLocaleString()}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Lost this period</p>
            <p className="text-2xl font-semibold">{forecast.lostThisPeriod.toLocaleString()}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Conversion rate</p>
            <p className="text-2xl font-semibold">{forecast.conversionRate}%</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Avg cycle (days)</p>
            <p className="text-2xl font-semibold">{forecast.avgDealCycleDays}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Forecast accuracy</p>
            <p className="text-2xl font-semibold">{forecast.forecastAccuracy}%</p>
          </div>
        </div>
      </WorkspacePanel>

      <WorkspacePanel title="Forecast Table" description="Opportunity-level weighted revenue visibility.">
        <FilterBar searchValue={search} onSearchChange={setSearch} />
        <DataTableShell total={filtered.length} page={1} pageSize={10}>
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
        </DataTableShell>
      </WorkspacePanel>
    </div>
  );
}
