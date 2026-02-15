import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { useSession } from "@/core/security/session";
import { paymentService } from "@/core/services/payment/paymentService";

export default function PaymentDashboard() {
  const session = useSession();
  const [refreshKey, setRefreshKey] = useState(0);

  const metrics = useMemo(
    () => paymentService.getDashboard(session.tenantId),
    [refreshKey, session.tenantId],
  );
  const providers = useMemo(
    () => paymentService.listProviders(session.tenantId),
    [refreshKey, session.tenantId],
  );
  const transactions = useMemo(
    () => paymentService.listTransactions(session.tenantId).slice(0, 8),
    [refreshKey, session.tenantId],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payment Command Center"
        subtitle="Idempotent execution, routing governance, settlement reliability, and immutable evidence."
        secondaryActions={
          <Button
            variant="outline"
            onClick={() => {
              paymentService.runProviderHealthCheck(session.tenantId, session);
              setRefreshKey((value) => value + 1);
            }}
          >
            Run Provider Health Sweep
          </Button>
        }
      />

      <WorkspacePanel title="Execution Metrics" description="Live status of approvals, execution, settlement, and dispute load.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Pending approvals</p><p className="text-2xl font-semibold">{metrics.pendingApprovals}</p></div>
          <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Executing now</p><p className="text-2xl font-semibold">{metrics.executingPayments}</p></div>
          <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Settlement pending</p><p className="text-2xl font-semibold">{metrics.settlementPending}</p></div>
          <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Settled today</p><p className="text-2xl font-semibold">{metrics.settledToday}</p></div>
          <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Failed transactions</p><p className="text-2xl font-semibold">{metrics.failedTransactions}</p></div>
          <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Open disputes</p><p className="text-2xl font-semibold">{metrics.openDisputes}</p></div>
          <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Open chargebacks</p><p className="text-2xl font-semibold">{metrics.openChargebacks}</p></div>
          <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Pending refunds</p><p className="text-2xl font-semibold">{metrics.refundPending}</p></div>
        </div>
      </WorkspacePanel>

      <WorkspacePanel title="Provider Health" description="Multi-bank/provider routing health and heartbeat state.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {providers.map((provider) => (
            <div key={provider.id} className="rounded-lg border p-3">
              <p className="text-sm font-medium">{provider.name}</p>
              <p className="text-xs text-muted-foreground">{provider.channels.join(", ")}</p>
              <div className="mt-2">
                <Badge
                  variant={
                    provider.status === "HEALTHY"
                      ? "secondary"
                      : provider.status === "DEGRADED"
                        ? "outline"
                        : "destructive"
                  }
                >
                  {provider.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </WorkspacePanel>

      <WorkspacePanel title="Recent Executions" description="Latest transaction state transitions and settlement state.">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3 text-left">ID</th>
              <th className="p-3 text-left">Type</th>
              <th className="p-3 text-left">Destination</th>
              <th className="p-3 text-left">Amount</th>
              <th className="p-3 text-left">Provider</th>
              <th className="p-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((item) => (
              <tr key={item.id} className="border-t">
                <td className="p-3 font-medium">{item.id}</td>
                <td className="p-3 text-muted-foreground">{item.type}</td>
                <td className="p-3 text-muted-foreground">{item.destination}</td>
                <td className="p-3 text-muted-foreground">{item.amount.toLocaleString()} {item.currency}</td>
                <td className="p-3 text-muted-foreground">{item.providerId ?? "-"}</td>
                <td className="p-3"><Badge variant="outline">{item.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </WorkspacePanel>
    </div>
  );
}

