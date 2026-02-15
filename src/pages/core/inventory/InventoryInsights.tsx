import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { DataTableShell } from "@/core/tools/DataTableShell";
import { FilterBar } from "@/core/tools/FilterBar";
import { useSession } from "@/core/security/session";
import { inventoryService } from "@/core/services/inventory/inventoryService";

export default function InventoryInsights() {
  const session = useSession();
  const [search, setSearch] = useState("");

  const balances = inventoryService.listBalances(session.tenantId);
  const movements = inventoryService.listMovements(session.tenantId);
  const dashboard = inventoryService.getDashboard(session.tenantId);
  const integrationEvents = inventoryService.listIntegrationEvents(session.tenantId);

  const turnoverProxy = useMemo(() => {
    const deductions = movements
      .filter((item) => item.type === "DEDUCTION")
      .reduce((sum, item) => sum + item.quantity, 0);
    const averageOnHand = balances.length
      ? balances.reduce((sum, item) => sum + item.quantity, 0) / balances.length
      : 0;
    return averageOnHand > 0 ? (deductions / averageOnHand).toFixed(2) : "0.00";
  }, [balances, movements]);

  const insightRows = useMemo(
    () => [
      { id: "inv-ins-1", label: "Total on-hand quantity", category: "STOCK", value: String(dashboard.totalOnHandQty) },
      { id: "inv-ins-2", label: "Total valuation", category: "FINANCE", value: dashboard.totalValuation.toLocaleString() },
      { id: "inv-ins-3", label: "Low stock alerts", category: "RISK", value: String(dashboard.lowStockCount) },
      { id: "inv-ins-4", label: "Expiry alerts", category: "RISK", value: String(dashboard.expiryWarningCount) },
      { id: "inv-ins-5", label: "Pending adjustments", category: "GOVERNANCE", value: String(dashboard.pendingAdjustments) },
      { id: "inv-ins-6", label: "Pending procurement receipts", category: "INTEGRATION", value: String(dashboard.pendingReceiptSyncs) },
      { id: "inv-ins-7", label: "Turnover proxy", category: "PERFORMANCE", value: turnoverProxy },
      {
        id: "inv-ins-8",
        label: "Synced integration events",
        category: "INTEGRATION",
        value: String(integrationEvents.filter((item) => item.status === "SYNCED").length),
      },
    ],
    [dashboard, integrationEvents, turnoverProxy],
  );

  const filteredRows = useMemo(
    () =>
      insightRows.filter((item) =>
        search
          ? `${item.label} ${item.category}`.toLowerCase().includes(search.toLowerCase())
          : true,
      ),
    [insightRows, search],
  );

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

      <WorkspacePanel title="Insight Cards" description="Inventory performance and governance indicators.">
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

      <WorkspacePanel title="Insight Table" description="Filterable inventory analytics for reporting.">
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
    </div>
  );
}

