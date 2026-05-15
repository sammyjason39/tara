import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSession } from "@/core/security/session";
import { inventoryService } from "@/core/services/inventory/inventoryService";
import type {
  InventoryAlert,
  InventoryDashboardMetrics,
} from "@/core/types/inventory/inventory";
import { 
  Package, 
  TrendingUp, 
  ShieldAlert, 
  Clock, 
  ArrowUpRight, 
  Activity, 
  CheckCircle2, 
  AlertCircle,
  Truck,
  Building2,
  Box,
  Search,
  RefreshCcw,
  Zap,
  Layers,
  BarChart3
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function InventoryDashboard() {
  const session = useSession();
  const [metrics, setMetrics] = useState<InventoryDashboardMetrics | null>(null);
  const [alerts, setAlerts] = useState<InventoryAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [m, a] = await Promise.all([
        inventoryService.getDashboard(session.tenant_id, session),
        inventoryService.listAlerts(session.tenant_id, session),
      ]);
      setMetrics(m);
      setAlerts(a);
    } catch (error) {
      console.error("Failed to fetch inventory dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }, [session.tenant_id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const openAlerts = useMemo(
    () => (Array.isArray(alerts) ? alerts : []).filter((item) => item.status === "OPEN").slice(0, 8),
    [alerts],
  );

  if (loading || !metrics) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50/50 dark:bg-slate-950/50">
        <div className="flex flex-col items-center gap-4">
           <div className="h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
           <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Initializing Stock Intelligence...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full p-8 space-y-10 bg-slate-50/50 dark:bg-slate-950/50">
      {/* Tactical Header */}
      <div className="flex items-end justify-between border-b border-slate-200 dark:border-slate-800 pb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-blue-600 font-black text-[10px] uppercase tracking-[0.3em]">
            <Layers className="h-3 w-3" /> Global Stock Control Node
          </div>
          <h1 className="text-4xl font-black tracking-tighter uppercase italic text-slate-900 dark:text-white">
            Inventory Command
          </h1>
          <p className="text-sm text-slate-500 font-medium">End-to-end stock posture, warehouse utilization, and operational telemetry.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline"
            onClick={async () => {
              await inventoryService.runExpiryScan(session.tenant_id, session);
              refresh();
            }}
            className="rounded-xl border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-[10px] font-black uppercase tracking-widest px-6"
          >
            Expiry Scan
          </Button>
          <Button 
            onClick={async () => {
              await inventoryService.runLowStockScan(session.tenant_id, session);
              refresh();
            }}
            className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 gap-2 text-[10px] font-black uppercase tracking-widest px-6"
          >
            <RefreshCcw className={cn("h-4 w-4", loading && "animate-spin")} />
            Sync Pulse
          </Button>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        {[
          { label: "Master Items", value: metrics.total_items, color: "blue", icon: Box },
          { label: "On-Hand Qty", value: (metrics.total_on_hand_qty || 0).toLocaleString(), color: "emerald", icon: Package },
          { label: "Stock Valuation", value: `Rp ${(metrics.total_valuation || 0).toLocaleString()}`, color: "indigo", icon: BarChart3 },
          { label: "Pending Adj", value: metrics.pending_adjustments, color: "rose", icon: Activity },
          { label: "Pending Syncs", value: metrics.pending_receipt_syncs, color: "amber", icon: RefreshCcw },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="group relative p-6 rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-2xl transition-all duration-500 hover:-translate-y-1">
              <div className="relative z-10 space-y-4">
                <div className={cn(
                  "h-10 w-10 rounded-xl flex items-center justify-center transition-all duration-500 group-hover:rotate-12",
                  stat.color === 'blue' ? "bg-blue-500/10 text-blue-600" :
                  stat.color === 'emerald' ? "bg-emerald-500/10 text-emerald-600" :
                  stat.color === 'indigo' ? "bg-indigo-500/10 text-indigo-600" :
                  stat.color === 'rose' ? "bg-rose-500/10 text-rose-600" :
                  "bg-amber-500/10 text-amber-600"
                )}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{stat.label}</p>
                  <p className="text-3xl font-black tracking-tighter text-slate-900 dark:text-white leading-none">{stat.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Operational Matrix */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Alerts & Incidents */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
             <h3 className="text-lg font-black tracking-tight uppercase italic text-slate-800 dark:text-slate-200 flex items-center gap-3">
               <AlertCircle className="h-5 w-5 text-rose-500" /> Operational Incidents
             </h3>
             <Badge className="bg-rose-500/10 text-rose-600 border-none px-3 py-1 text-[8px] font-black uppercase tracking-widest">Global Scan Active</Badge>
          </div>
          
          <div className="grid gap-4">
            {openAlerts.length === 0 ? (
              <div className="p-12 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center gap-4">
                 <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Stock Posture Stable. No Open Incidents.</p>
              </div>
            ) : (
              (Array.isArray(openAlerts) ? openAlerts : []).map((alert) => (
                <div key={alert.id} className="group flex items-center justify-between p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-rose-500/30 hover:shadow-xl transition-all duration-500">
                  <div className="flex items-center gap-6">
                    <div className={cn(
                      "h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-500",
                      alert.severity === 'HIGH' ? "bg-rose-500 text-white shadow-lg shadow-rose-500/20" : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                    )}>
                      <ShieldAlert className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900 dark:text-white tracking-tight uppercase">{alert.type}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{alert.message}</p>
                    </div>
                  </div>
                  <Badge className={cn(
                    "border-none px-3 py-1 text-[8px] font-black uppercase tracking-widest",
                    alert.severity === 'HIGH' ? "bg-rose-500/10 text-rose-600" : "bg-slate-100 text-slate-500"
                  )}>{alert.severity}</Badge>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Warehouse Telemetry */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
             <h3 className="text-lg font-black tracking-tight uppercase italic text-slate-800 dark:text-slate-200 flex items-center gap-3">
               <Building2 className="h-5 w-5 text-blue-500" /> Warehouse Node
             </h3>
          </div>

          <div className="p-8 rounded-[2.5rem] bg-slate-900 text-white relative overflow-hidden group shadow-2xl shadow-slate-900/20">
             <div className="absolute top-0 right-0 h-40 w-40 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl group-hover:scale-150 transition-transform duration-1000" />
             <div className="relative z-10 space-y-6">
                <div className="space-y-2">
                   <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Global Utilization</p>
                   <div className="flex items-center justify-between">
                      <span className="text-3xl font-black tracking-tighter uppercase italic leading-none">84.2%</span>
                      <TrendingUp className="h-6 w-6 text-emerald-400" />
                   </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-white/10">
                   {[
                     { label: "Active Locations", value: metrics.total_locations },
                     { label: "Dept Scopes", value: metrics.total_departments },
                     { label: "Low Stock Node", value: metrics.low_stock_count },
                     { label: "Expiry Warning", value: metrics.expiry_warning_count },
                   ].map((node) => (
                     <div key={node.label} className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">{node.label}</span>
                        <span className="text-[10px] font-black tracking-widest">{node.value}</span>
                     </div>
                   ))}
                </div>

                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white border-none text-[9px] font-black uppercase tracking-widest py-6 rounded-2xl shadow-xl shadow-blue-600/20">
                   View Logistics Map
                </Button>
             </div>
          </div>

          {/* Module Contributions */}
          {metrics.module_contributions?.retail && (
             <div className="p-6 rounded-3xl bg-emerald-500/5 border border-emerald-500/20 space-y-4">
                <div className="flex items-center gap-3 text-emerald-600">
                   <Zap className="h-5 w-5" />
                   <span className="text-xs font-black uppercase tracking-widest">Retail Contribution</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1">
                      <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Store Stock</p>
                      <p className="text-lg font-black text-slate-900 dark:text-white tracking-tighter italic">{metrics.module_contributions.retail.store_inventory_count}</p>
                   </div>
                   <div className="space-y-1">
                      <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Pending X-Fer</p>
                      <p className="text-lg font-black text-slate-900 dark:text-white tracking-tighter italic">{metrics.module_contributions.retail.pending_store_transfers}</p>
                   </div>
                </div>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
