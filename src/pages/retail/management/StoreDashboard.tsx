import React, {
  useState,
  useEffect,
  useCallback,
  Suspense,
  useMemo,
} from "react";
import { PageHeader } from "@/core/ui/PageHeader";
import { RefreshCw, LayoutDashboard, ShieldCheck, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/core/security/session";
import { useToast } from "@/hooks/use-toast";
import { analyticsService } from "@/core/services/retail/analyticsService";
import { Roles } from "@/core/security/roles";
import {
  CommandCenterAnalytics,
  AnalyticsTimeRange,
} from "@/core/types/retail/analytics";
import { StrategicExpansionModal } from "@/components/ui/StrategicExpansionModal";

// Modular Components
import { GlobalKpiRow } from "./command-center/GlobalKpiRow";
import { TimeRangeFilter } from "./command-center/TimeRangeFilter";
import { LocationSwitcher } from "./command-center/LocationSwitcher";
import { useRealTimeAwareness } from "@/hooks/retail/useRealTimeAwareness";
import { useRetail } from "../context/RetailContext";

// Lazy Loaded Analytics Widgets
const RevenueAnalytics = React.lazy(() =>
  import("./command-center/RevenueAnalytics").then((m) => ({
    default: m.RevenueAnalytics,
  })),
);
const OperationalEfficiency = React.lazy(() =>
  import("./command-center/OperationalEfficiency").then((m) => ({
    default: m.OperationalEfficiency,
  })),
);
const InventoryIntelligence = React.lazy(() =>
  import("./command-center/InventoryIntelligence").then((m) => ({
    default: m.InventoryIntelligence,
  })),
);
const WorkforceAnalytics = React.lazy(() =>
  import("./command-center/WorkforceAnalytics").then((m) => ({
    default: m.WorkforceAnalytics,
  })),
);
const InfrastructureHealth = React.lazy(() =>
  import("./command-center/InfrastructureHealth").then((m) => ({
    default: m.InfrastructureHealth,
  })),
);
const RiskCompliancePanel = React.lazy(() =>
  import("./command-center/RiskCompliancePanel").then((m) => ({
    default: m.RiskCompliancePanel,
  })),
);

const StoreDashboard = () => {
  const session = useSession();
  const { toast } = useToast();

  // Dashboard State
  const [timeRange, setTimeRange] = useState<AnalyticsTimeRange>("TODAY");
  const { activeStore, setStore } = useRetail();
  const [data, setData] = useState<CommandCenterAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpansionModalOpen, setIsExpansionModalOpen] = useState(false);
  const [expansionFeature, setExpansionFeature] = useState("");

  // Sync scopedLocationId with RetailContext
  const scopedLocationId = useMemo(() => activeStore?.id, [activeStore]);

  // RBAC Helpers
  const permissions = session?.permissions || [];
  const rawRole = (session?.role || "").toString().toUpperCase();

  const isPrivileged =
    rawRole.includes("SUPERADMIN") ||
    rawRole.includes("OWNER") ||
    rawRole.includes("ADMIN") ||
    rawRole === Roles.SUPERADMIN ||
    rawRole === Roles.OWNER ||
    rawRole === Roles.COMPANY_ADMIN;

  const hasPermission = (perm: string) =>
    isPrivileged || permissions.includes(perm);

  const canViewFinancials =
    hasPermission("VIEW_FINANCIALS") || hasPermission("MANAGE_STORE");
  const canViewHR = hasPermission("VIEW_HR") || hasPermission("MANAGE_STORE");
  const canViewInventory =
    hasPermission("VIEW_INVENTORY") || hasPermission("MANAGE_STORE");
  const canViewDevices =
    hasPermission("VIEW_DEVICES") || hasPermission("MANAGE_STORE");
  const canViewRisk =
    hasPermission("VIEW_AUDIT") || hasPermission("MANAGE_STORE");

  // Data Fetching
  const fetchAnalytics = useCallback(async () => {
    try {
      setIsLoading(true);
      const analytics = await analyticsService.getCommandCenterData(
        session.tenant_id!,
        session,
        {
          timeRange,
          locationId: scopedLocationId,
        },
      );
      setData(analytics);
    } catch (error) {
      toast({
        title: "Sync Error",
        description: "Failed to establish uplink with analytics engine.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [session, timeRange, scopedLocationId, toast]);

  useEffect(() => {
    if (session.tenant_id) fetchAnalytics();
  }, [fetchAnalytics, session.tenant_id]);

  // Real-Time Awareness
  useRealTimeAwareness((event) => {
    // Incrementally update UI or trigger partial re-fetch
    if (event.type === "ORDER_CREATED" || event.type === "INVENTORY_CRITICAL") {
      fetchAnalytics();
    }
  });

  const openExpansion = (feature: string) => {
    setExpansionFeature(feature);
    setIsExpansionModalOpen(true);
  };

  if (isLoading && !data) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-8 relative z-10">
          <RefreshCw className="w-16 h-16 text-indigo-600 animate-spin" />
          <p className="text-[11px] font-black italic uppercase tracking-[0.4em] text-white">
            Calibrating Command Protocols...
          </p>
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(79,70,229,0.15)_0%,transparent_70%)]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 selection:bg-indigo-500 selection:text-white relative overflow-hidden">
      <StrategicExpansionModal
        isOpen={isExpansionModalOpen}
        onClose={() => setIsExpansionModalOpen(false)}
        featureName={expansionFeature}
      />

      {/* Atmospheric Background Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-rose-500/5 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute top-[20%] right-[5%] w-[30%] h-[30%] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Glassmorphic Command Header */}
      <div className="px-10 py-6 bg-slate-950/50 backdrop-blur-3xl border-b border-white/5 flex items-center justify-between sticky top-0 z-50 shadow-2xl">
        <div className="flex items-center gap-8">
          <div className="w-14 h-14 bg-slate-900 border border-white/10 rounded-2xl flex items-center justify-center text-white shadow-2xl group hover:rotate-3 transition-all duration-500">
            <LayoutDashboard className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white">
              Operational Command Center
            </h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] mt-1">
               Node: {scopedLocationId || "GLOBAL_ROOT"} • Security: {permissions.length} Grants • {rawRole}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 relative z-10">
          <div className="p-2 bg-white/5 rounded-[1.5rem] flex items-center gap-4 border border-white/10 backdrop-blur-3xl">
            <LocationSwitcher
              currentLocationId={scopedLocationId}
              onLocationChange={(id) => setStore(id || null)}
            />
            <div className="h-8 w-[1px] bg-white/10" />
            <TimeRangeFilter value={timeRange} onChange={setTimeRange} />
          </div>

          <Button
            variant="ghost"
            className="w-12 h-12 rounded-2xl p-0 border border-white/5 bg-white/5 text-white hover:bg-white/10 transition-all"
            onClick={fetchAnalytics}
          >
            <RefreshCw
              className={`w-5 h-5 ${isLoading ? "animate-spin text-indigo-400" : "text-slate-400"}`}
            />
          </Button>
        </div>
      </div>

      {/* Main Command Surface */}
      <div className="flex-1 p-10">
        <div className="max-w-[1920px] mx-auto space-y-12">
          {/* TIER 1: KPI Overview */}
          {data && <GlobalKpiRow kpis={data.kpis} />}

          {/* TIER 2: Financial + Operational Analytics */}
          <div className="space-y-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-2 h-8 bg-indigo-600 rounded-full shadow-lg shadow-indigo-600/50" />
                <h2 className="text-lg font-black italic uppercase tracking-tighter text-white">
                  Core Performance Matrix
                </h2>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                 <Zap className="w-4 h-4 text-indigo-400" />
                 <span className="text-[10px] font-black italic uppercase text-indigo-400 tracking-widest">Live Telemetry Synchronized</span>
              </div>
            </div>

            <Suspense
              fallback={
                <div className="h-[450px] bg-white/5 border border-white/5 rounded-[3rem] animate-pulse" />
              }
            >
              {canViewFinancials ? (
                data && <RevenueAnalytics data={data.revenue} />
              ) : (
                <div className="h-[250px] bg-white/5 rounded-[3rem] flex flex-col items-center justify-center border-2 border-dashed border-white/10 gap-4">
                  <ShieldCheck className="w-10 h-10 text-slate-700" />
                  <p className="text-[11px] font-black italic uppercase tracking-[0.2em] text-slate-500">
                    Financial Access Restricted
                  </p>
                </div>
              )}
            </Suspense>

            <Suspense
              fallback={
                <div className="h-[450px] bg-white/5 border border-white/5 rounded-[3rem] animate-pulse" />
              }
            >
              {data && <OperationalEfficiency data={data.efficiency} />}
            </Suspense>
          </div>

          {/* TIER 3: Specialized Intelligence Nodes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <Suspense
              fallback={
                <div className="h-[350px] bg-white/5 border border-white/5 rounded-[3rem] animate-pulse" />
              }
            >
              {canViewInventory ? (
                data && <InventoryIntelligence data={data.inventory} />
              ) : (
                <div className="h-[350px] bg-white/5 rounded-[3rem] flex items-center justify-center border border-white/5">
                  <p className="text-[10px] font-black italic uppercase tracking-widest text-slate-600">
                    Inventory Stream Restricted
                  </p>
                </div>
              )}
            </Suspense>

            <Suspense
              fallback={
                <div className="h-[350px] bg-white/5 border border-white/5 rounded-[3rem] animate-pulse" />
              }
            >
              {canViewHR ? (
                data && <WorkforceAnalytics data={data.workforce} />
              ) : (
                <div className="h-[350px] bg-white/5 rounded-[3rem] flex items-center justify-center border border-white/5">
                  <p className="text-[10px] font-black italic uppercase tracking-widest text-slate-600">
                    Workforce Analytics Restricted
                  </p>
                </div>
              )}
            </Suspense>

            <Suspense
              fallback={
                <div className="h-[350px] bg-white/5 border border-white/5 rounded-[3rem] animate-pulse" />
              }
            >
              {canViewDevices ? (
                data && <InfrastructureHealth data={data.infrastructure} />
              ) : (
                <div className="h-[350px] bg-white/5 rounded-[3rem] flex items-center justify-center border border-white/5">
                  <p className="text-[10px] font-black italic uppercase tracking-widest text-slate-600">
                    Infrastructure Telemetry Restricted
                  </p>
                </div>
              )}
            </Suspense>

            <Suspense
              fallback={
                <div className="h-[350px] bg-white/5 border border-white/5 rounded-[3rem] animate-pulse" />
              }
            >
              {canViewRisk ? (
                data && <RiskCompliancePanel data={data.risk} />
              ) : (
                <div className="h-[350px] bg-white/5 rounded-[3rem] flex items-center justify-center border border-white/5">
                  <p className="text-[10px] font-black italic uppercase tracking-widest text-slate-600">
                    Risk Assessment Restricted
                  </p>
                </div>
              )}
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoreDashboard;
