import { useCallback, useEffect, useMemo, useState } from "react";
import { 
  TrendingUp, 
  RefreshCw, 
  MoreVertical, 
  Layout, 
  DollarSign, 
  Activity, 
  Zap, 
  CheckCircle2, 
  AlertCircle,
  ChevronRight,
  Filter,
  ArrowRight,
  Target,
  BarChart3,
  Search,
  LayoutDashboard,
  ActivitySquare,
  ShieldCheck,
  ChevronDown,
  Box,
  Layers,
  Rocket
} from "lucide-react";
import { StrategicExpansionModal } from "@/components/ui/StrategicExpansionModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSession } from "@/core/security/session";
import { salesService } from "@/core/services/sales/salesService";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { OpportunityStage, SalesOpportunity } from "@/core/types/sales/sales";

const STAGES: OpportunityStage[] = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "PROPOSAL",
  "NEGOTIATION",
  "CLOSED_WON",
  "CLOSED_LOST",
];

const STAGE_COLORS: Record<string, string> = {
  NEW: "bg-slate-400",
  CONTACTED: "bg-blue-500",
  QUALIFIED: "bg-indigo-500",
  PROPOSAL: "bg-purple-500",
  NEGOTIATION: "bg-orange-500",
  CLOSED_WON: "bg-emerald-500",
  CLOSED_LOST: "bg-rose-500",
};

export default function PipelineBoard() {
  const session = useSession();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [pipeline, setPipeline] = useState<Record<OpportunityStage, SalesOpportunity[]>>({
      NEW: [],
      CONTACTED: [],
      QUALIFIED: [],
      PROPOSAL: [],
      NEGOTIATION: [],
      CLOSED_WON: [],
      CLOSED_LOST: [],
  });
  const [expansionOpen, setExpansionOpen] = useState(false);
  const [expansionFeature, setExpansionFeature] = useState("");

  const refresh = useCallback(async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);
      const data = await salesService.getPipelineByStage(session.tenant_id, session);
      setPipeline(data);
      if (isManual) toast.success("Pipeline state synchronized.");
    } catch (err) {
      console.error("Failed to fetch pipeline data:", err);
      toast.error("Telemetry failure in pipeline board.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session.tenant_id, session]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const moveStage = async (opportunityId: string, stage: OpportunityStage) => {
    try {
      await salesService.moveOpportunityStage(session.tenant_id, session, opportunityId, stage);
      toast.success(`Deal topology updated to ${stage}`);
      refresh(true);
    } catch (err) {
      toast.error("Node transition failure.");
    }
  };

  const aggregateValue = useMemo(() => {
    let total = 0;
    Object.values(pipeline).forEach(stageOpportunities => {
      stageOpportunities.forEach(opp => {
        total += opp.amount;
      });
    });
    return total;
  }, [pipeline]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-6">
          <div className="h-20 w-20 bg-indigo-600 rounded-[2.5rem] animate-pulse flex items-center justify-center shadow-2xl shadow-indigo-500/20">
            <Layers className="h-10 w-10 text-white" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Syncing Pipeline Matrix...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-10 animate-in fade-in duration-1000 max-w-full overflow-hidden pb-32">
      {/* Premium Header */}
      <div className="flex flex-col lg:flex-row justify-between items-end gap-6">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Badge className="bg-indigo-600 text-white border-none font-black px-3 py-1 rounded-full uppercase tracking-widest text-[10px]">Strategic Flow</Badge>
            <div className="flex items-center gap-1.5 text-indigo-500 font-bold text-xs uppercase tracking-widest">
               <ActivitySquare className="h-4 w-4 animate-pulse" />
               Live Board Matrix
            </div>
          </div>
          <h1 className="text-6xl font-black tracking-tighter bg-gradient-to-br from-slate-900 via-slate-700 to-indigo-900 dark:from-white dark:to-slate-400 bg-clip-text text-transparent italic">Pipeline Matrix</h1>
          <p className="text-slate-500 font-medium max-w-2xl text-lg leading-relaxed italic">"Execution is everything. The board is your battlefield for high-value conversions."</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
            <Input 
              placeholder="Filter opportunities..." 
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
            onClick={() => {
              setExpansionFeature("Pipeline Intelligence Refinement");
              setExpansionOpen(true);
            }}
          >
            <Filter className="h-6 w-6 group-hover:rotate-180 transition-transform duration-500" /> 
            REFINE BOARD
          </Button>
        </div>
      </div>

      {/* Board Layout */}
      <div className="relative">
        <ScrollArea className="w-full pb-8">
          <div className="flex gap-6 min-h-[750px] pb-8">
            {STAGES.map((stage) => {
              const filteredOpps = pipeline[stage]?.filter(o => 
                o.accountName.toLowerCase().includes(search.toLowerCase())
              ) || [];
              
              return (
                <div key={stage} className="flex flex-col w-[350px] shrink-0 group">
                  <div className="flex items-center justify-between p-5 mb-6 rounded-[2rem] bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/20 dark:border-slate-800/20 shadow-xl group-hover:shadow-2xl transition-all duration-500">
                     <div className="flex items-center gap-4">
                        <div className={cn("h-4 w-4 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.1)]", STAGE_COLORS[stage])} />
                        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">{stage.replace('_', ' ')}</p>
                     </div>
                     <Badge className="bg-indigo-600/10 text-indigo-600 font-black border-none rounded-full px-3 py-1 text-[10px]">
                        {filteredOpps.length}
                     </Badge>
                  </div>

                  <div className="flex-1 space-y-6 p-4 rounded-[2.5rem] bg-slate-50/20 dark:bg-slate-900/20 border-2 border-dashed border-slate-200/50 dark:border-slate-800/50 transition-colors group-hover:border-indigo-500/20">
                    {filteredOpps.length === 0 ? (
                      <div className="h-48 flex flex-col items-center justify-center text-center p-8 space-y-4 opacity-30 grayscale group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700">
                         <div className="h-16 w-16 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center">
                            <Box className="h-6 w-6 text-slate-300" />
                         </div>
                         <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Empty Strategic Node</p>
                      </div>
                    ) : (
                      filteredOpps.map((item) => (
                        <Card 
                          key={item.id} 
                          className="group/card relative overflow-hidden rounded-[2rem] border-none shadow-xl bg-white dark:bg-slate-900 hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 cursor-default"
                        >
                           <div className={cn("absolute top-0 left-0 h-full w-2 shadow-[2px_0_10px_rgba(0,0,0,0.05)]", STAGE_COLORS[stage])} />
                           <CardContent className="p-7 space-y-6">
                              <div className="flex justify-between items-start">
                                 <div className="space-y-1">
                                    <h3 className="font-black text-lg tracking-tight leading-tight line-clamp-1 uppercase italic">{item.accountName}</h3>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic opacity-60">Deal Protocol: {item.id.substring(0, 8)}</p>
                                 </div>
                                 <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                       <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                                          <MoreVertical className="h-5 w-5 text-slate-400" />
                                       </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="rounded-2xl border-none shadow-2xl p-2 w-64" align="end">
                                       <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest opacity-50 px-3 py-2">Tactical Actions</DropdownMenuLabel>
                                       <DropdownMenuSeparator />
                                       <DropdownMenuItem className="gap-3 py-3 rounded-xl text-xs font-bold" onClick={() => window.open(`/sales/opportunities?id=${item.id}`, '_blank')}><ChevronRight className="h-4 w-4" /> View Strategic Context</DropdownMenuItem>
                                       <DropdownMenuItem className="gap-3 py-3 rounded-xl text-xs font-bold" 
                                          onClick={() => {
                                            setExpansionFeature("AI Next Best Action");
                                            setExpansionOpen(true);
                                          }}
                                       >
                                          <Zap className="h-4 w-4 text-indigo-600" /> AI Strategic Guidance
                                       </DropdownMenuItem>
                                       <DropdownMenuSeparator />
                                       <DropdownMenuItem className="gap-3 py-3 rounded-xl text-xs font-bold text-rose-500"><AlertCircle className="h-4 w-4" /> Escalate Deal</DropdownMenuItem>
                                    </DropdownMenuContent>
                                 </DropdownMenu>
                              </div>

                              <div className="flex items-center gap-4">
                                 <div className="h-14 w-14 rounded-2xl bg-indigo-600/5 flex items-center justify-center shadow-inner group-hover/card:scale-110 group-hover/card:bg-indigo-600 group-hover/card:text-white transition-all duration-500">
                                    <DollarSign className="h-7 w-7 text-indigo-600 group-hover/card:text-white" />
                                 </div>
                                 <div className="space-y-0.5">
                                    <div className="flex items-baseline gap-1.5">
                                       <span className="text-3xl font-black tracking-tighter text-indigo-600 italic">${item.amount.toLocaleString()}</span>
                                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.currency}</span>
                                    </div>
                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 italic">Projected Valuation</p>
                                 </div>
                              </div>

                              <div className="space-y-4 pt-2">
                                 <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400 italic">
                                    <span className="flex items-center gap-2"><Target className="h-3.5 w-3.5 text-indigo-500" /> CONVERSION PROBABILITY</span>
                                    <span className="text-indigo-600">{item.probability}%</span>
                                 </div>
                                 <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
                                    <div 
                                      className={cn("h-full transition-all duration-1000 shadow-[0_0_10px_rgba(0,0,0,0.1)]", STAGE_COLORS[stage])} 
                                      style={{ width: `${item.probability}%` }} 
                                    />
                                 </div>
                              </div>

                              <div className="flex items-center justify-between pt-4 border-t border-slate-50 dark:border-slate-800">
                                 <Badge variant="secondary" className="bg-slate-50 dark:bg-slate-800 text-slate-400 border-none rounded-full px-4 py-1.5 text-[9px] font-black uppercase tracking-widest italic shadow-sm">
                                    {item.health.replace('_', ' ')} PULSE
                                 </Badge>
                                 
                                 <div className="flex -space-x-3">
                                    {[1, 2].map(i => (
                                      <div key={i} className="h-9 w-9 rounded-full border-2 border-white dark:border-slate-900 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-black text-indigo-600 shadow-md uppercase">
                                         {item.owner_name?.charAt(0) || "U"}
                                      </div>
                                    ))}
                                 </div>
                              </div>

                              <div className="pt-2">
                                 <Select
                                   value={item.stage}
                                   onValueChange={(value: OpportunityStage) => moveStage(item.id, value)}
                                 >
                                   <SelectTrigger className="h-12 rounded-2xl border-none bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 transition-all text-[10px] font-black uppercase tracking-widest shadow-inner group-hover/card:bg-white dark:group-hover/card:bg-slate-700">
                                     <SelectValue placeholder="Transition Stage" />
                                   </SelectTrigger>
                                   <SelectContent className="rounded-2xl border-none shadow-2xl p-2 w-64">
                                     <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest opacity-50 px-3 py-2">Transition Matrix</DropdownMenuLabel>
                                     <DropdownMenuSeparator />
                                     {STAGES.map((candidate) => (
                                       <SelectItem key={candidate} value={candidate} className="rounded-xl text-xs font-bold py-3">
                                         {candidate.replace('_', ' ')}
                                       </SelectItem>
                                     ))}
                                   </SelectContent>
                                 </Select>
                              </div>
                           </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Footer Tactical Intelligence Overlay */}
      <div className="fixed bottom-12 right-12 flex gap-6 pointer-events-none">
         <Card className="rounded-[2.5rem] border-none shadow-2xl bg-indigo-600 text-white p-8 flex items-center gap-8 pointer-events-auto hover:scale-105 transition-transform duration-500 cursor-default">
            <div className="h-16 w-16 rounded-[1.5rem] bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-2xl">
               <TrendingUp className="h-8 w-8 text-white" />
            </div>
            <div>
               <p className="text-[11px] font-black uppercase tracking-[0.2em] opacity-60 italic">Aggregate Nominal Yield</p>
               <h4 className="text-4xl font-black tracking-tighter italic">${aggregateValue.toLocaleString()}</h4>
            </div>
         </Card>
         <Card className="rounded-[2.5rem] border-none shadow-2xl bg-white dark:bg-slate-900 p-8 flex items-center gap-8 pointer-events-auto hover:scale-105 transition-transform duration-500 cursor-default">
            <div className="h-16 w-16 rounded-[1.5rem] bg-emerald-500/10 flex items-center justify-center shadow-inner">
               <Rocket className="h-8 w-8 text-emerald-500" />
            </div>
            <div>
               <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 italic">Strategic Velocity</p>
               <h4 className="text-4xl font-black tracking-tighter text-emerald-500 italic">+12.4%</h4>
            </div>
         </Card>
      </div>

      <StrategicExpansionModal 
        isOpen={expansionOpen} 
        onOpenChange={setExpansionOpen} 
        featureName={expansionFeature} 
      />
    </div>
  );
}
