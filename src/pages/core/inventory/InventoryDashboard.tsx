import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { useSession } from "@/core/security/session";
import { inventoryService } from "@/core/services/inventory/inventoryService";
import type { InventoryAlert, InventoryDashboardMetrics } from "@/core/types/inventory/inventory";

export default function InventoryDashboard() {
  const session = useSession();
  const [metrics, setMetrics] = useState<InventoryDashboardMetrics>(
    inventoryService.getDashboard(session.tenantId),
  );
  const [alerts, setAlerts] = useState<InventoryAlert[]>(
    inventoryService.listAlerts(session.tenantId),
  );

  const refresh = useCallback(() => {
    setMetrics(inventoryService.getDashboard(session.tenantId));
    setAlerts(inventoryService.listAlerts(session.tenantId));
  }, [session.tenantId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const openAlerts = useMemo(
    () => alerts.filter((item) => item.status === "OPEN").slice(0, 8),
    [alerts],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Global Inventory Dashboard"
        subtitle="Company-wide stock posture, pending controls, and operational alerts."
        primaryAction={
          <Button
            onClick={() => {
              inventoryService.runLowStockScan(session.tenantId, session);
              refresh();
            }}
          >
            Run Low Stock Scan
          </Button>
        }
        secondaryActions={
          <Button
            variant="outline"
            onClick={() => {
              inventoryService.runExpiryScan(session.tenantId, session);
              refresh();
            }}
          >
            Run Expiry Scan
          </Button>
        }
      />

      <WorkspacePanel title="Health Snapshot" description="Inventory core KPIs across locations and departments.">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Master items</p>
            <p className="text-2xl font-semibold">{metrics.totalItems}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">On-hand quantity</p>
            <p className="text-2xl font-semibold">{metrics.totalOnHandQty.toLocaleString()}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Stock valuation</p>
            <p className="text-2xl font-semibold">{metrics.totalValuation.toLocaleString()}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Pending adjustments</p>
            <p className="text-2xl font-semibold">{metrics.pendingAdjustments}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Pending receipt syncs</p>
            <p className="text-2xl font-semibold">{metrics.pendingReceiptSyncs}</p>
          </div>
        </div>
      </WorkspacePanel>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <WorkspacePanel title="Open Alerts" description="Low stock, expiry, and anomaly alerts requiring actions.">
          <div className="space-y-3 text-sm">
            {openAlerts.length === 0 ? (
              <p className="rounded-lg border border-dashed p-3 text-muted-foreground">
                No open alerts.
              </p>
            ) : (
              openAlerts.map((alert) => (
                <div key={alert.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium text-foreground">{alert.type}</p>
                    <p className="text-xs text-muted-foreground">{alert.message}</p>
                  </div>
                  <Badge variant={alert.severity === "HIGH" ? "destructive" : "outline"}>
                    {alert.severity}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </WorkspacePanel>

        <WorkspacePanel title="Coverage" description="Hierarchy and governance workload distribution.">
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span>Active locations</span>
              <span className="font-semibold text-foreground">{metrics.totalLocations}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span>Department scopes</span>
              <span className="font-semibold text-foreground">{metrics.totalDepartments}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span>Low stock open</span>
              <span className="font-semibold text-foreground">{metrics.lowStockCount}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span>Expiry warnings</span>
              <span className="font-semibold text-foreground">{metrics.expiryWarningCount}</span>
            </div>
          </div>
        </WorkspacePanel>
      </div>
    </div>
  );
}

