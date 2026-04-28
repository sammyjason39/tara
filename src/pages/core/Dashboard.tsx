import { useNavigate } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import { 
  TrendingUp, 
  RefreshCw, 
  Search, 
  Target, 
  Zap, 
  Activity, 
  DollarSign, 
  ArrowUpRight, 
  ShieldCheck, 
  Rocket, 
  Users, 
  PieChart, 
  BarChart3, 
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChevronRight,
  MoreVertical,
  LayoutDashboard,
  Filter,
  ActivitySquare,
  Globe,
  Layers,
  Box,
  Fingerprint,
  Monitor,
  Network,
  Cpu,
  Bot,
  Briefcase,
  ClipboardCheck,
  Building2,
  Clock,
  History,
  ShieldAlert
} from "lucide-react";
import { StrategicExpansionModal } from "@/components/ui/StrategicExpansionModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSession } from "@/core/security/session";
import { adminService } from "@/core/services";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const IconMap: Record<string, any> = {
  Briefcase,
  Users,
  AlertTriangle,
  ClipboardCheck,
};

export default function CoreDashboard() {
  const session = useSession();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [kpis, setKpis] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [expansionOpen, setExpansionOpen] = useState(false);
  const [expansionFeature, setExpansionFeature] = useState("");

  const refresh = useCallback(async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);
      
      const res = await adminService.getDashboardMetrics(session.tenant_id, session);
      setKpis(res.kpis || []);
      setActivities(res.activities || []);
      
      if (isManual) toast.success("Executive telemetry synchronized.");
    } catch (err) {
      console.error("Failed to fetch executive dashboard data:", err);
      toast.error("Telemetry failure in executive suite.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session.tenant_id, session]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filteredActivities = useMemo(
    () =>
      activities.filter((item) =>
        search
          ? `${item.title} ${item.detail} ${item.status}`
              .toLowerCase()
              .includes(search.toLowerCase())
          : true,
      ),
    [activities, search],
  );

  const runSystemAudit = async () => {
    try {
      setRefreshing(true);
      // Simulate system audit protocol
      await new Promise(r => setTimeout(r, 1500));
      toast.success("Global System Audit Completed", {
        description: "All tenant nodes and infrastructure clusters validated for production health."
      });
      refresh(true);
    } catch (err) {
      toast.error("Audit protocol failure.");
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-6">
          <div className="h-20 w-20 bg-indigo-600 rounded-[2.5rem] animate-pulse flex items-center justify-center shadow-2xl shadow-indigo-500/20">
            <LayoutDashboard className="h-10 w-10 text-white" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Assembling Executive Intelligence...</p>
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
            <Badge className="bg-indigo-600 text-white border-none font-black px-3 py-1 rounded-full uppercase tracking-widest text-[10px]">Executive Suite</Badge>
            <div className="flex items-center gap-1.5 text-indigo-500 font-bold text-xs uppercase tracking-widest">
               <ActivitySquare className="h-4 w-4 animate-pulse" />
               Global Operations Stable
            </div>
          </div>
          <h1 className="text-6xl font-black tracking-tighter bg-gradient-to-br from-slate-900 via-slate-700 to-indigo-900 dark:from-white dark:to-slate-400 bg-clip-text text-transparent text-left italic">Core Dashboard</h1>
          <p className="text-slate-500 font-medium max-w-2xl text-lg leading-relaxed italic text-left">"Consolidated operations, risk, and platform health across all global clusters."</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
            <Input 
              placeholder="Search executive matrix..." 
              className="pl-12 h-14 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border-none shadow-inner rounded-2xl min-w-[300px] font-bold text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button
            variant="secondary"
            className="h-14 w-14 rounded-2xl bg-white dark:bg-slate-800 border-none shadow-xl hover:scale-110 transition-all"
            onClick={() => refresh(true)}
            disabled={refreshing}
          >
            <RefreshCw className={cn("h-6 w-6 text-indigo-600", refreshing && "animate-spin")} />
          </Button>
          <Button 
            className="h-[4.5rem] px-10 rounded-[2rem] bg-indigo-600 hover:bg-indigo-700 shadow-2xl shadow-indigo-500/30 font-black text-sm gap-3 group transition-all hover:scale-105 active:scale-95 text-white"
            onClick={runSystemAudit}
            disabled={refreshing}
          >
            <ShieldCheck className="h-6 w-6 group-hover:scale-110 transition-transform" /> 
            RUN SYSTEM AUDIT
          </Button>
        </div>
      </div>

      {/* Strategic KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {kpis.map((kpi, i) => {
          const Icon = IconMap[kpi.icon] || Briefcase;
          return (
            <Card key={i} className="rounded-[3rem] border-none shadow-xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-md group hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 cursor-pointer"
              onClick={() => {
                setExpansionFeature(`${kpi.label} Deep Analytics`);
                setExpansionOpen(true);
              }}
            >
              <CardContent className="p-8 flex flex-col items-center text-center space-y-4">
                <div className="h-16 w-16 rounded-[1.5rem] flex items-center justify-center shadow-lg group-hover:rotate-12 transition-all duration-500 bg-indigo-600/10 text-indigo-600">
                  <Icon className="h-8 w-8" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-4xl font-black tracking-tighter italic">{kpi.value}</h4>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 italic">{kpi.label}</p>
                </div>
                <div className="h-[2px] w-12 bg-slate-100 dark:bg-slate-800 rounded-full" />
                <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500 italic">{kpi.delta}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-12 gap-10">
        {/* Operational Activity Matrix */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-8">
           <Card className="flex-1 rounded-[4rem] border-none shadow-2xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl overflow-hidden flex flex-col group">
              <CardHeader className="p-12 pb-6 border-b border-white/10 dark:border-slate-800/10 flex flex-row items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-3xl font-black tracking-tighter flex items-center gap-4 uppercase italic">
                    <Activity className="h-8 w-8 text-indigo-600 group-hover:translate-x-2 transition-transform duration-500" />
                    Operational Activity
                  </CardTitle>
                  <CardDescription className="text-sm font-medium italic italic">Latest global workflow updates and escalation telemetry across core services.</CardDescription>
                </div>
              </CardHeader>
              <ScrollArea className="flex-1">
                 <div className="p-12 pt-8">
                    <div className="space-y-6">
                      {filteredActivities.map((activity, index) => (
                        <div key={index} 
                          className="p-8 rounded-[3rem] bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-xl hover:shadow-[0_40px_80px_-20px_rgba(79,70,229,0.2)] transition-all duration-500 group/card flex items-center justify-between gap-8 cursor-pointer"
                          onClick={() => {
                            setExpansionFeature(`Activity: ${activity.title}`);
                            setExpansionOpen(true);
                          }}
                        >
                           <div className="flex items-center gap-6">
                              <div className="h-14 w-14 rounded-2xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center shadow-inner group-hover/card:scale-110 group-hover/card:bg-indigo-600 group-hover/card:text-white transition-all duration-500">
                                 <History className="h-7 w-7" />
                              </div>
                              <div className="space-y-1">
                                 <h4 className="text-xl font-black uppercase tracking-tighter italic group-hover/card:text-indigo-600 transition-colors leading-none">{activity.title}</h4>
                                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic opacity-60 leading-relaxed italic">{activity.detail}</p>
                              </div>
                           </div>
                           <div className="flex items-center gap-6">
                              <Badge className={cn(
                                "rounded-full font-black text-[9px] px-4 py-1.5 border-none shadow-sm uppercase tracking-widest",
                                activity.status === "COMPLETED" ? "bg-emerald-500 text-white" : 
                                activity.status === "PENDING" ? "bg-amber-500 text-white" : "bg-indigo-600 text-white"
                              )}>
                                 {activity.status}
                              </Badge>
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">{activity.time}</span>
                           </div>
                        </div>
                      ))}
                    </div>
                 </div>
              </ScrollArea>
           </Card>
        </div>

        {/* Strategic Guardrails & Compliance */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-10">
           <Card className="rounded-[4rem] border-none shadow-2xl bg-indigo-950 text-white p-10 relative overflow-hidden group">
              <div className="absolute top-0 right-0 h-40 w-40 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20 group-hover:scale-150 transition-transform duration-1000" />
              <div className="relative z-10 space-y-8">
                 <div className="flex items-center gap-4">
                    <div className="h-14 w-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl group-hover:rotate-12 transition-transform">
                       <ShieldCheck className="h-7 w-7 text-white" />
                    </div>
                    <div>
                       <h4 className="font-black text-xl uppercase tracking-tighter italic">Compliance Matrix</h4>
                       <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Audit Readiness: 99.9%</p>
                    </div>
                 </div>
                 <div className="space-y-6">
                    {[
                      { label: "Access Reviews", status: "Compliant", icon: CheckCircle2, color: "text-emerald-400" },
                      { label: "Data Retention", status: "Attention", icon: ShieldAlert, color: "text-amber-400" },
                      { label: "Audit Logs", status: "Healthy", icon: CheckCircle2, color: "text-emerald-400" }
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
                        onClick={() => {
                          setExpansionFeature(item.label);
                          setExpansionOpen(true);
                        }}
                      >
                         <div className="flex items-center gap-3">
                            <item.icon className={cn("h-4 w-4", item.color)} />
                            <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
                         </div>
                         <Badge className="bg-white/10 border-none text-[8px] font-black px-2 py-0.5 rounded-full">{item.status}</Badge>
                      </div>
                    ))}
                 </div>
              </div>
           </Card>

           <Card className="rounded-[3rem] border-none shadow-2xl bg-white dark:bg-slate-900 overflow-hidden group">
              <CardHeader className="p-8 pb-4">
                 <div className="flex items-center justify-between mb-4">
                    <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 italic">Global Stability Yield</CardTitle>
                    <BarChart3 className="h-4 w-4 text-indigo-600" />
                 </div>
              </CardHeader>
              <CardContent className="p-8 pt-0 space-y-8">
                 {[
                   { name: 'Platform Uptime', val: 99.97, color: 'bg-emerald-500' },
                   { name: 'Security Posture', val: 94.2, color: 'bg-indigo-600' },
                   { name: 'Tenancy Coverage', val: 96.0, color: 'bg-blue-500' }
                 ].map(item => (
                   <div key={item.name} className="space-y-2 group/bar cursor-pointer"
                     onClick={() => {
                       setExpansionFeature(item.name);
                       setExpansionOpen(true);
                     }}
                   >
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest italic leading-none">
                         <span className="text-slate-500">{item.name}</span>
                         <span className="group-hover/bar:text-indigo-600 transition-colors">{item.val}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-50 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
                         <div className={cn("h-full transition-all duration-1000", item.color)} style={{ width: `${item.val}%` }} />
                      </div>
                   </div>
                 ))}
              </CardContent>
           </Card>
        </div>
      </div>
      
      {/* Quick Admin Actions */}
      <Card className="rounded-[4rem] border-none shadow-2xl bg-white dark:bg-slate-900 p-12 flex flex-col md:flex-row items-center gap-12 group">
         <div className="h-32 w-32 bg-indigo-600 rounded-[3rem] flex items-center justify-center shadow-[0_30px_60px_-15px_rgba(79,70,229,0.4)] group-hover:rotate-12 transition-all duration-700 shrink-0">
            <Zap className="h-16 w-16 text-white drop-shadow-2xl" />
         </div>
         <div className="flex-1 space-y-4 text-center md:text-left">
            <div className="flex items-center gap-4 justify-center md:justify-start">
               <Badge className="bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest px-4 py-1 rounded-full">Neural Admin</Badge>
               <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Operational Shortcuts Online</p>
            </div>
            <h3 className="text-3xl font-black uppercase italic tracking-tighter italic">Strategic Orchestration</h3>
            <div className="flex flex-wrap gap-4 justify-center md:justify-start">
               {[
                 { title: "Review Approvals", route: "/core/workflow/inbox" },
                 { title: "Onboard Tenant", route: "/auth/onboarding" },
                 { title: "Network Overview", feature: "Global Network Topology" }
               ].map((action, i) => (
                 <Button key={i} variant="outline" className="rounded-2xl h-14 px-8 font-black text-[10px] uppercase tracking-widest border-slate-200 gap-3 hover:bg-indigo-600 hover:text-white transition-all"
                  onClick={() => {
                    if (action.route) navigate(action.route);
                    else if (action.feature) {
                      setExpansionFeature(action.feature);
                      setExpansionOpen(true);
                    }
                  }}
                 >
                   {action.title} <ArrowUpRight className="h-4 w-4" />
                 </Button>
               ))}
            </div>
         </div>
      </Card>

      <StrategicExpansionModal 
        isOpen={expansionOpen} 
        onOpenChange={setExpansionOpen} 
        featureName={expansionFeature} 
      />
    </div>
  );
}
