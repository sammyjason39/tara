import {
  CreditCard, Banknote, Receipt, BarChart3, Lock, ShieldCheck,
  FileText, Building2, Target,
} from "lucide-react";
import { NavWidget, SectionLabel } from "./DashboardPrimitives";
import type { PaymentDashboardMetrics, PaymentProvider, PosDevice } from "@/core/types/payment/payment";
import { activeProviderCount, onlineDeviceCount, formatIdr } from "@/core/hooks/usePaymentDashboard";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/core/api/apiClient";
import { useSession } from "@/core/security/session";

interface OperationsCommandGridProps {
  payMetrics?: PaymentDashboardMetrics | null;
  providers?: PaymentProvider[];
  devices?: PosDevice[];
  pendingApprovals?: number;
  processedPayments?: number;
}

/**
 * OperationsCommandGrid
 *
 * Finance-owned operations command centre.
 * Accepts live metrics from usePaymentDashboard so the widget values are
 * real when the backend is available, and fall back gracefully when not.
 */
export function OperationsCommandGrid({
  payMetrics,
  providers = [],
  devices = [],
  pendingApprovals = 0,
  processedPayments = 0,
}: OperationsCommandGridProps) {
  const session = useSession();
  const onlineDevices = onlineDeviceCount(devices);
  const healthyProviders = activeProviderCount(providers);

  // Fetch governance & operations metrics from backend for stub replacement
  const { data: opsMetrics } = useQuery({
    queryKey: ["finance-operations-metrics"],
    queryFn: () => apiRequest<{
      budgetUtilization?: string;
      closePeriodLabel?: string;
      closePeriodSub?: string;
      activePolicies?: number;
      pendingPolicyReview?: number;
      assetRegistryValue?: string;
      taxStatus?: string;
      taxSub?: string;
    }>("/finance/dashboard/operations-metrics", "GET", session),
    staleTime: 30_000,
  });

  // Derive a live "Pay Flow" volume from pending + executing counts
  const livePayFlowLabel = payMetrics
    ? `${payMetrics.executingPayments + payMetrics.pendingApprovals} active`
    : "—";

  const liveSettledLabel = payMetrics
    ? `${payMetrics.settledToday} settled today`
    : "—";

  return (
    <div className="space-y-10">
      {/* ─── Row 1 + 2: Core Finance Operations (3 wide cards × 2 rows) ─── */}
      <section>
        <SectionLabel
          label="Finance Operations"
          sub="Click any card to navigate to the module"
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <NavWidget
            label="Pay Flow"
            value={livePayFlowLabel}
            sub="Execution pipeline"
            icon={CreditCard}
            color="text-primary"
            iconBg="bg-primary/10"
            href="/core/finance/payflow"
            trend={payMetrics ? `${payMetrics.pendingApprovals} pending` : undefined}
            trendUp={false}
          />
          <NavWidget
            label="Payable Desk"
            value={payMetrics ? `${payMetrics.settlementPending} bills` : "—"}
            sub="Outstanding liabilities"
            icon={Banknote}
            color="text-warning"
            iconBg="bg-warning"
            href="/core/finance/payables"
            trend={payMetrics && payMetrics.refundPending > 0 ? `${payMetrics.refundPending} refunds` : "Healthy"}
            trendUp={payMetrics ? payMetrics.refundPending === 0 : true}
          />
          <NavWidget
            label="Receivable Desk"
            value={pendingApprovals > 0 ? `${pendingApprovals} awaiting` : "Clear"}
            sub="AR inbox status"
            icon={Receipt}
            color="text-primary"
            iconBg="bg-primary"
            href="/core/finance/receivables"
            trend={pendingApprovals > 0 ? `${pendingApprovals} due` : "Optimal"}
            trendUp={pendingApprovals === 0}
          />
          <NavWidget
            label="Budget Studio"
            value={opsMetrics?.budgetUtilization ?? "—"}
            sub="Q1 utilization rate"
            icon={BarChart3}
            color="text-success"
            iconBg="bg-success"
            href="/core/finance/budget"
            trend={opsMetrics?.budgetUtilization ? "Live" : "Loading..."}
            trendUp
          />
          <NavWidget
            label="Close Period"
            value={opsMetrics?.closePeriodLabel ?? "—"}
            sub={opsMetrics?.closePeriodSub ?? "Loading..."}
            icon={Lock}
            color="text-destructive"
            iconBg="bg-destructive"
            href="/core/finance/close"
            trend={opsMetrics?.closePeriodSub ?? "—"}
            trendUp={false}
          />
          <NavWidget
            label="Audit Vault"
            value={payMetrics ? `${payMetrics.openDisputes} disputes` : "—"}
            sub={payMetrics ? `${payMetrics.openChargebacks} chargebacks` : "Loading..."}
            icon={ShieldCheck}
            color="text-sky-500"
            iconBg="bg-sky-500/10"
            href="/core/finance/audit"
            trend={payMetrics && payMetrics.openDisputes === 0 ? "Optimal" : "Review"}
            trendUp={payMetrics ? payMetrics.openDisputes === 0 : true}
          />
        </div>
      </section>

      {/* ─── Payment Gateway (3 cols) ──── */}
      <section>
        <SectionLabel
          label="Payment Gateway"
          sub="Live infrastructure — POS devices, bank providers, and settlement pipeline"
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <NavWidget
            label="Provider Routing"
            value={`${healthyProviders}/${providers.length}`}
            sub="Healthy bank providers"
            icon={Building2}
            color="text-teal-500"
            iconBg="bg-teal-500/10"
            href="/core/payment/providers"
            trend={healthyProviders === providers.length ? "All Healthy" : "Degraded"}
            trendUp={healthyProviders === providers.length}
          />
          <NavWidget
            label="POS Devices"
            value={`${onlineDevices}/${devices.length}`}
            sub="Online terminals"
            icon={CreditCard}
            color="text-primary"
            iconBg="bg-primary"
            href="/core/payment/devices"
            trend={onlineDevices === devices.length ? "All Online" : `${devices.length - onlineDevices} offline`}
            trendUp={onlineDevices === devices.length}
          />
          <NavWidget
            label="Settlements"
            value={liveSettledLabel}
            sub={payMetrics ? `${payMetrics.settlementPending} pending` : "—"}
            icon={Target}
            color="text-primary"
            iconBg="bg-primary"
            href="/core/payment/execution"
            trend={payMetrics && payMetrics.failedTransactions > 0 ? `${payMetrics.failedTransactions} failed` : "On Track"}
            trendUp={payMetrics ? payMetrics.failedTransactions === 0 : true}
          />
        </div>
      </section>

      {/* ─── Governance & Policy (4 cols) ─── */}
      <section>
        <SectionLabel
          label="Governance & Policy"
          sub="Strategic oversight and regulatory readiness"
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <NavWidget
            label="Policy Manager"
            value={opsMetrics?.activePolicies != null ? `${opsMetrics.activePolicies} Active` : "—"}
            sub={opsMetrics?.pendingPolicyReview != null ? `${opsMetrics.pendingPolicyReview} pending review` : "Loading..."}
            icon={ShieldCheck}
            color="text-primary"
            iconBg="bg-primary"
            href="/core/finance/policy"
            trend={opsMetrics?.pendingPolicyReview && opsMetrics.pendingPolicyReview > 0 ? "Review" : "On Track"}
            trendUp={!opsMetrics?.pendingPolicyReview || opsMetrics.pendingPolicyReview === 0}
          />
          <NavWidget
            label="Invoice Capture"
            value={`${processedPayments} processed`}
            sub="Payment ledger"
            icon={FileText}
            color="text-primary"
            iconBg="bg-primary"
            href="/core/finance/invoices"
            trend={processedPayments > 0 ? "+Active" : "Empty"}
            trendUp={processedPayments > 0}
          />
          <NavWidget
            label="Asset Registry"
            value={opsMetrics?.assetRegistryValue ?? "—"}
            sub="Capital deployed"
            icon={Building2}
            color="text-teal-500"
            iconBg="bg-teal-500/10"
            href="/core/finance/assets"
            trend={opsMetrics?.assetRegistryValue ? "Live" : "Loading..."}
            trendUp
          />
          <NavWidget
            label="Tax Center"
            value={opsMetrics?.taxStatus ?? "—"}
            sub={opsMetrics?.taxSub ?? "Loading..."}
            icon={Target}
            color="text-warning"
            iconBg="bg-warning"
            href="/core/finance/tax"
            trend={opsMetrics?.taxStatus ? "On Track" : "—"}
            trendUp
          />
        </div>
      </section>
    </div>
  );
}
