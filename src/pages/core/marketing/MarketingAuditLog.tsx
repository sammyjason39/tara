import { useCallback, useEffect, useMemo, useState } from "react";
import { 
  ShieldCheck, 
  RefreshCw, 
  Search, 
  History, 
  Activity, 
  User, 
  Layers, 
  ChevronRight, 
  Lock, 
  FileSearch, 
  Info, 
  Zap, 
  Clock,
  ArrowUpRight,
  MoreVertical,
  Filter,
  ShieldAlert,
  ActivitySquare,
  Network,
  Cpu,
  Monitor,
  Box,
  Fingerprint,
  PieChart,
  BarChart4,
  Terminal,
  Database
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSession } from "@/core/security/session";
import { marketingService } from "@/core/services/marketing/marketingService";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { MarketingAuditEvent } from "@/core/types/marketing/marketing";

export default function MarketingAuditLog() {
  const session = useSession();
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [events, setEvents] = useState<MarketingAuditEvent[]>([]);

  const refresh = useCallback(async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);
      const e = await marketingService.listAuditEvents(session.tenant_id, session);
      setEvents(e);
      if (isManual) toast.success("Immutable audit trail synchronized.");
    } catch (err) {
      console.error("Failed to fetch marketing audit events:", err);
      toast.error("Telemetry failure in audit ledger.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session.tenant_id, session]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filtered = useMemo(
    () =>
      (Array.isArray(events) ? events : []).filter((item) =>
        search
          ? `${item.action} ${item.entityType} ${item.entityId} ${item.detail}`
              .toLowerCase()
              .includes(search.toLowerCase())
          : true,
      ),
    [events, search],
  );

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-6">
          <div className="h-20 w-20 bg-slate-900 dark:bg-white rounded-[2.5rem] animate-pulse flex items-center justify-center shadow-2xl shadow-indigo-500/20">
            <ShieldCheck className="h-10 w-10 text-white dark:text-slate-900" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Verifying Governance Ledger...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-10 animate-in fade-in duration-1000 max-w-[1600px] mx-auto pb-24 text-left">
      {/* Premium Header */}
      <div className="flex flex-col lg:flex-row justify-between items-end gap-6">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Badge className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-none font-black px-3 py-1 rounded-full uppercase tracking-widest text-[10px]">Governance Black Box</Badge>
            <div className="flex items-center gap-1.5 text-indigo-500 font-bold text-xs uppercase tracking-widest">
               <ActivitySquare className="h-4 w-4 animate-pulse" />
               Immutable Trail Active
            </div>
          </div>
          <h1 className="text-6xl font-black tracking-tighter bg-gradient-to-br from-slate-900 via-slate-700 to-indigo-900 dark:from-white dark:to-slate-400 bg-clip-text text-transparent italic leading-none">Marketing Audit</h1>
          <p className="text-slate-500 font-medium max-w-2xl text-lg leading-relaxed italic">"Trust is authorized through absolute transparency and immutable auditable integrity."</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
            <input 
              placeholder="Search operation trail..." 
              className="pl-12 h-14 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border-none shadow-inner rounded-2xl min-w-[300px] font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-600/20 transition-all"
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
        </div>
      </div>

      {/* Audit Intelligence Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
         <Card className="rounded-[3rem] border-none shadow-2xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl p-10 flex items-center gap-8 group hover:shadow-indigo-500/10 transition-all duration-500 overflow-hidden relative">
            <div className="absolute top-0 right-0 h-40 w-40 bg-indigo-500/5 rounded-full blur-3xl -mr-20 -mt-20 group-hover:scale-150 transition-transform duration-1000" />
            <div className="h-20 w-20 rounded-[1.5rem] bg-indigo-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-500 relative z-10 shadow-inner">
               <Lock className="h-10 w-10 text-indigo-600" />
            </div>
            <div className="relative z-10 space-y-1">
               <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 italic">Ledger Status</p>
               <h4 className="text-4xl font-black italic tracking-tighter">IMMUTABLE</h4>
               <p className="text-[9px] font-black uppercase tracking-widest text-indigo-500/60 italic leading-none">Security Protocol Active</p>
            </div>
         </Card>
         <Card className="rounded-[3rem] border-none shadow-2xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl p-10 flex items-center gap-8 group hover:shadow-emerald-500/10 transition-all duration-500 overflow-hidden relative">
            <div className="absolute top-0 right-0 h-40 w-40 bg-emerald-500/5 rounded-full blur-3xl -mr-20 -mt-20 group-hover:scale-150 transition-transform duration-1000" />
            <div className="h-20 w-20 rounded-[1.5rem] bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-500 relative z-10 shadow-inner">
               <FileSearch className="h-10 w-10 text-emerald-600" />
            </div>
            <div className="relative z-10 space-y-1">
               <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 italic">Events Logged</p>
               <h4 className="text-5xl font-black text-emerald-600 italic tracking-tighter">{events.length}</h4>
               <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500/60 italic leading-none">Complete Operations Trail</p>
            </div>
         </Card>
         <Card className="rounded-[3rem] border-none shadow-2xl bg-slate-900 text-white p-10 flex items-center gap-8 group hover:shadow-slate-500/20 transition-all duration-500 relative overflow-hidden">
            <div className="absolute top-0 right-0 h-40 w-40 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 group-hover:scale-150 transition-transform duration-1000" />
            <div className="h-20 w-20 rounded-[1.5rem] bg-white/20 backdrop-blur-md flex items-center justify-center group-hover:scale-110 transition-transform duration-500 border border-white/20 relative z-10 shadow-2xl">
               <ShieldCheck className="h-10 w-10 text-white" />
            </div>
            <div className="relative z-10 space-y-1">
               <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 italic">Compliance Level</p>
               <h4 className="text-4xl font-black uppercase italic tracking-tighter">Enterprise</h4>
               <p className="text-[9px] font-black uppercase tracking-widest opacity-40 italic leading-none">Verified Audit Standards</p>
            </div>
         </Card>
      </div>

      {/* Main Audit Registry */}
      <Card className="rounded-[4rem] border-none shadow-2xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl overflow-hidden flex flex-col group/registry">
        <CardHeader className="p-12 pb-6 border-b border-white/10 dark:border-slate-800/10 flex flex-row items-center justify-between shrink-0">
          <div className="space-y-2">
            <CardTitle className="text-3xl font-black tracking-tighter flex items-center gap-4 uppercase italic">
              <History className="h-8 w-8 text-indigo-600 group-hover/registry:rotate-12 transition-transform duration-500" />
              Strategic Operation Trail
            </CardTitle>
            <CardDescription className="text-base font-medium italic italic opacity-60">Immutable lifecycle events for campaign nodes, scoring logic, and lead handoff protocols.</CardDescription>
          </div>
          <div className="flex bg-slate-100/50 dark:bg-slate-800/50 p-2 rounded-[2rem] shadow-inner border-none h-auto">
             <Button variant="ghost" className="rounded-[1.5rem] px-8 py-3 font-black text-[10px] uppercase tracking-widest bg-white dark:bg-slate-700 shadow-xl text-indigo-600 h-12 border-none transition-all">GLOBAL TRAIL</Button>
             <Button variant="ghost" className="rounded-[1.5rem] px-8 py-3 font-black text-[10px] uppercase tracking-widest text-slate-400 h-12 border-none transition-all">CRITICAL EVENTS</Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 flex-1 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50/50 dark:bg-slate-800/50 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 italic sticky top-0 z-10">
                <tr>
                  <th className="px-12 py-8 text-left">Temporal Stamp</th>
                  <th className="px-12 py-8 text-left">Strategic Action</th>
                  <th className="px-12 py-8 text-left">Entity Matrix</th>
                  <th className="px-12 py-8 text-left">Actor Node</th>
                  <th className="px-12 py-8 text-left">Technical Context</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 dark:divide-slate-800/10">
                {filtered.map((item) => (
                  <tr key={item.id} className="group hover:bg-indigo-600/5 transition-all cursor-default">
                    <td className="px-12 py-10">
                       <div className="space-y-1">
                          <p className="font-black text-sm uppercase tracking-tight text-slate-900 dark:text-white leading-none italic">{new Date(item.createdAt).toLocaleDateString()}</p>
                          <p className="text-[10px] font-black text-slate-400 uppercase italic opacity-60 leading-none">{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
                       </div>
                    </td>
                    <td className="px-12 py-10">
                       <Badge className="rounded-full font-black text-[9px] px-4 py-1.5 border-none shadow-xl uppercase tracking-widest bg-white dark:bg-slate-800 text-indigo-600 italic">
                          {item.action}
                       </Badge>
                    </td>
                    <td className="px-12 py-10">
                       <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center shadow-inner group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500">
                             <Layers className="h-5 w-5" />
                          </div>
                          <div className="space-y-0.5">
                             <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic leading-none">{item.entityType}</p>
                             <p className="text-[10px] font-black text-indigo-600 uppercase tracking-tighter italic leading-none">ENTITY: {item.entityId.slice(-12)}</p>
                          </div>
                       </div>
                    </td>
                    <td className="px-12 py-10">
                       <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-[10px] text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500">
                             {item.actorId.charAt(0).toUpperCase()}
                          </div>
                          <p className="text-[11px] font-black uppercase tracking-widest text-slate-500 italic">CUSTODIAN: {item.actorId.slice(0, 8)}</p>
                       </div>
                    </td>
                    <td className="px-12 py-10">
                       <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 group-hover:border-indigo-600/20 transition-all max-w-sm">
                          <Terminal className="h-4 w-4 text-slate-400 shrink-0" />
                          <p className="text-[11px] font-medium text-slate-600 dark:text-slate-400 leading-relaxed italic truncate">
                             "{item.detail}"
                          </p>
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
             <div className="p-32 text-center grayscale opacity-20 space-y-8 flex flex-col items-center">
                <div className="h-24 w-24 bg-white dark:bg-slate-800 rounded-[3rem] flex items-center justify-center shadow-2xl border border-slate-100 dark:border-slate-700">
                   <History className="h-12 w-12 text-slate-400" />
                </div>
                <div className="space-y-2">
                   <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Governance Ledger Clear</p>
                   <p className="text-sm font-medium italic italic opacity-40">"No strategic operation events currently logged in the immutable trail."</p>
                </div>
             </div>
          )}
        </CardContent>
      </Card>
      
      {/* Immutable Evidence Footer */}
      <Card className="rounded-[4rem] border-none shadow-2xl bg-slate-900 text-white p-12 flex flex-col lg:flex-row items-center gap-12 group overflow-hidden relative">
         <div className="absolute inset-0 bg-indigo-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
         <div className="h-32 w-32 bg-indigo-600 rounded-[3rem] flex items-center justify-center shadow-[0_30px_60px_-15px_rgba(79,70,229,0.4)] group-hover:rotate-12 transition-all duration-700 shrink-0 relative z-10">
            <Database className="h-16 w-16 text-white drop-shadow-2xl" />
         </div>
         <div className="flex-1 space-y-4 text-center lg:text-left relative z-10">
            <div className="flex items-center gap-4 justify-center lg:justify-start">
               <Badge className="bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest px-4 py-1 rounded-full">Immutable Engine</Badge>
               <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Audit Logic Active</p>
            </div>
            <h3 className="text-3xl font-black uppercase italic tracking-tighter italic leading-none">Total Strategic Auditable Evidence</h3>
            <p className="text-lg font-medium italic italic opacity-60 italic leading-relaxed italic max-w-4xl italic">
               "Operational trail authorizes a <strong>100% immutable history</strong> of all marketing orchestration. Neural logic ensures all actor nodes are verified against <strong>enterprise-grade governance standards</strong>."
            </p>
         </div>
         <Button className="h-20 px-12 rounded-[2.5rem] bg-white text-slate-900 hover:bg-slate-100 shadow-2xl font-black text-sm uppercase tracking-widest gap-4 group transition-all hover:scale-105 active:scale-95 whitespace-nowrap relative z-10">
            EXPORT EVIDENCE <ChevronRight className="h-6 w-6 group-hover:translate-x-2 transition-transform duration-500" />
         </Button>
      </Card>
    </div>
  );
}
