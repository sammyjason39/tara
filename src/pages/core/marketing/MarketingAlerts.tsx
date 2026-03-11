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
import type { MarketingAlert } from "@/core/types/marketing/marketing";

export default function MarketingAlerts() {
  const session = useSession();
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<MarketingAlert[]>([]);

  const refresh = useCallback(async () => {
    try {
      const a = await marketingService.listAlerts(session.tenantId, session);
      setAlerts(a);
    } catch (err) {
      console.error("Failed to fetch marketing alerts:", err);
    } finally {
      setLoading(false);
    }
  }, [session.tenantId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filtered = useMemo(
    () =>
      alerts.filter((item) =>
        search
          ? `${item.type} ${item.severity} ${item.message}`
              .toLowerCase()
              .includes(search.toLowerCase())
          : true,
      ),
    [alerts, search],
  );

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">Loading alerts...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Marketing Alerts"
        subtitle="Operational alerts for campaign failures, token expiry, and handoff SLA misses."
        secondaryActions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                await marketingService.runHealthSweep(session.tenantId, session);
                refresh();
              }}
            >
              Sweep
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

      <WorkspacePanel title="Alert Queue" description="Prioritized alert list with acknowledgement workflow.">
        <FilterBar searchValue={search} onSearchChange={setSearch} />
        <DataTableShell total={filtered.length} page={1} pageSize={20}>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Type</th>
                <th className="p-3 text-left">Severity</th>
                <th className="p-3 text-left">Entity</th>
                <th className="p-3 text-left">Message</th>
                <th className="p-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="p-3 font-medium">{item.type}</td>
                  <td className="p-3">
                    <Badge variant={item.severity === "HIGH" ? "destructive" : "outline"}>
                      {item.severity}
                    </Badge>
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {item.entityType}/{item.entityId}
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
