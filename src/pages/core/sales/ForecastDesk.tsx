import { useCallback, useEffect, useMemo, useState } from "react";
import { 
  TrendingUp, 
  RefreshCw, 
  Search, 
  BarChart3, 
  Activity, 
  Zap, 
  DollarSign, 
  Target, 
  Clock, 
  ArrowUpRight, 
  ChevronRight,
  PieChart,
  Calendar,
  Layers,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useSession } from "@/core/security/session";
import { salesService } from "@/core/services/sales/salesService";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { SalesExecutiveForecast, SalesOpportunity } from "@/core/types/sales/sales";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  Legend
} from "recharts";

export default function ForecastDesk() {
  const session = useSession();
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [forecast, setForecast] = useState<SalesExecutiveForecast | null>(null);
  const [projections, setProjections] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [opportunities, setOpportunities] = useState<SalesOpportunity[]>([]);

  const refresh = useCallback(async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);
      const [f, o, proj, an] = await Promise.all([
        salesService.getExecutiveForecast(session.tenant_id, session),
        salesService.listOpportunities(session.tenant_id, session),
        salesService.getForecast(session.tenant_id, session),
        salesService.getAnalytics(session.tenant_id, session)
      ]);
      setForecast(f);
      setOpportunities(o);
      setProjections(proj);
      setAnalytics(an);
      if (isManual) toast.success("Intelligence projections updated.");
    } catch (err) {
      console.error("Failed to fetch forecast data:", err);
      toast.error("Telemetry failure in forecast desk.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session.tenant_id, session]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const openOpportunities = useMemo(() => 
    (Array.isArray(opportunities) ? opportunities : []).filter(
      (item) => item.stage !== "CLOSED_WON" && item.stage !== "CLOSED_LOST",
    ),
    [opportunities]
  );

  const filtered = useMemo(
    () =>
      (Array.isArray(openOpportunities) ? openOpportunities : []).filter((item) =>
        search
          ? `${item.accountName} ${item.ownerName} ${item.stage}`
              .toLowerCase()
              .includes(search.toLowerCase())
          : true,
      ),
    [openOpportunities, search],
  );

  if (loading || !forecast) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-6">
          <div className="h-20 w-20 bg-indigo-600 rounded-[2.5rem] animate-pulse flex items-center justify-center shadow-2xl shadow-indigo-500/20">
            <TrendingUp className="h-10 w-10 text-white" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Projecting Neural Outcomes...</p>
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
            <Badge className="bg-indigo-600 text-white border-none font-black px-3 py-1 rounded-full uppercase tracking-widest text-[10px]">Strategic Foresight</Badge>
            <div className="flex items-center gap-1.5 text-indigo-500 font-bold text-xs uppercase tracking-widest">
               <Activity className="h-4 w-4 animate-pulse" />
               Live Analytical Engine
            </div>
          </div>
          <h1 className="text-6xl font-black tracking-tighter bg-gradient-to-br from-slate-900 via-slate-700 to-indigo-900 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">Executive Forecast</h1>
          <p className="text-slate-500 font-medium max-w-2xl text-lg leading-relaxed italic">"Predicting the future is easy. Creating it requires accurate telemetry."</p>
        </div>
        
        <div className="flex items-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl p-2 rounded-[2rem] border border-white/20 dark:border-slate-800/20 shadow-2xl">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              className="pl-11 h-14 w-[300px] rounded-[1.5rem] bg-transparent border-none focus-visible:ring-0 text-base font-medium"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search opportunity data..."
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
      </div>

      {/* Analytical Charts */}
      <div className="grid gap-8 lg:grid-cols-2">
        <Card className="rounded-[3rem] border-none shadow-2xl bg-white dark:bg-slate-900 overflow-hidden group">
          <CardHeader className="p-10 pb-2">
            <CardTitle className="text-2xl font-black tracking-tight flex items-center gap-3">
              <TrendingUp className="h-6 w-6 text-indigo-600" />
              Revenue Projection Model
            </CardTitle>
            <CardDescription className="text-sm font-medium">Weighted vs. Commit forecast delta (6 Month Tactical Horizon)</CardDescription>
          </CardHeader>
          <CardContent className="p-10 pt-0">
            <div className="h-[350px] w-full pt-8 group-hover:scale-[1.02] transition-transform duration-700">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={projections}>
                  <defs>
                    <linearGradient id="colorWeighted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorCommit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tickFormatter={(value) => `$${(value/1000)}k`} 
                    tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }}
                  />
                  <Tooltip 
                    cursor={{ stroke: '#4f46e5', strokeWidth: 2, strokeDasharray: '4 4' }}
                    contentStyle={{ 
                      borderRadius: '24px', 
                      border: 'none', 
                      boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
                      padding: '16px',
                      fontWeight: 900
                    }}
                  />
                  <Area type="monotone" dataKey="weighted" stroke="#4f46e5" strokeWidth={4} fillOpacity={1} fill="url(#colorWeighted)" name="Weighted Model" />
                  <Area type="monotone" dataKey="commit" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorCommit)" name="Commit" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[3rem] border-none shadow-2xl bg-white dark:bg-slate-900 overflow-hidden group">
          <CardHeader className="p-10 pb-2">
            <CardTitle className="text-2xl font-black tracking-tight flex items-center gap-3">
              <BarChart3 className="h-6 w-6 text-emerald-600" />
              Monthly Victory Distribution
            </CardTitle>
            <CardDescription className="text-sm font-medium">Historical trends for current fiscal cycle performance.</CardDescription>
          </CardHeader>
          <CardContent className="p-10 pt-0">
            <div className="h-[350px] w-full pt-8 group-hover:scale-[1.02] transition-transform duration-700">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics?.revenueByMonth || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tickFormatter={(value) => `$${(value/1000)}k`} 
                    tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }}
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(79, 70, 229, 0.05)', radius: 12 }}
                    contentStyle={{ 
                      borderRadius: '24px', 
                      border: 'none', 
                      boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
                      padding: '16px',
                      fontWeight: 900
                    }}
                  />
                  <Bar dataKey="revenue" fill="#10b981" radius={[12, 12, 0, 0]} name="Won Revenue" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* KPI Command Bar */}
      <div className="grid gap-6 md:grid-cols-4 lg:grid-cols-7">
        {[
          { label: "Pipeline", value: `$${forecast.openPipelineValue.toLocaleString()}`, color: "indigo", icon: Layers },
          { label: "Weighted", value: `$${forecast.weightedForecastValue.toLocaleString()}`, color: "indigo", icon: Zap },
          { label: "Won Vol", value: `$${forecast.wonThisPeriod.toLocaleString()}`, color: "emerald", icon: CheckCircle2 },
          { label: "Lost Vol", value: `$${forecast.lostThisPeriod.toLocaleString()}`, color: "rose", icon: XCircle },
          { label: "Conv Rate", value: `${forecast.conversionRate}%`, color: "blue", icon: Target },
          { label: "Cycle", value: `${forecast.avgDealCycleDays}d`, color: "amber", icon: Clock },
          { label: "Rep Load", value: analytics?.topReps?.length || 0, color: "slate", icon: Users },
        ].map((kpi, i) => (
          <Card key={i} className="rounded-3xl border-none shadow-lg bg-white dark:bg-slate-900 p-6 flex flex-col items-center justify-center text-center space-y-2 hover:shadow-xl transition-all hover:-translate-y-1">
             <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center mb-1", `bg-${kpi.color}-500/10`)}>
                <kpi.icon className={cn("h-5 w-5", `text-${kpi.color}-500`)} />
             </div>
             <h4 className="text-xl font-black tracking-tighter">{kpi.value}</h4>
             <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400">{kpi.label}</p>
          </Card>
        ))}
      </div>

      {/* Detailed Forecast Table */}
      <Card className="rounded-[3rem] border-none shadow-2xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl overflow-hidden">
        <CardHeader className="p-10 pb-6 border-b border-white/20 dark:border-slate-800/20">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-2xl font-black tracking-tight flex items-center gap-3">
                <PieChart className="h-6 w-6 text-indigo-600" />
                Weighted Revenue Matrix
              </CardTitle>
              <CardDescription className="text-sm font-medium">Granular visibility into deal-level probability impact on gross forecast.</CardDescription>
            </div>
            <Button variant="outline" className="rounded-2xl h-12 font-black text-xs gap-2 border-slate-200">
               <ArrowUpRight className="h-4 w-4" /> EXPORT TELMETRY
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50/50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-10 py-6 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Account Designation</th>
                  <th className="px-10 py-6 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Owner</th>
                  <th className="px-10 py-6 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Current Node</th>
                  <th className="px-10 py-6 text-right text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Nominal Amount</th>
                  <th className="px-10 py-6 text-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Probability Matrix</th>
                  <th className="px-10 py-6 text-right text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Weighted Impact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 dark:divide-slate-800/10">
                {filtered.map((item) => (
                  <tr key={item.id} className="group hover:bg-white/60 dark:hover:bg-slate-800/60 transition-all cursor-default">
                    <td className="px-10 py-8">
                       <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-xs group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                             {item.accountName.charAt(0)}
                          </div>
                          <div>
                             <p className="font-black text-sm">{item.accountName}</p>
                             <p className="text-[10px] font-bold text-slate-400 uppercase italic">ID: {item.id.slice(-6)}</p>
                          </div>
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
                    <td className="px-10 py-8 text-right font-bold text-slate-600 dark:text-slate-400">
                       ${item.amount.toLocaleString()}
                    </td>
                    <td className="px-10 py-8">
                       <div className="flex items-center justify-center gap-3">
                          <div className="w-20 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden shadow-inner">
                             <div 
                               className={cn("h-full transition-all duration-1000 shadow-sm", STAGE_COLORS[item.stage] || "bg-indigo-500")} 
                               style={{ width: `${item.probability}%` }} 
                             />
                          </div>
                          <span className="text-[10px] font-black text-indigo-600">{item.probability}%</span>
                       </div>
                    </td>
                    <td className="px-10 py-8 text-right">
                       <p className="text-sm font-black text-indigo-600">${Math.round(item.amount * (item.probability / 100)).toLocaleString()}</p>
                       <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Adjusted Value</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
             <div className="p-20 text-center space-y-4">
                <div className="h-20 w-20 rounded-[2rem] bg-slate-50 dark:bg-slate-900 flex items-center justify-center mx-auto grayscale opacity-30">
                   <Target className="h-10 w-10" />
                </div>
                <p className="text-sm font-bold text-slate-400 italic">No active opportunities detected in the tactical horizon.</p>
             </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const STAGE_COLORS: Record<string, string> = {
  NEW: "bg-slate-500",
  CONTACTED: "bg-blue-500",
  QUALIFIED: "bg-indigo-500",
  PROPOSAL: "bg-purple-500",
  NEGOTIATION: "bg-orange-500",
  CLOSED_WON: "bg-emerald-500",
  CLOSED_LOST: "bg-rose-500",
};

const Users = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M17 11a4 4 0 0 0 0-8"/></svg>;
