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
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
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
  const [timeseries, setTimeseries] = useState<{
    revenueTrend: any[];
    alertsByModule: any[];
    moduleHealth: any[];
  } | null>(null);
  const [expansionOpen, setExpansionOpen] = useState(false);
  const [expansionFeature, setExpansionFeature] = useState("");

  const refresh = useCallback(async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);
      
      const res = await adminService.getDashboardMetrics(session.tenant_id, session);
      setKpis(res.kpis || []);
      setActivities(res.activities || []);
      if (res.timeseries) {
        setTimeseries(res.timeseries);
      }
      
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
                {(Array.isArray(kpis) ? kpis : []).map((kpi, i) => (
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
              <div className="grid gap-6 lg:grid-cols-3">
                {/* Revenue Trend Chart */}
                <WorkspacePanel title="Revenue Growth Velocity" description="6-month trailing performance." className="lg:col-span-2 relative overflow-hidden">
                  <div className="h-[300px] w-full mt-4">
                    {timeseries?.revenueTrend ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={timeseries.revenueTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} dy={10} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} tickFormatter={(val) => `$${val / 1000}k`} />
                          <RechartsTooltip 
                            contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' }}
                            formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
                            cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '3 3' }}
                          />
                          <Area type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs font-black uppercase text-slate-300">Loading Data...</div>
                    )}
                  </div>
                </WorkspacePanel>

                {/* Module Health Donut */}
                <WorkspacePanel title="System Health" description="Live module availability.">
                  <div className="h-[300px] w-full mt-4 flex items-center justify-center relative">
                    {timeseries?.moduleHealth ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={timeseries.moduleHealth}
                            cx="50%"
                            cy="50%"
                            innerRadius={70}
                            outerRadius={90}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                          >
                            {timeseries.moduleHealth.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <RechartsTooltip 
                            contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                            itemStyle={{ fontSize: '12px', fontWeight: 800 }}
                          />
                          <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs font-black uppercase text-slate-300">Loading Data...</div>
                    )}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
                       <Monitor className="h-6 w-6 text-emerald-500 mb-1" />
                       <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Online</span>
                    </div>
                  </div>
                </WorkspacePanel>
              </div>

              <div className="grid gap-6 lg:grid-cols-[1fr_1.6fr]">
                {/* Alerts Bar Chart */}
                <WorkspacePanel title="Operational Alerts" description="Active issues by module layer.">
                  <div className="h-[350px] w-full mt-4">
                    {timeseries?.alertsByModule ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={timeseries.alertsByModule} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                          <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} />
                          <YAxis dataKey="module" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} />
                          <RechartsTooltip 
                            cursor={{ fill: '#f8fafc' }}
                            contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            itemStyle={{ fontSize: '12px', fontWeight: 800 }}
                          />
                          <Bar 
                            dataKey="count" 
                            fill="#f59e0b" 
                            radius={[0, 4, 4, 0]} 
                            barSize={30}
                            onClick={(data) => {
                              toast.info(`Drilling down into ${data.module} alerts...`);
                              if (data.module === "Retail") navigate("/retail");
                              if (data.module === "Finance") navigate("/core/finance");
                              if (data.module === "HR") navigate("/core/hr");
                            }}
                            className="cursor-pointer hover:opacity-80 transition-opacity"
                          >
                            {timeseries.alertsByModule.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={
                                entry.module === "Retail" ? "#6366f1" : 
                                entry.module === "HR" ? "#ec4899" : 
                                entry.module === "Finance" ? "#14b8a6" : "#f59e0b"
                              } />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs font-black uppercase text-slate-300">Loading Data...</div>
                    )}
                  </div>
                </WorkspacePanel>

                {/* Global Business Pulse - Compacted */}
                <WorkspacePanel 
                  title="Global Business Pulse" 
                  description="Real-time event synchronization across the enterprise infrastructure."
                  action={
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                      <Input 
                        placeholder="SEARCH INTELLIGENCE..." 
                        className="h-11 w-48 lg:w-64 pl-12 rounded-xl border-slate-200/50 bg-slate-50/50 focus:bg-white font-black text-[10px] uppercase tracking-widest transition-all"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                      />
                    </div>
                  }
                >
                  <ScrollArea className="h-[350px] pr-4 pt-4">
                    <div className="space-y-4 pb-4">
                      {filteredActivities.map((activity, i) => (
                        <div key={i} className="group flex items-center justify-between p-5 rounded-[1.5rem] border border-slate-100/50 hover:border-indigo-100 hover:bg-slate-50/50 transition-all duration-300 cursor-pointer" onClick={() => toast.info(`Viewing details for: ${activity.title}`)}>
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-xl bg-white shadow-md flex items-center justify-center text-slate-400 group-hover:text-indigo-600 group-hover:bg-indigo-50 transition-all border border-slate-50 shrink-0">
                              {IconMap[activity.icon] ? React.createElement(IconMap[activity.icon], { className: "h-5 w-5" }) : <Activity className="h-5 w-5" />}
                            </div>
                            <div className="space-y-0.5">
                              <p className="text-[11px] font-black uppercase tracking-tight italic">{activity.title}</p>
                              <p className="text-[10px] font-medium text-slate-500 leading-relaxed max-w-sm truncate">{activity.detail}</p>
                            </div>
                          </div>
                          <div className="text-right space-y-1.5 flex flex-col items-end shrink-0 pl-4">
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-300">{activity.time}</p>
                            <Badge variant="outline" className="rounded-full px-2 py-0 text-[8px] font-black uppercase tracking-widest border-slate-200/50 bg-white">
                              {activity.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                      {filteredActivities.length === 0 && (
                        <div className="flex h-full items-center justify-center py-20 text-xs font-black uppercase text-slate-300">No events found.</div>
                      )}
                    </div>
                  </ScrollArea>
                </WorkspacePanel>
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
              {(Array.isArray(executiveBriefs) ? executiveBriefs : []).map((brief) => (
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

