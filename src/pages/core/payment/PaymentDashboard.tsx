import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { useSession } from "@/core/security/session";
import { paymentService } from "@/core/services/payment/paymentService";
import { CreatePaymentModal } from "@/core/finance/FinanceModalForms";
import type {
  PaymentDashboardMetrics,
  PaymentProvider,
  PaymentTransaction,
} from "@/core/types/payment/payment";
import { formatCurrency, safeText } from "@/lib/format";
import { statusLabel } from "@/lib/contract/statusLabel";
import { EmptyState, LoadingSkeleton } from "@/components/shared/AsyncState";

export default function PaymentDashboard() {
  const session = useSession();
  const [refreshKey, setRefreshKey] = useState(0);
  const [metrics, setMetrics] = useState<PaymentDashboardMetrics | null>(null);
  const [providers, setProviders] = useState<PaymentProvider[]>([]);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [createPaymentOpen, setCreatePaymentOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [metricsData, providersData, transactionsData] =
          await Promise.all([
            paymentService.getDashboard(session.tenant_id, session),
            paymentService.listProviders(session.tenant_id, session),
            paymentService.listTransactions(session.tenant_id, session),
          ]);
        setMetrics(metricsData);
        setProviders(providersData);
        setTransactions(transactionsData.slice(0, 8));
      } catch (error) {
        console.error("Failed to fetch payment dashboard data:", error);
      }
    };
    fetchData();
  }, [refreshKey, session.tenant_id]);

  if (!metrics) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Payment Command Center"
          subtitle="Idempotent execution, routing governance, settlement reliability, and immutable evidence."
          primaryAction={
            <Button
              onClick={() => setCreatePaymentOpen(true)}
              aria-label="Create Payment"
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Payment
            </Button>
          }
        />
        <LoadingSkeleton variant="cards" count={6} label="Loading payment dashboard" />
        <CreatePaymentModal
          isOpen={createPaymentOpen}
          onClose={() => setCreatePaymentOpen(false)}
          onSuccess={() => setRefreshKey((value) => value + 1)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payment Command Center"
        subtitle="Idempotent execution, routing governance, settlement reliability, and immutable evidence."
        primaryAction={
          <Button
            onClick={() => setCreatePaymentOpen(true)}
            aria-label="Create Payment"
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Payment
          </Button>
        }
        secondaryActions={
          <Button
            variant="outline"
            onClick={() => {
              paymentService.runProviderHealthCheck(session.tenant_id, session);
              setRefreshKey((value) => value + 1);
            }}
          >
            Run Provider Health Sweep
          </Button>
        }
      />

      <WorkspacePanel
        title="Execution Metrics"
        description="Live status of approvals, execution, settlement, and dispute load."
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Pending approvals</p>
            <p className="text-2xl font-semibold">{metrics.pendingApprovals}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Executing now</p>
            <p className="text-2xl font-semibold">
              {metrics.executingPayments}
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Settlement pending</p>
            <p className="text-2xl font-semibold">
              {metrics.settlementPending}
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Settled today</p>
            <p className="text-2xl font-semibold">{metrics.settledToday}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Failed transactions</p>
            <p className="text-2xl font-semibold">
              {metrics.failedTransactions}
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Open disputes</p>
            <p className="text-2xl font-semibold">{metrics.openDisputes}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Open chargebacks</p>
            <p className="text-2xl font-semibold">{metrics.openChargebacks}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Pending refunds</p>
            <p className="text-2xl font-semibold">{metrics.refundPending}</p>
          </div>
        </div>
      </WorkspacePanel>

      {/* --- MODULE CONTRIBUTIONS --- */}
      {metrics.moduleContributions?.retail && (
        <WorkspacePanel
          title="Module Contributions: Retail Payments"
          description="In-store physical POS device health and retail payment dispute rate."
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border p-3 border-success/20 bg-success">
              <p className="text-xs text-muted-foreground">
                Active POS Devices
              </p>
              <p className="text-2xl font-semibold text-success dark:text-success">
                {metrics.moduleContributions.retail.activePosDevices}
              </p>
            </div>
            <div className="rounded-lg border p-3 border-success/20 bg-success">
              <p className="text-xs text-muted-foreground">
                Store Payment Disputes
              </p>
              <p className="text-2xl font-semibold text-success dark:text-success">
                {metrics.moduleContributions.retail.totalDisputes}
              </p>
            </div>
          </div>
        </WorkspacePanel>
      )}

      <WorkspacePanel
        title="Provider Health"
        description="Multi-bank/provider routing health and heartbeat state."
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {(Array.isArray(providers) ? providers : []).map((provider) => (
            <div key={provider.id} className="rounded-lg border p-3">
              <p className="text-sm font-medium">{safeText(provider.name)}</p>
              <p className="text-xs text-muted-foreground">
                {provider.channels.join(", ")}
              </p>
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
        {(Array.isArray(providers) ? providers : []).length === 0 ? (
          <EmptyState
            title="No providers configured"
            description="No payment providers are registered for this tenant scope yet."
          />
        ) : null}
      </WorkspacePanel>

      <WorkspacePanel
        title="Recent Executions"
        description="Latest transaction state transitions and settlement state."
      >
        <div className="overflow-x-auto">
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
            {(Array.isArray(transactions) ? transactions : []).map((item) => (
              <tr key={item.id} className="border-t">
                <td className="p-3 font-medium">{item.id}</td>
                <td className="p-3 text-muted-foreground">{item.type}</td>
                <td className="p-3 text-muted-foreground">
                  {item.destination}
                </td>
                <td className="p-3 text-muted-foreground">
                  {formatCurrency(item.amount, item.currency)}
                </td>
                <td className="p-3 text-muted-foreground">
                  {safeText(item.providerId)}
                </td>
                <td className="p-3">
                  <Badge variant="outline">{statusLabel(item.status, "payment")}</Badge>
                </td>
              </tr>
            ))}
            {(Array.isArray(transactions) ? transactions : []).length === 0 ? (
              <tr>
                <td colSpan={6} className="p-0">
                  <EmptyState
                    title="No recent executions"
                    description="No payment transactions exist for this tenant scope yet."
                  />
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        </div>
      </WorkspacePanel>

      <CreatePaymentModal
        isOpen={createPaymentOpen}
        onClose={() => setCreatePaymentOpen(false)}
        onSuccess={() => setRefreshKey((value) => value + 1)}
      />
    </div>
  );
}
