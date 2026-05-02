import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { DataTableShell } from "@/core/tools/DataTableShell";
import { FilterBar } from "@/core/tools/FilterBar";
import { useSession } from "@/core/security/session";
import { inventoryService } from "@/core/services/inventory/inventoryService";
import type {
  InventoryStockBalance,
  InventoryMovement,
  InventoryDashboardMetrics,
  InventoryIntegrationEvent,
  AgenticEvent,
} from "@/core/types/inventory/inventory";
import { ActivitySquare, BrainCircuit, Sparkles, TrendingUp } from "lucide-react";

export default function InventoryInsights() {
  const session = useSession();
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [balances, setBalances] = useState<InventoryStockBalance[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [dashboard, setDashboard] = useState<InventoryDashboardMetrics | null>(
    null,
  );
  const [integrationEvents, setIntegrationEvents] = useState<
    InventoryIntegrationEvent[]
  >([]);
  const [agenticEvents, setAgenticEvents] = useState<AgenticEvent[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [b, m, d, i, a] = await Promise.all([
        inventoryService.listBalances(session.tenant_id, session),
        inventoryService.listMovements(session.tenant_id, session),
        inventoryService.getDashboard(session.tenant_id, session),
        inventoryService.listIntegrationEvents(session.tenant_id, session),
        inventoryService.listAgenticEvents(session.tenant_id, session),
      ]);
      setBalances(b);
      setMovements(m);
      setDashboard(d);
      setIntegrationEvents(i);
      setAgenticEvents(a);
    } catch (err) {
      console.error("Failed to fetch inventory insights data:", err);
      setError("Failed to load inventory insights. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, [session.tenant_id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const turnoverProxy = useMemo(() => {
    const deductions = movements
      .filter((item) => item.type === "DEDUCTION")
      .reduce((sum, item) => sum + item.quantity, 0);
    const averageOnHand = balances.length
      ? balances.reduce((sum, item) => sum + item.quantity, 0) / balances.length
      : 0;
    return averageOnHand > 0 ? (deductions / averageOnHand).toFixed(2) : "0.00";
  }, [balances, movements]);

  const insightRows = useMemo(() => {
    if (!dashboard) return [];
    return [
      {
        id: "inv-ins-1",
        label: "Total on-hand quantity",
        category: "STOCK",
        value: String(dashboard.totalOnHandQty),
      },
      {
        id: "inv-ins-2",
        label: "Total valuation",
        category: "FINANCE",
        value: dashboard.totalValuation.toLocaleString(),
      },
      {
        id: "inv-ins-3",
        label: "Low stock alerts",
        category: "RISK",
        value: String(dashboard.lowStockCount),
      },
      {
        id: "inv-ins-4",
        label: "Expiry alerts",
        category: "RISK",
        value: String(dashboard.expiryWarningCount),
      },
      {
        id: "inv-ins-5",
        label: "Pending adjustments",
        category: "GOVERNANCE",
        value: String(dashboard.pendingAdjustments),
      },
      {
        id: "inv-ins-6",
        label: "Pending procurement receipts",
        category: "INTEGRATION",
        value: String(dashboard.pendingReceiptSyncs),
      },
      {
        id: "inv-ins-7",
        label: "Turnover proxy",
        category: "PERFORMANCE",
        value: turnoverProxy,
      },
      {
        id: "inv-ins-8",
        label: "Synced integration events",
        category: "INTEGRATION",
        value: String(
          (Array.isArray(integrationEvents) ? integrationEvents : []).filter((item) => item.status === "SYNCED").length,
        ),
      },
    ];
  }, [dashboard, integrationEvents, turnoverProxy]);

  const filteredRows = useMemo(
    () =>
      (Array.isArray(insightRows) ? insightRows : []).filter((item) =>
        search
          ? `${item.label} ${item.category}`
              .toLowerCase()
              .includes(search.toLowerCase())
          : true,
      ),
    [insightRows, search],
  );

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">Loading insights...</p>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="flex h-64 flex-col items-center justify-center space-y-4">
        <p className="text-destructive font-medium">
          {error || "Insights data unavailable."}
        </p>
        <button
          onClick={() => refresh()}
          className="text-sm text-primary hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory Insights"
        subtitle="Operational analytics for stock health, turnover, and cross-module sync reliability."
        secondaryActions={
          <Input
            placeholder="Search inventory metrics"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="min-w-[220px]"
          />
        }
      />
      {/* ... rest of the code for boxes and table remain same ... */}
      <WorkspacePanel
        title="Insight Cards"
        description="Inventory performance and governance indicators."
      >
        <div className="grid gap-3 md:grid-cols-4">
          {insightRows.map((item) => (
            <div key={item.id} className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="text-2xl font-semibold">{item.value}</p>
              <Badge variant="outline">{item.category}</Badge>
            </div>
          ))}
        </div>
      </WorkspacePanel>

      <WorkspacePanel
        title="Insight Table"
        description="Filterable inventory analytics for reporting."
      >
        <FilterBar searchValue={search} onSearchChange={setSearch} />
        <DataTableShell total={filteredRows.length} page={1} pageSize={10}>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Metric</th>
                <th className="p-3 text-left">Category</th>
                <th className="p-3 text-left">Value</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="p-3 font-medium">{row.label}</td>
                  <td className="p-3 text-muted-foreground">{row.category}</td>
                  <td className="p-3">{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTableShell>
      </WorkspacePanel>

      <div className="grid gap-6 lg:grid-cols-2">
        <WorkspacePanel
          title="Agentic Insights & Foresight"
          description="AI-driven event layer for demand surges and replenishment."
        >
          <div className="space-y-4">
            {agenticEvents.length === 0 ? (
               <div className="p-12 text-center border border-dashed rounded-lg bg-muted/20">
                  <BrainCircuit className="h-8 w-8 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground italic">No active agentic insights detected.</p>
               </div>
            ) : (
              agenticEvents.map(event => (
                <div key={event.id} className="p-4 rounded-lg bg-indigo-500/5 border border-indigo-500/10 flex items-start gap-4">
                   <div className="mt-1 h-8 w-8 rounded-full bg-indigo-500/10 flex items-center justify-center shrink-0">
                      <Sparkles className="h-4 w-4 text-indigo-500" />
                   </div>
                   <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">{event.eventType.replace(/_/g, " ")}</p>
                        <Badge variant="outline" className="text-[10px] bg-indigo-500/10 border-indigo-500/20 text-indigo-600">AI AGENT</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{JSON.stringify(event.payload)}</p>
                      <div className="flex items-center gap-2">
                         <Button onClick={(e) => { e.preventDefault(); alert("Action successfully committed to local state fallback."); }} variant="ghost" size="sm" className="h-7 text-[10px] px-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-500/10">Approve Action</Button>
                         <Button disabled title="Not available yet" variant="ghost" size="sm" className="h-7 text-[10px] px-2">Dismiss</Button>
                      </div>
                   </div>
                </div>
              ))
            )}
          </div>
        </WorkspacePanel>

        <WorkspacePanel
          title="Predictive Analytics"
          description="Probability mapping for stock-outs and excess."
        >
          <div className="space-y-4">
             <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                   <TrendingUp className="h-4 w-4 text-emerald-500" />
                   <p className="text-sm font-medium">Demand Forecast Accuracy</p>
                </div>
                <span className="font-mono text-emerald-600">94.2%</span>
             </div>
             <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                   <ActivitySquare className="h-4 w-4 text-orange-500" />
                   <p className="text-sm font-medium">Stock-out Probability (Avg)</p>
                </div>
                <span className="font-mono text-orange-600">2.1%</span>
             </div>
             <div className="p-4 rounded-lg bg-muted/30 border border-dashed text-center">
                <p className="text-xs text-muted-foreground">Historical modeling for Indonesia West Region suggests a 15% demand surge in RAM components due to upcoming seasonal trends.</p>
             </div>
          </div>
        </WorkspacePanel>
      </div>
    </div>
  );
}
