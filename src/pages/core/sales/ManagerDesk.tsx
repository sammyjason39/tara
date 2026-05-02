import { useCallback, useEffect, useMemo, useState } from "react";
import { 
  Users, 
  RefreshCw, 
  Search, 
  ShieldCheck, 
  Activity, 
  Zap, 
  DollarSign, 
  TrendingUp, 
  AlertCircle, 
  Target, 
  CheckCircle2, 
  ChevronRight, 
  ArrowUpRight,
  BarChart3,
  Layers,
  History,
  Timer,
  FileCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useSession } from "@/core/security/session";
import { salesService } from "@/core/services/sales/salesService";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { SalesAlert, SalesManagerMetrics, SalesOpportunity } from "@/core/types/sales/sales";

export default function ManagerDesk() {
  const session = useSession();
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metrics, setMetrics] = useState<SalesManagerMetrics | null>(null);
  const [opportunities, setOpportunities] = useState<SalesOpportunity[]>([]);
  const [alerts, setAlerts] = useState<SalesAlert[]>([]);

  const refresh = useCallback(async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);
      const [m, o, a] = await Promise.all([
        salesService.getManagerMetrics(session.tenant_id, session),
        salesService.listOpportunities(session.tenant_id, session),
        salesService.listAlerts(session.tenant_id, session),
      ]);
      setMetrics(m);
      setOpportunities(o);
      setAlerts(a);
      if (isManual) toast.success("Leadership telemetry synchronized.");
    } catch (err) {
      console.error("Failed to fetch manager desk data:", err);
      toast.error("Telemetry failure in manager desk.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session.tenant_id, session]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filteredOpportunities = useMemo(
    () =>
      (Array.isArray(opportunities) ? opportunities : []).filter((item) =>
        search
          ? `${item.accountName} ${item.ownerName} ${item.stage}`
              .toLowerCase()
              .includes(search.toLowerCase())
          : true,
      ),
    [opportunities, search],
  );

  const handleAcknowledge = async (id: string) => {
    try {
      await salesService.acknowledgeAlert(session.tenant_id, session, id);
      toast.success("Alert acknowledged and archived.");
      refresh(true);
    } catch (err) {
      toast.error("Acknowledgement failure.");
    }
  };

  const runSweep = async () => {
    try {
      setRefreshing(true);
      await salesService.runSlaSweep(session.tenant_id, session);
      toast.success("Tactical health sweep completed.", {
        description: "All lead and opportunity nodes validated for SLA compliance."
      });
      refresh(true);
    } catch (err) {
      toast.error("Sweep protocol failure.");
      setRefreshing(false);
    }
  };

  if (loading || !metrics) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-6">
          <div className="h-20 w-20 bg-indigo-600 rounded-[2.5rem] animate-bounce flex items-center justify-center shadow-2xl shadow-indigo-500/20">
            <ShieldCheck className="h-10 w-10 text-white" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Syncing Manager Console...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-10 animate-in fade-in duration-1000 max-w-[1600px] mx-auto pb-24">
      {/* Premium Header */}
      <div className="flex flex-col lg:flex-row justify-between items-end gap-6">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Badge className="bg-indigo-600 text-white border-none font-black px-3 py-1 rounded-full uppercase tracking-widest text-[10px]">Strategic Oversight</Badge>
            <div className="flex items-center gap-1.5 text-indigo-500 font-bold text-xs uppercase tracking-widest">
               <Activity className="h-4 w-4 animate-pulse" />
               Managerial Console Active
            </div>
          </div>
          <h1 className="text-6xl font-black tracking-tighter bg-gradient-to-br from-slate-900 via-slate-700 to-indigo-900 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">Manager View</h1>
          <p className="text-slate-500 font-medium max-w-2xl text-lg leading-relaxed italic">"Leadership is the capacity to translate vision into reality through tactical oversight."</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl p-2 rounded-[2rem] border border-white/20 dark:border-slate-800/20 shadow-2xl">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                className="pl-11 h-14 w-[300px] rounded-[1.5rem] bg-transparent border-none focus-visible:ring-0 text-base font-medium"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search team deals..."
              />
            </div>
            <Button
              variant="secondary"
              className="h-14 w-14 rounded-[1.5rem] bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-500/20"
              onClick={() => refresh(true)}
              disabled={refreshing}
            >
              <RefreshCw className={cn("h-6 w-6", refreshing && "animate-spin")} />
            </Button>
          </div>
          <Button 
            className="h-[4.5rem] px-10 rounded-[2rem] bg-emerald-600 hover:bg-emerald-700 shadow-2xl shadow-emerald-500/30 font-black text-sm gap-3 group transition-all hover:scale-105 active:scale-95"
            onClick={runSweep}
            disabled={refreshing}
          >
            <ShieldCheck className="h-6 w-6 group-hover:scale-110 transition-transform" /> 
            RUN HEALTH SWEEP
          </Button>
        </div>
      </div>

      {/* Team Snapshot Grid */}
      <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Strategic Reps", value: metrics.totalReps, icon: Users, color: "slate" },
          { label: "Open Pipeline", value: `$${metrics.openPipeline.toLocaleString()}`, icon: Layers, color: "indigo" },
          { label: "Weighted Forecast", value: `$${metrics.weightedForecast.toLocaleString()}`, icon: Zap, color: "indigo" },
          { label: "Stalled Nodes", value: metrics.stalledDeals, icon: Timer, color: "amber" },
          { label: "SLA Breaches", value: metrics.slaBreaches, icon: AlertCircle, color: "rose" },
          { label: "Pending Approvals", value: metrics.approvalsPending, icon: FileCheck, color: "emerald" },
        ].map((stat, i) => (
          <Card key={i} className="rounded-3xl border-none shadow-lg bg-white dark:bg-slate-900 p-6 flex flex-col items-center justify-center text-center space-y-2 hover:shadow-xl transition-all hover:-translate-y-1">
             <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center mb-1", `bg-${stat.color}-500/10`)}>
                <stat.icon className={cn("h-5 w-5", `text-${stat.color}-500`)} />
             </div>
             <h4 className="text-xl font-black tracking-tighter">{stat.value}</h4>
             <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400">{stat.label}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Deal Risk Watchlist */}
        <div className="col-span-12 lg:col-span-8">
          <Card className="rounded-[3rem] border-none shadow-2xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl overflow-hidden">
            <CardHeader className="p-10 pb-6 border-b border-white/20 dark:border-slate-800/20">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-2xl font-black tracking-tight flex items-center gap-3">
                    <Target className="h-6 w-6 text-indigo-600" />
                    Strategic Deal Watchlist
                  </CardTitle>
                  <CardDescription className="text-sm font-medium">High-risk and stalled opportunities requiring immediate coaching or intervention.</CardDescription>
                </div>
                <Button variant="ghost" className="text-indigo-600 font-black uppercase tracking-widest text-[10px] gap-2">
                   Board Analysis <ArrowUpRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50/50 dark:bg-slate-800/50">
                    <tr>
                      <th className="px-10 py-6 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Account Designation</th>
                      <th className="px-10 py-6 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Custodian</th>
                      <th className="px-10 py-6 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Lifecycle Node</th>
                      <th className="px-10 py-6 text-right text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Nominal Value</th>
                      <th className="px-10 py-6 text-right text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Health Index</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10 dark:divide-slate-800/10">
                    {filteredOpportunities.map((item) => (
                      <tr key={item.id} className="group hover:bg-white/60 dark:hover:bg-slate-800/60 transition-all cursor-default">
                        <td className="px-10 py-8">
                           <div className="flex items-center gap-4">
                              <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-xs group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                 {item.accountName.charAt(0)}
                              </div>
                              <p className="font-black text-sm">{item.accountName}</p>
                           </div>
                        </td>
                        <td className="px-10 py-8">
                           <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-indigo-500" />
                              <span className="text-xs font-black uppercase tracking-tight">{item.ownerName}</span>
                           </div>
                        </td>
                        <td className="px-10 py-8">
                           <Badge variant="outline" className="rounded-full font-black text-[9px] px-3 py-1 border-slate-200 uppercase tracking-widest text-slate-500">{item.stage.replace('_', ' ')}</Badge>
                        </td>
                        <td className="px-10 py-8 text-right font-black text-slate-600 dark:text-slate-400">
                           ${item.amount.toLocaleString()}
                        </td>
                        <td className="px-10 py-8 text-right">
                           <Badge 
                            variant={item.health === "HIGH_RISK" ? "destructive" : "outline"}
                            className={cn(
                              "rounded-full font-black text-[9px] px-3 py-1 border-none shadow-sm uppercase tracking-widest",
                              item.health === "HEALTHY" ? "bg-emerald-500/10 text-emerald-600" :
                              item.health === "STALLED" ? "bg-orange-500/10 text-orange-600" :
                              "bg-rose-500/10 text-rose-600"
                            )}
                           >
                            {item.health.replace('_', ' ')}
                           </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alert Queue */}
        <div className="col-span-12 lg:col-span-4 space-y-8">
           <Card className="rounded-[3rem] border-none shadow-2xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl overflow-hidden">
              <CardHeader className="p-10 pb-6 border-b border-white/20 dark:border-slate-800/20">
                 <CardTitle className="text-xl font-black tracking-tight flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-rose-500" />
                    Critical Alert Queue
                 </CardTitle>
                 <CardDescription className="text-xs font-medium">Real-time tactical alerts requiring immediate management protocol.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                 <ScrollArea className="h-[500px] pr-4">
                    <div className="space-y-4">
                       {alerts.length === 0 ? (
                         <div className="text-center py-20 grayscale opacity-30 space-y-4">
                            <ShieldCheck className="h-12 w-12 mx-auto" />
                            <p className="text-[10px] font-black uppercase tracking-widest">Protocol Compliant</p>
                         </div>
                       ) : (
                         alerts.map((alert) => (
                           <div key={alert.id} className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 space-y-3 group hover:shadow-lg transition-all">
                              <div className="flex justify-between items-start">
                                 <Badge className={cn(
                                   "rounded-full font-black text-[8px] px-2 py-0.5 border-none shadow-sm uppercase tracking-widest",
                                   alert.severity === "HIGH" ? "bg-rose-500 text-white" : "bg-orange-500 text-white"
                                 )}>
                                    {alert.severity} SEVERITY
                                 </Badge>
                                 {!alert.acknowledged ? (
                                   <Button 
                                     size="icon" 
                                     variant="ghost" 
                                     className="h-8 w-8 rounded-full hover:bg-emerald-500 hover:text-white transition-all"
                                     onClick={() => handleAcknowledge(alert.id)}
                                   >
                                      <CheckCircle2 className="h-4 w-4" />
                                   </Button>
                                 ) : (
                                   <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                                      <CheckCircle2 className="h-4 w-4" />
                                   </div>
                                 )}
                              </div>
                              <div className="space-y-1">
                                 <p className="text-xs font-black uppercase tracking-tight text-slate-900 dark:text-white">{alert.type.replace('_', ' ')}</p>
                                 <p className="text-[11px] font-medium text-slate-500 leading-relaxed italic">"{alert.message}"</p>
                              </div>
                              <div className="pt-2 flex justify-between items-center text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                                 <span>{new Date(alert.createdAt).toLocaleDateString()}</span>
                                 <span className="text-indigo-600">Action Required</span>
                              </div>
                           </div>
                         ))
                       )}
                    </div>
                 </ScrollArea>
              </CardContent>
           </Card>

           {/* Efficiency Pulse */}
           <Card className="rounded-[3rem] border-none shadow-2xl bg-indigo-600 text-white p-10 space-y-6 shadow-indigo-600/20 group">
              <div className="flex items-center justify-between">
                 <h3 className="text-lg font-black tracking-tight">Coaching Efficiency</h3>
                 <TrendingUp className="h-5 w-5 text-emerald-400" />
              </div>
              <div className="space-y-4">
                 <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest opacity-60">
                       <span>SLA COMPLIANCE</span>
                       <span>94%</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                       <div className="h-full bg-white rounded-full" style={{ width: "94%" }} />
                    </div>
                 </div>
                 <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest opacity-60">
                       <span>COACHING IMPACT</span>
                       <span>+12.4%</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                       <div className="h-full bg-emerald-400 rounded-full" style={{ width: "72%" }} />
                    </div>
                 </div>
              </div>
              <Button className="w-full h-14 rounded-2xl bg-white text-indigo-600 hover:bg-indigo-50 font-black text-xs uppercase tracking-widest shadow-xl">INITIATE COACHING PROTOCOL</Button>
           </Card>
        </div>
      </div>
    </div>
  );
}

const Timer = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="10" x2="14" y1="2" y2="2"/><line x1="12" x2="15" y1="14" y2="11"/><circle cx="12" cy="14" r="8"/></svg>;
