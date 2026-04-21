import { useState, useEffect, useCallback } from "react";
import { useSession } from "@/core/security/session";
import { paymentService } from "@/core/services/payment/paymentService";
import type {
  PaymentDashboardMetrics,
  PaymentTransaction,
  PaymentProvider,
  PosDevice,
} from "@/core/types/payment/payment";

export interface PaymentDashboardState {
  metrics: PaymentDashboardMetrics | null;
  transactions: PaymentTransaction[];
  providers: PaymentProvider[];
  devices: PosDevice[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

const DEFAULT_METRICS: PaymentDashboardMetrics = {
  pendingApprovals: 0,
  executingPayments: 0,
  settlementPending: 0,
  settledToday: 0,
  failedTransactions: 0,
  openDisputes: 0,
  openChargebacks: 0,
  refundPending: 0,
};

/**
 * usePaymentDashboard
 *
 * Shared hook consumed by MoneyDesk (Finance), PaymentDashboard, and any
 * consumer module (IT, POS) that needs live payment infrastructure data.
 *
 * All calls honour the multi-tenant contract — tenantId is implicit via session.
 */
export function usePaymentDashboard(): PaymentDashboardState {
  const session = useSession();

  const [metrics, setMetrics] = useState<PaymentDashboardMetrics | null>(null);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [providers, setProviders] = useState<PaymentProvider[]>([]);
  const [devices, setDevices] = useState<PosDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashboardData, txns, providerList, deviceList] = await Promise.allSettled([
        paymentService.getDashboard(session.tenantId, session),
        paymentService.listTransactions(session.tenantId, session),
        paymentService.listProviders(session.tenantId, session),
        paymentService.listDevices(session.tenantId, session),
      ]);

      setMetrics(
        dashboardData.status === "fulfilled"
          ? dashboardData.value
          : DEFAULT_METRICS,
      );
      setTransactions(txns.status === "fulfilled" ? txns.value : []);
      setProviders(providerList.status === "fulfilled" ? providerList.value : []);
      setDevices(deviceList.status === "fulfilled" ? deviceList.value : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load payment data.");
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { metrics, transactions, providers, devices, loading, error, refresh: fetchAll };
}

/* ─── Derived helpers (used in NavWidgets) ───────────────────────── */

/** Active providers count (status === HEALTHY) */
export const activeProviderCount = (providers: PaymentProvider[]) =>
  providers.filter((p) => p.status === "HEALTHY").length;

/** Online POS device count */
export const onlineDeviceCount = (devices: PosDevice[]) =>
  devices.filter((d) => d.status === "ONLINE").length;

/** Total settled volume today from transaction list */
export const settledVolumeToday = (transactions: PaymentTransaction[]) => {
  const today = new Date().toDateString();
  return transactions
    .filter(
      (tx) =>
        tx.status === "SETTLED" &&
        new Date(tx.updatedAt).toDateString() === today,
    )
    .reduce((sum, tx) => sum + tx.amount, 0);
};

/** Format a raw IDR number as a short label (e.g. 2400000000 → "Rp 2.4B") */
export function formatIdr(value: number): string {
  if (value >= 1_000_000_000) return `Rp ${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `Rp ${(value / 1_000_000).toFixed(0)}M`;
  if (value >= 1_000) return `Rp ${(value / 1_000).toFixed(0)}K`;
  return `Rp ${value.toLocaleString()}`;
}
