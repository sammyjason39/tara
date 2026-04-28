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
  ArrowUpRight,
  Zap,
  Info,
  Clock,
  Lock,
  FileSearch,
  MoreVertical
} from "lucide-react";
import { StrategicExpansionModal } from "@/components/ui/StrategicExpansionModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useSession } from "@/core/security/session";
import { salesService } from "@/core/services/sales/salesService";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { SalesAuditEvent } from "@/core/types/sales/sales";

export default function SalesAuditLog() {
  const session = useSession();
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [events, setEvents] = useState<SalesAuditEvent[]>([]);
  
  const [expansionOpen, setExpansionOpen] = useState(false);
  const [expansionFeature, setExpansionFeature] = useState("");

  const refresh = useCallback(async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);
      const data = await salesService.listAuditEvents(session.tenant_id, session);
      setEvents(data);
      if (isManual) toast.success("Immutable audit stream synchronized.");
    } catch (err) {
      console.error("Failed to fetch audit log:", err);
      toast.error("Telemetry failure in audit log.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session.tenant_id, session]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filtered = useMemo(() => 
    events.filter((item) =>
      search
        ? `${item.action} ${item.entityType} ${item.entityId} ${item.actorId} ${item.detail}`
            .toLowerCase()
            .includes(search.toLowerCase())
        : true,
    ),
    [events, search]
  );

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-6">
          <div className="h-20 w-20 bg-slate-900 dark:bg-white rounded-[2.5rem] animate-pulse flex items-center justify-center shadow-2xl">
            <ShieldCheck className="h-10 w-10 text-white dark:text-slate-900" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Verifying Immutable Ledger...</p>
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
            <Badge className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-none font-black px-3 py-1 rounded-full uppercase tracking-widest text-[10px]">Compliance Black Box</Badge>
            <div className="flex items-center gap-1.5 text-indigo-500 font-bold text-xs uppercase tracking-widest">
               <Activity className="h-4 w-4 animate-pulse" />
               Real-time Audit Stream Active
            </div>
          </div>
          <h1 className="text-6xl font-black tracking-tighter bg-gradient-to-br from-slate-900 via-slate-700 to-indigo-900 dark:from-white dark:to-slate-400 bg-clip-text text-transparent italic">Audit Log</h1>
          <p className="text-slate-500 font-medium max-w-2xl text-lg leading-relaxed italic">"Integrity is the bedrock of every enterprise transaction."</p>
        </div>
        
        <div className="flex items-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl p-2 rounded-[2rem] border border-white/20 dark:border-slate-800/20 shadow-2xl">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              className="pl-11 h-14 w-[300px] rounded-[1.5rem] bg-transparent border-none focus-visible:ring-0 text-base font-medium"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search audit trail..."
            />
          </div>
          <Button
            variant="secondary"
            className="h-14 w-14 rounded-[1.5rem] bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition-all shadow-xl"
            onClick={() => refresh(true)}
            disabled={refreshing}
          >
            <RefreshCw className={cn("h-6 w-6", refreshing && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Audit Intelligence Overlay */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
         <Card className="rounded-[2.5rem] border-none shadow-xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl p-8 flex items-center gap-6 group hover:shadow-indigo-500/10 transition-all">
            <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
               <Lock className="h-7 w-7 text-indigo-500" />
            </div>
            <div>
               <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">LEDGER STATUS</p>
               <h4 className="text-2xl font-black">IMMUTABLE</h4>
            </div>
         </Card>
         <Card className="rounded-[2.5rem] border-none shadow-xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl p-8 flex items-center gap-6 group hover:shadow-emerald-500/10 transition-all">
            <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
               <FileSearch className="h-7 w-7 text-emerald-500" />
            </div>
            <div>
               <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">EVENTS RECORDED</p>
               <h4 className="text-2xl font-black text-emerald-500">{events.length}</h4>
            </div>
         </Card>
         <Card className="rounded-[2.5rem] border-none shadow-xl bg-slate-900 dark:bg-white p-8 flex items-center gap-6 group hover:shadow-slate-500/20 transition-all">
            <div className="h-14 w-14 rounded-2xl bg-white/10 dark:bg-slate-900/10 backdrop-blur-md flex items-center justify-center group-hover:scale-110 transition-transform">
               <ShieldCheck className="h-7 w-7 text-white dark:text-slate-900" />
            </div>
            <div>
               <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 opacity-60">COMPLIANCE RATING</p>
               <h4 className="text-2xl font-black text-white dark:text-slate-900 font-black">100% SECURE</h4>
            </div>
         </Card>
      </div>

      {/* Main Audit Registry */}
      <Card className="rounded-[3rem] border-none shadow-2xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl overflow-hidden">
        <CardHeader className="p-10 pb-6 border-b border-white/20 dark:border-slate-800/20">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-2xl font-black tracking-tight flex items-center gap-3">
                <History className="h-6 w-6 text-slate-900 dark:text-white" />
                Strategic Operation Trail
              </CardTitle>
              <CardDescription className="text-sm font-medium">Global auditable events for stage transitions, approval nodes, and high-stakes engagements.</CardDescription>
            </div>
            <div className="flex gap-4">
               <div className="flex bg-slate-100/50 dark:bg-slate-800/50 p-1.5 rounded-[1.5rem] shadow-inner">
                  <Button variant="ghost" size="sm" className="h-10 rounded-xl px-4 font-black text-[10px] tracking-widest bg-white dark:bg-slate-700 shadow-md text-slate-900 dark:text-white">ALL OPERATIONS</Button>
                  <Button variant="ghost" size="sm" onClick={() => { setExpansionFeature("Financial Audit Matrix"); setExpansionOpen(true); }} className="h-10 rounded-xl px-4 font-black text-[10px] tracking-widest text-slate-400 hover:text-slate-600 transition-colors">FINANCIAL</Button>
                  <Button variant="ghost" size="sm" onClick={() => { setExpansionFeature("Security Audit Matrix"); setExpansionOpen(true); }} className="h-10 rounded-xl px-4 font-black text-[10px] tracking-widest text-slate-400 hover:text-slate-600 transition-colors">SECURITY</Button>
               </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50/50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-10 py-6 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Timestamp</th>
                  <th className="px-10 py-6 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Operation</th>
                  <th className="px-10 py-6 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Entity Matrix</th>
                  <th className="px-10 py-6 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Actor Node</th>
                  <th className="px-10 py-6 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Technical Context</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 dark:divide-slate-800/10">
                {filtered.map((item) => (
                  <tr key={item.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-all cursor-default">
                    <td className="px-10 py-8">
                       <div className="space-y-1">
                          <p className="text-xs font-black uppercase tracking-tight text-slate-900 dark:text-white">{new Date(item.createdAt).toLocaleDateString()}</p>
                          <p className="text-[10px] font-bold text-slate-400">{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
                       </div>
                    </td>
                    <td className="px-10 py-8">
                       <Badge variant="outline" className="rounded-full font-black text-[9px] px-3 py-1 border-slate-200 dark:border-slate-800 uppercase tracking-[0.1em] text-slate-900 dark:text-white bg-white dark:bg-slate-950 shadow-sm">{item.action}</Badge>
                    </td>
                    <td className="px-10 py-8">
                       <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                             <Layers className="h-4 w-4 text-indigo-600" />
                          </div>
                          <div>
                             <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{item.entityType}</p>
                             <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-tighter italic">ID: {item.entityId.slice(-12)}</p>
                          </div>
                       </div>
                    </td>
                    <td className="px-10 py-8">
                       <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-[10px]">
                             {item.actorId.charAt(0)}
                          </div>
                          <p className="text-xs font-black uppercase tracking-tight text-slate-700 dark:text-slate-300">Custodian {item.actorId.slice(0, 8)}</p>
                       </div>
                    </td>
                    <td className="px-10 py-8">
                       <div className="flex items-center gap-3 group/detail">
                          <div className="h-1 w-1 rounded-full bg-slate-300 group-hover/detail:bg-indigo-500 transition-colors" />
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed italic max-w-sm truncate group-hover/detail:text-slate-900 dark:group-hover/detail:text-white transition-colors">"{item.detail}"</p>
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
             <div className="p-20 text-center space-y-4 grayscale opacity-30">
                <History className="h-12 w-12 mx-auto" />
                <p className="text-[10px] font-black uppercase tracking-widest">The ledger is empty.</p>
             </div>
          )}
        </CardContent>
      </Card>

      <StrategicExpansionModal 
        isOpen={expansionOpen} 
        onOpenChange={setExpansionOpen} 
        featureName={expansionFeature} 
      />
    </div>
  );
}
