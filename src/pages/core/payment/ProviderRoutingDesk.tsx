import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { useSession } from "@/core/security/session";
import { paymentService } from "@/core/services/payment/paymentService";
import type { PaymentProvider, RoutingPolicy } from "@/core/types/payment/payment";
import { formatNumber } from "@/lib/format";
import { EmptyState } from "@/components/shared/AsyncState";

export default function ProviderRoutingDesk() {
  const session = useSession();
  const [refreshKey, setRefreshKey] = useState(0);
  const [providers, setProviders] = useState<PaymentProvider[]>([]);
  const [policies, setPolicies] = useState<RoutingPolicy[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [providersData, policiesData] = await Promise.all([
          paymentService.listProviders(session.tenant_id, session),
          paymentService.listRoutingPolicies(session.tenant_id, session),
        ]);
        setProviders(providersData);
        setPolicies(policiesData);
      } catch (error) {
        console.error("Failed to fetch provider routing data:", error);
      }
    };
    fetchData();
  }, [refreshKey, session]);

  const setProvider = (providerId: PaymentProvider["id"], status: PaymentProvider["status"]) => {
    paymentService.setProviderStatus(session.tenant_id, session, providerId, status);
    setRefreshKey((value) => value + 1);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Provider Routing Engine"
        subtitle="Multi-bank orchestration with fallback policy and provider health governance."
      />

      <WorkspacePanel title="Routing Policies" description="Priority and failover policy controlling provider selection.">
        <div className="grid gap-3 lg:grid-cols-2">
          {(Array.isArray(policies) ? policies : []).map((policy) => (
            <div key={policy.id} className="rounded-lg border p-3">
              <p className="text-sm font-medium">{policy.name}</p>
              <p className="text-xs text-muted-foreground">Retries: {policy.maxRetries} | Backoff: {policy.exponentialBackoffSeconds}s</p>
              <p className="mt-2 text-xs text-muted-foreground">Priorities: {policy.priorities.join(" -> ")}</p>
              <p className="text-xs text-muted-foreground">Fallbacks: {policy.fallbackProviders.join(" -> ")}</p>
              <div className="mt-2"><Badge variant={policy.enabled ? "secondary" : "outline"}>{policy.enabled ? "ENABLED" : "DISABLED"}</Badge></div>
            </div>
          ))}
        </div>
        {(Array.isArray(policies) ? policies : []).length === 0 ? (
          <EmptyState
            title="No routing policies"
            description="No provider routing policies are configured for this tenant scope yet."
          />
        ) : null}
      </WorkspacePanel>

      <WorkspacePanel title="Provider Status Control" description="Manual health override for routing continuity and failover drills.">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3 text-left">Provider</th>
              <th className="p-3 text-left">Channels</th>
              <th className="p-3 text-left">Limit</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(Array.isArray(providers) ? providers : []).map((provider) => (
              <tr key={provider.id} className="border-t">
                <td className="p-3 font-medium">{provider.id}</td>
                <td className="p-3 text-muted-foreground">{provider.channels.join(", ")}</td>
                <td className="p-3 text-muted-foreground">{formatNumber(provider.maxAmountPerTxn)}</td>
                <td className="p-3">
                  <Badge variant={provider.status === "HEALTHY" ? "secondary" : provider.status === "DEGRADED" ? "outline" : "destructive"}>
                    {provider.status}
                  </Badge>
                </td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => setProvider(provider.id, "HEALTHY")}>Healthy</Button>
                    <Button size="sm" variant="outline" onClick={() => setProvider(provider.id, "DEGRADED")}>Degraded</Button>
                    <Button size="sm" variant="destructive" onClick={() => setProvider(provider.id, "DOWN")}>Down</Button>
                  </div>
                </td>
              </tr>
            ))}
            {(Array.isArray(providers) ? providers : []).length === 0 ? (
              <tr>
                <td colSpan={5} className="p-0">
                  <EmptyState
                    title="No providers configured"
                    description="No payment providers are registered for this tenant scope yet."
                  />
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        </div>
      </WorkspacePanel>
    </div>
  );
}

