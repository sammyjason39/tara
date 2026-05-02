import { useNavigate } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import * as React from "react";
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
  ShieldAlert,
  ScrollText
} from "lucide-react";
import { StrategicExpansionModal } from "@/components/ui/StrategicExpansionModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/EmptyState";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSession } from "@/core/security/session";
import { adminService } from "@/core/services";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OperationsView } from "@/components/shared/OperationsView";
import { PageShell } from "@/core/ui/PageShell";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";

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
      console.error("Dashboard sync failure:", err);
      toast.error("Telemetry failure in executive suite.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session.tenant_id, session]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const executiveBriefs = [
    { id: 1, title: "Strategic Bid Pending", detail: "Procurement bid #PR-902 requires executive sign-off for $120k expansion.", time: "2m ago", level: "critical", icon: Target },
    { id: 2, title: "Market Growth Spike", detail: "Retail branch 'Jakarta Central' exceeded monthly revenue targets by 24%.", time: "15m ago", level: "positive", icon: TrendingUp },
    { id: 3, title: "Governance Audit", detail: "Annual platform compliance sweep completed with zero critical vulnerabilities.", time: "1h ago", level: "stable", icon: ShieldCheck },
    { id: 4, title: "Supply Chain Risk", detail: "Logistics delay detected for raw material shipment from Singapore node.", time: "3h ago", level: "warning", icon: AlertTriangle },
  ];

  const filteredActivities = useMemo(
    () =>
      (Array.isArray(activities) ? activities : []).filter((item) =>
        search
          ? `${item.title} ${item.detail} ${item.status}`
               .toLowerCase()
               .includes(search.toLowerCase())
          : true,
      ),
    [activities, search],
  );

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-6">
          <div className="h-20 w-20 bg-indigo-600 rounded-[2.5rem] animate-pulse flex items-center justify-center shadow-2xl shadow-indigo-500/20">
            <LayoutDashboard className="h-10 w-10 text-white" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Synchronizing Executive Intelligence...</p>
        </div>
      </div>
    );
  }

  return (
    <PageShell
      header={
        <PageHeader
          title="Executive Command Center"
          subtitle="Enterprise-wide intelligence, growth telemetry, and strategic governance."
          primaryAction={
            <Button onClick={() => setExpansionOpen(true)} className="rounded-[1.2rem] px-8 h-12 gap-3 font-black text-xs uppercase tracking-widest bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-500/30 transition-all hover:scale-105 active:scale-95">
              <Rocket className="h-4 w-4" /> STRATEGIC EXPANSION
            </Button>
          }
          secondaryActions={
            <Button 
              variant="outline" 
              className="rounded-[1.2rem] px-6 h-12 font-black text-xs uppercase tracking-widest border-slate-200 bg-white/50 backdrop-blur-sm hover:bg-white transition-all"
              onClick={() => refresh(true)}
              disabled={refreshing}
            >
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            </Button>
          }
        />
      }
    >
      <div className="grid gap-8 xl:grid-cols-[1fr_380px] animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="space-y-8">
          <Tabs defaultValue="overview" className="space-y-8">
            <TabsList className="bg-slate-100/50 dark:bg-slate-900/50 p-1.5 rounded-2xl h-14 w-full sm:w-auto border border-slate-200/30 dark:border-slate-800/30 backdrop-blur-md">
              <TabsTrigger value="overview" className="rounded-xl px-8 h-11 data-[state=active]:bg-white data-[state=active]:shadow-xl data-[state=active]:text-indigo-600 font-black text-[11px] uppercase tracking-widest transition-all">
                Strategic Overview
              </TabsTrigger>
              <TabsTrigger value="operations" className="rounded-xl px-8 h-11 data-[state=active]:bg-white data-[state=active]:shadow-xl data-[state=active]:text-indigo-600 font-black text-[11px] uppercase tracking-widest transition-all">
                Tactical Flow
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-10 m-0">
              {/* Core KPI Matrix */}
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {kpis.map((kpi, i) => (
                  <Card key={i} className="rounded-[2rem] border-none shadow-2xl shadow-slate-200/30 dark:shadow-none bg-white dark:bg-slate-900/80 backdrop-blur-xl overflow-hidden group border border-white/20">
                    <CardContent className="p-8">
                      <div className="flex justify-between items-start mb-6">
                        <div className={cn(
                          "h-14 w-14 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-all duration-500",
                          kpi.trend === 'up' ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10" : "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10"
                        )}>
                          {kpi.icon === 'dollar' ? <DollarSign className="h-7 w-7" /> : <Activity className="h-7 w-7" />}
                        </div>
                        <div className={cn(
                          "flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                          kpi.trend === 'up' ? "text-emerald-500 bg-emerald-50/50" : "text-indigo-500 bg-indigo-50/50"
                        )}>
                          <ArrowUpRight className={cn("h-3 w-3", kpi.trend !== 'up' && "rotate-90")} />
                          {kpi.change}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 italic mb-1">{kpi.title}</p>
                        <h4 className="text-3xl font-black italic tracking-tighter uppercase leading-none">{kpi.value}</h4>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Analysis & Activity */}
              <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
                <WorkspacePanel 
                  title="Global Business Pulse" 
                  description="Real-time event synchronization across the enterprise infrastructure."
                  action={
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                      <Input 
                        placeholder="SEARCH INTELLIGENCE..." 
                        className="h-11 w-64 pl-12 rounded-xl border-slate-200/50 bg-slate-50/50 focus:bg-white font-black text-[10px] uppercase tracking-widest transition-all"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                      />
                    </div>
                  }
                >
                  <div className="space-y-4 pt-6">
                    {filteredActivities.slice(0, 5).map((activity, i) => (
                      <div key={i} className="group flex items-center justify-between p-6 rounded-[1.8rem] border border-slate-100/50 hover:border-indigo-100 hover:bg-slate-50/50 transition-all duration-300">
                        <div className="flex items-center gap-5">
                          <div className="h-12 w-12 rounded-2xl bg-white shadow-xl flex items-center justify-center text-slate-400 group-hover:text-indigo-600 group-hover:bg-indigo-50 transition-all border border-slate-50">
                            {IconMap[activity.icon] ? React.createElement(IconMap[activity.icon], { className: "h-6 w-6" }) : <Activity className="h-6 w-6" />}
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-xs font-black uppercase tracking-tight italic">{activity.title}</p>
                            <p className="text-[11px] font-medium text-slate-500 leading-relaxed max-w-md">{activity.detail}</p>
                          </div>
                        </div>
                        <div className="text-right space-y-2">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">{activity.time}</p>
                          <Badge variant="outline" className="rounded-full px-3 py-0.5 text-[9px] font-black uppercase tracking-widest border-slate-200/50 bg-white">
                            {activity.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    <Button variant="ghost" className="w-full h-12 rounded-xl text-indigo-600 font-black text-xs uppercase tracking-[0.2em] hover:bg-indigo-50">
                      View Full Audit Trail <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </WorkspacePanel>

                <div className="space-y-8">
                  <WorkspacePanel title="Strategic Analysis" description="Deep-dive business intelligence.">
                    <div className="grid grid-cols-2 gap-4 pt-4">
                      {[
                        { label: 'Growth Velocity', value: '+14.2%', icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                        { label: 'Market Sentiment', value: 'Positive', icon: Globe, color: 'text-sky-500', bg: 'bg-sky-50' },
                        { label: 'Capital Burn', value: 'Minimal', icon: DollarSign, color: 'text-amber-500', bg: 'bg-amber-50' },
                        { label: 'Risk Index', value: 'Stable', icon: ShieldCheck, color: 'text-indigo-500', bg: 'bg-indigo-50' },
                      ].map((stat, i) => (
                        <div key={i} className="p-6 rounded-[2rem] border border-slate-100 bg-white shadow-xl shadow-slate-200/20 space-y-4 hover:scale-[1.02] transition-all">
                          <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", stat.bg)}>
                            <stat.icon className={cn("h-5 w-5", stat.color)} />
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-2xl font-black tracking-tighter italic">{stat.value}</p>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{stat.label}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </WorkspacePanel>

                  <div className="p-8 rounded-[2.5rem] bg-slate-950 text-white shadow-3xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 h-48 w-48 bg-indigo-600 rounded-full -mr-24 -mt-24 blur-[80px] opacity-20 group-hover:opacity-40 transition-opacity" />
                    <div className="relative z-10 space-y-6">
                      <div className="flex justify-between items-start">
                        <div className="h-12 w-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-xl border border-white/10">
                          <Zap className="h-6 w-6 text-indigo-400" />
                        </div>
                        <Badge className="bg-emerald-500 text-white border-none rounded-full px-3 py-1 text-[9px] font-black uppercase animate-pulse">Neural Active</Badge>
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-2xl font-black italic tracking-tighter uppercase leading-tight">AI Insights Engine</h4>
                        <p className="text-xs text-slate-400 font-medium leading-relaxed">Neural patterns suggest optimizing regional logistics to capture 4% more margin.</p>
                      </div>
                      <Button className="w-full h-12 rounded-xl bg-white text-slate-950 hover:bg-slate-200 font-black text-[10px] uppercase tracking-widest transition-all">
                        EXPLORE REASONING
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="operations" className="m-0">
              <OperationsView />
            </TabsContent>
          </Tabs>
        </div>

        {/* Executive Briefing Side Panel */}
        <div className="space-y-8">
          <div className="rounded-[2.5rem] bg-white dark:bg-slate-900 border border-slate-100 p-8 shadow-2xl shadow-slate-200/40">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-slate-950 flex items-center justify-center text-white">
                  <Bell className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black uppercase tracking-widest italic">Executive Briefing</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Active Action Items</p>
                </div>
              </div>
              <Badge className="bg-indigo-50 text-indigo-600 border-none rounded-full h-6 w-6 flex items-center justify-center p-0 text-[10px] font-black">{executiveBriefs.length}</Badge>
            </div>

            <div className="space-y-6">
              {executiveBriefs.map((brief) => (
                <div key={brief.id} className="relative pl-6 pb-6 border-l border-slate-100 last:pb-0">
                  <div className={cn(
                    "absolute left-[-5px] top-0 h-2.5 w-2.5 rounded-full ring-4 ring-white dark:ring-slate-900",
                    brief.level === 'critical' ? "bg-rose-500" : 
                    brief.level === 'warning' ? "bg-amber-500" : 
                    brief.level === 'positive' ? "bg-emerald-500" : "bg-indigo-500"
                  )} />
                  <div className="space-y-2 group cursor-pointer">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-indigo-500 transition-colors">{brief.time}</p>
                      <brief.icon className={cn(
                        "h-4 w-4",
                        brief.level === 'critical' ? "text-rose-500" : 
                        brief.level === 'warning' ? "text-amber-500" : "text-slate-300"
                      )} />
                    </div>
                    <h5 className="text-xs font-black uppercase italic tracking-tight">{brief.title}</h5>
                    <p className="text-[11px] text-slate-500 leading-relaxed">{brief.detail}</p>
                  </div>
                </div>
              ))}
            </div>

            <Button variant="outline" className="w-full mt-8 h-12 rounded-xl border-slate-100 text-slate-500 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50">
              Clear All Briefs
            </Button>
          </div>

          <div className="rounded-[2.5rem] bg-indigo-600 p-8 text-white shadow-2xl shadow-indigo-500/30 relative overflow-hidden">
             <div className="absolute bottom-0 right-0 h-32 w-32 bg-white/10 rounded-full -mb-16 -mr-16 blur-2xl" />
             <div className="relative z-10 space-y-6">
                <div className="h-10 w-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md">
                   <Briefcase className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                   <h4 className="text-lg font-black italic uppercase tracking-tighter">Strategic Support</h4>
                   <p className="text-xs text-indigo-100 font-medium">Your dedicated executive assistant is ready for tactical support.</p>
                </div>
                <Button className="w-full bg-white text-indigo-600 hover:bg-indigo-50 font-black text-[10px] uppercase tracking-widest rounded-xl h-11">
                   CONNECT NOW
                </Button>
             </div>
          </div>
        </div>
      </div>

      <StrategicExpansionModal 
        isOpen={expansionOpen} 
        onClose={() => setExpansionOpen(false)}
        feature={expansionFeature}
      />
    </PageShell>
  );
}

