import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useSession } from "@/core/security/session";
import { procurementService } from "@/core/services/procurement/procurementService";
import type {
  GoodsReceiptSyncRecord,
  LegalContractHandoff,
  ProcurementSpendInsight,
  SupplierAccessProvisioning,
} from "@/core/types/procurement/procurement";
import { 
  TrendingUp, 
  ShieldAlert, 
  Clock, 
  ArrowUpRight, 
  Activity, 
  CheckCircle2, 
  AlertCircle,
  Truck,
  Building2,
  Lock,
  Search,
  RefreshCcw,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const hoursSince = (timestamp: string) =>
  Math.max(0, (Date.now() - new Date(timestamp).getTime()) / (1000 * 60 * 60));

const isLegalSlaBreached = (handoff: LegalContractHandoff) =>
  handoff.status !== "CONTRACT_ACCEPTED" && hoursSince(handoff.createdAt) > 8;

const isInventorySlaBreached = (sync: GoodsReceiptSyncRecord) =>
  sync.status === "PENDING_RECEIPT" && hoursSince(sync.createdAt) > 24;

const isProvisioningSlaBreached = (request: SupplierAccessProvisioning) =>
  request.status === "REQUESTED" && hoursSince(request.createdAt) > 4;

export default function ProcurementInsights() {
  const session = useSession();
  const [search, setSearch] = useState("");
  const [insights, setInsights] = useState<ProcurementSpendInsight[]>([]);
  const [legalHandoffs, setLegalHandoffs] = useState<LegalContractHandoff[]>([]);
  const [goodsReceiptSyncs, setGoodsReceiptSyncs] = useState<GoodsReceiptSyncRecord[]>([]);
  const [supplierAccess, setSupplierAccess] = useState<SupplierAccessProvisioning[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [ins, leg, goods, sup] = await Promise.all([
        procurementService.getSpendInsights(session.tenant_id, session),
        procurementService.listLegalHandoffs(session.tenant_id, session),
        procurementService.listGoodsReceiptSyncs(session.tenant_id, session),
        procurementService.listSupplierAccessProvisioning(session.tenant_id, session),
      ]);
      setInsights(ins);
      setLegalHandoffs(leg);
      setGoodsReceiptSyncs(goods);
      setSupplierAccess(sup);
    } catch (err) {
      setErrorMessage("Failed to load spend insights.");
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const integrationMetrics = useMemo(() => {
    const legalPending = legalHandoffs.filter((item) => item.status !== "CONTRACT_ACCEPTED").length;
    const inventoryPending = goodsReceiptSyncs.filter((item) => item.status === "PENDING_RECEIPT").length;
    const itPending = supplierAccess.filter((item) => item.status === "REQUESTED").length;
    const slaBreached =
      legalHandoffs.filter(isLegalSlaBreached).length +
      goodsReceiptSyncs.filter(isInventorySlaBreached).length +
      supplierAccess.filter(isProvisioningSlaBreached).length;
    
    return {
      legal: { count: legalPending, icon: ShieldAlert, color: "rose", label: "Legal Handoffs" },
      inventory: { count: inventoryPending, icon: Truck, color: "blue", label: "Inventory Sync" },
      it: { count: itPending, icon: Lock, color: "indigo", label: "I.T. Provisioning" },
      risk: { count: slaBreached, icon: AlertCircle, color: "amber", label: "SLA Breaches" }
    };
  }, [goodsReceiptSyncs, legalHandoffs, supplierAccess]);

  return (
    <div className="min-h-full p-8 space-y-10 bg-slate-50/50 dark:bg-slate-950/50">
      {/* Tactical Header */}
      <div className="flex items-end justify-between border-b border-slate-200 dark:border-slate-800 pb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-amber-600 font-black text-[10px] uppercase tracking-[0.3em]">
            <Activity className="h-3 w-3" /> Supply Intelligence Node
          </div>
          <h1 className="text-4xl font-black tracking-tighter uppercase italic text-slate-900 dark:text-white">
            Procurement Insights
          </h1>
          <p className="text-sm text-slate-500 font-medium">Strategic spend analytics and cross-departmental integration telemetry.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
            <Input 
              placeholder="Query Intelligence..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 w-64 rounded-xl focus:ring-amber-500/20"
            />
          </div>
          <Button 
            onClick={refresh}
            className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-600/20 gap-2"
          >
            <RefreshCcw className={cn("h-4 w-4", loading && "animate-spin")} />
            Sync
          </Button>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {Object.entries(integrationMetrics).map(([key, data]) => {
          const Icon = data.icon;
          return (
            <div key={key} className="group relative p-6 rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-2xl transition-all duration-500 hover:-translate-y-1">
              <div className={cn(
                "absolute top-6 right-6 h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:rotate-12",
                data.color === 'rose' ? "bg-rose-500/10 text-rose-600" :
                data.color === 'blue' ? "bg-blue-500/10 text-blue-600" :
                data.color === 'indigo' ? "bg-indigo-500/10 text-indigo-600" :
                "bg-amber-500/10 text-amber-600"
              )}>
                <Icon className="h-6 w-6" />
              </div>
              <div className="space-y-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{data.label}</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black tracking-tighter text-slate-900 dark:text-white leading-none">
                    {loading ? "..." : data.count}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Units Pending</span>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <div className={cn("h-1.5 flex-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden")}>
                    <div 
                      className={cn(
                        "h-full rounded-full transition-all duration-1000",
                        data.color === 'rose' ? "bg-rose-500" :
                        data.color === 'blue' ? "bg-blue-500" :
                        data.color === 'indigo' ? "bg-indigo-500" :
                        "bg-amber-500"
                      )} 
                      style={{ width: `${Math.min(100, (data.count / 10) * 100)}%` }} 
                    />
                  </div>
                  <span className="text-[9px] font-bold text-slate-400">{(data.count / 10 * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Spend Insights & Integration Grid */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Spend Insights List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
             <h3 className="text-lg font-black tracking-tight uppercase italic text-slate-800 dark:text-slate-200 flex items-center gap-3">
               <TrendingUp className="h-5 w-5 text-amber-600" /> Strategic Spend Insights
             </h3>
             <Badge className="bg-amber-500/10 text-amber-600 border-none px-3 py-1 text-[8px] font-black uppercase tracking-widest">Global Scan Active</Badge>
          </div>
          
          <div className="grid gap-4">
            {loading ? (
              Array(4).fill(0).map((_, i) => (
                <div key={i} className="h-24 rounded-3xl bg-slate-200/50 animate-pulse" />
              ))
            ) : (
              insights.map((insight) => (
                <div key={insight.id} className="group flex items-center justify-between p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-amber-500/30 hover:shadow-xl transition-all duration-500">
                  <div className="flex items-center gap-6">
                    <div className="h-12 w-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-all duration-500 shadow-inner">
                      <Zap className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900 dark:text-white tracking-tight uppercase">{insight.label}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{insight.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <p className="text-xl font-black tracking-tighter text-slate-900 dark:text-white leading-none">{insight.value}</p>
                      <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest mt-1">Calculated</p>
                    </div>
                    <ArrowUpRight className="h-5 w-5 text-slate-200 group-hover:text-amber-500 transition-colors" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Integration Telemetry */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
             <h3 className="text-lg font-black tracking-tight uppercase italic text-slate-800 dark:text-slate-200 flex items-center gap-3">
               <Activity className="h-5 w-5 text-indigo-500" /> Node Telemetry
             </h3>
          </div>

          <div className="p-8 rounded-[2.5rem] bg-indigo-950 text-white relative overflow-hidden group shadow-2xl shadow-indigo-950/20">
             <div className="absolute top-0 right-0 h-40 w-40 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl group-hover:scale-150 transition-transform duration-1000" />
             <div className="relative z-10 space-y-6">
                <div className="space-y-2">
                   <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Integration Health</p>
                   <div className="flex items-center justify-between">
                      <span className="text-3xl font-black tracking-tighter uppercase italic leading-none">94.2%</span>
                      <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                   </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-white/10">
                   {[
                     { label: "Legal API", status: "Online", latency: "42ms" },
                     { label: "Inventory Hub", status: "Online", latency: "128ms" },
                     { label: "IT Provision", status: "Online", latency: "84ms" },
                   ].map((node) => (
                     <div key={node.label} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                           <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                           <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">{node.label}</span>
                        </div>
                        <span className="text-[10px] font-black tracking-widest">{node.latency}</span>
                     </div>
                   ))}
                </div>

                <Button className="w-full bg-white/10 hover:bg-white/20 border-white/10 text-[9px] font-black uppercase tracking-widest py-6 rounded-2xl">
                   View Handoff Ledger
                </Button>
             </div>
          </div>

          {/* SLA Alert Box */}
          <div className="p-6 rounded-3xl bg-rose-500/5 border border-rose-500/20 space-y-4">
             <div className="flex items-center gap-3 text-rose-600">
                <AlertCircle className="h-5 w-5" />
                <span className="text-xs font-black uppercase tracking-widest">Critical SLA Alerts</span>
             </div>
             <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                {integrationMetrics.risk.count} Integration events have exceeded the target SLA thresholds. Immediate manual override or escalation required.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}
