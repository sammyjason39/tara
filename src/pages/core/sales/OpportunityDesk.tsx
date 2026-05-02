import { useCallback, useEffect, useMemo, useState } from "react";
import { 
  TrendingUp, 
  RefreshCw, 
  MoreVertical, 
  Target, 
  DollarSign, 
  ShieldCheck, 
  AlertCircle, 
  ExternalLink,
  ChevronRight,
  Filter,
  Activity,
  CheckCircle2,
  XCircle,
  FileText,
  Search,
  ArrowUpRight,
  User,
  History,
  Zap,
  Calendar,
  Layers,
  Loader2
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
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { useSession } from "@/core/security/session";
import { salesService } from "@/core/services/sales/salesService";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { OpportunityStage, SalesOpportunity, SalesQuote } from "@/core/types/sales/sales";

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
  NEW: "bg-slate-500",
  CONTACTED: "bg-blue-500",
  QUALIFIED: "bg-indigo-500",
  PROPOSAL: "bg-purple-500",
  NEGOTIATION: "bg-orange-500",
  CLOSED_WON: "bg-emerald-500",
  CLOSED_LOST: "bg-rose-500",
};

export default function OpportunityDesk() {
  const session = useSession();
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [opportunities, setOpportunities] = useState<SalesOpportunity[]>([]);
  const [quotes, setQuotes] = useState<SalesQuote[]>([]);
  
  const [selectedOpp, setSelectedOpp] = useState<SalesOpportunity | null>(null);

  // Strategic Expansion State
  const [expansionOpen, setExpansionOpen] = useState(false);
  const [expansionFeature, setExpansionFeature] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const refresh = useCallback(async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);
      const [o, q] = await Promise.all([
        salesService.listOpportunities(session.tenant_id, session),
        salesService.listQuotes(session.tenant_id, session),
      ]);
      setOpportunities(o);
      setQuotes(q);
      if (isManual) toast.success("Deal board synchronized.");
    } catch (err) {
      console.error("Failed to fetch opportunities data:", err);
      toast.error("Telemetry failure.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session.tenant_id, session]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    let result = opportunities;
    if (statusFilter === "WON") {
      result = result.filter(op => op.stage === "CLOSED_WON");
    } else if (statusFilter === "AT_RISK") {
      result = result.filter(op => op.health === "HIGH_RISK" || op.health === "AT_RISK");
    }
    
    return result.filter((op) =>
      search
        ? `${op.accountName} ${op.ownerName} ${op.stage} ${op.health}`
            .toLowerCase()
            .includes(search.toLowerCase())
        : true,
    );
  }, [opportunities, search, statusFilter]);

  const moveStage = async (opportunityId: string, stage: OpportunityStage) => {
    try {
      await salesService.moveOpportunityStage(session.tenant_id, session, opportunityId, stage);
      toast.success(`Deal stage updated to ${stage}`);
      refresh(true);
    } catch (err) {
      toast.error("Stage transition failure.");
    }
  };

  const handleCloseWon = async (id: string) => {
    try {
      await salesService.closeWonOpportunity(session.tenant_id, session, id);
      toast.success("Strategic Victory: Opportunity Closed Won!", {
        description: "Revenue node initialized and audit trail generated."
      });
      refresh(true);
    } catch (err) {
      toast.error("Finalization failure.");
    }
  };

  const handleCloseLost = async (id: string) => {
    try {
      await salesService.closeLostOpportunity(session.tenant_id, session, id, "Price sensitivity.");
      toast.error("Deal Terminated: Closed Lost", {
        description: "Context archived for post-mortem analysis."
      });
      refresh(true);
    } catch (err) {
      toast.error("Finalization failure.");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="h-12 w-12 text-indigo-600 animate-spin opacity-20" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 animate-pulse">Syncing Opportunity Flux...</p>
      </div>
    );
  }

  return (
    <>
      <div className="p-8 space-y-10 animate-in fade-in duration-1000 min-h-0">
      {/* Premium Header */}
      <div className="flex flex-col lg:flex-row justify-between items-end gap-6">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Badge className="bg-indigo-600/10 text-indigo-600 border-none font-black px-3 py-1 rounded-full uppercase tracking-widest text-[10px]">Deal Intelligence</Badge>
            <div className="flex items-center gap-1.5 text-indigo-500 font-bold text-xs uppercase tracking-widest">
               <Activity className="h-4 w-4 animate-pulse" />
               Opportunity Flux Active
            </div>
          </div>
          <h1 className="text-6xl font-black tracking-tighter bg-gradient-to-br from-slate-900 via-slate-700 to-indigo-900 dark:from-white dark:to-slate-400 bg-clip-text text-transparent italic">Strategic Deals</h1>

          <p className="text-slate-500 font-medium max-w-2xl text-lg leading-relaxed">High-fidelity deal lifecycle execution and probability orchestration.</p>
        </div>
        
        <div className="flex items-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl p-2 rounded-[2rem] border border-white/20 dark:border-slate-800/20 shadow-2xl">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              className="pl-11 h-14 w-[300px] rounded-[1.5rem] bg-transparent border-none focus-visible:ring-0 text-base font-medium"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search opportunities..."
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

      {/* Main Table Area */}
      <Card className="rounded-[3rem] border-none shadow-2xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl overflow-hidden">
        <CardHeader className="p-10 pb-6 border-b border-white/20 dark:border-slate-800/20">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-2xl font-black tracking-tight flex items-center gap-3">
                <Target className="h-6 w-6 text-indigo-600" />
                Active Opportunity Board
              </CardTitle>
              <CardDescription className="text-sm font-medium">Stage-aware deal board with integrated probability and risk matrix.</CardDescription>
            </div>
            <div className="flex gap-4">
                <div className="flex bg-slate-100/50 dark:bg-slate-800/50 p-1.5 rounded-[1.5rem] shadow-inner">
                  <Button 
                    variant="ghost" size="sm" 
                    onClick={() => setStatusFilter(null)}
                    className={cn("h-10 rounded-xl px-4 font-black text-[10px] tracking-widest transition-all", !statusFilter ? "bg-white dark:bg-slate-700 shadow-md text-indigo-600" : "text-slate-400")}
                  >
                    ACTIVE DEALS
                  </Button>
                  <Button 
                    variant="ghost" size="sm" 
                    onClick={() => setStatusFilter("WON")}
                    className={cn("h-10 rounded-xl px-4 font-black text-[10px] tracking-widest transition-all", statusFilter === "WON" ? "bg-white dark:bg-slate-700 shadow-md text-indigo-600" : "text-slate-400")}
                  >
                    WON
                  </Button>
                  <Button 
                    variant="ghost" size="sm" 
                    onClick={() => setStatusFilter("AT_RISK")}
                    className={cn("h-10 rounded-xl px-4 font-black text-[10px] tracking-widest transition-all", statusFilter === "AT_RISK" ? "bg-white dark:bg-slate-700 shadow-md text-indigo-600" : "text-slate-400")}
                  >
                    AT RISK
                  </Button>
               </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50/50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-10 py-6 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Opportunity Designation</th>
                  <th className="px-10 py-6 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Owner</th>
                  <th className="px-10 py-6 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Nominal Value</th>
                  <th className="px-10 py-6 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Lifecycle Node</th>
                  <th className="px-10 py-6 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Probability Matrix</th>
                  <th className="px-10 py-6 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Health Index</th>
                  <th className="px-10 py-6 text-right text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 dark:divide-slate-800/10">
                {filtered.map((op) => (
                  <tr 
                    key={op.id} 
                    className="group hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-all cursor-pointer"
                    onClick={() => setSelectedOpp(op)}
                  >
                    <td className="px-10 py-8">
                      <div className="flex items-center gap-5">
                        <div className="h-12 w-12 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center font-black text-sm shadow-xl transition-all group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white">
                          <Layers className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="font-black text-base">{op.accountName}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight italic">DEAL ID: {op.id.slice(-6)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-8">
                       <div className="flex items-center gap-2 pt-1">
                          <div className="h-6 w-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-400 border border-slate-200 dark:border-slate-800">
                             {op.ownerName.charAt(0)}
                          </div>
                          <span className="text-xs font-black uppercase tracking-tight">{op.ownerName}</span>
                       </div>
                    </td>
                    <td className="px-10 py-8 text-indigo-600 font-black text-base">
                       ${op.amount.toLocaleString()}
                    </td>
                    <td className="px-10 py-8">
                       <div onClick={(e) => e.stopPropagation()}>
                          <Select
                            value={op.stage}
                            onValueChange={(value: OpportunityStage) => moveStage(op.id, value)}
                          >
                            <SelectTrigger className="h-10 rounded-xl border-slate-100 bg-slate-50/50 hover:bg-slate-100 transition-all text-[9px] font-black uppercase tracking-[0.2em] w-[140px]">
                              <SelectValue placeholder="Stage" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-none shadow-2xl p-2">
                              {STAGES.map((stage) => (
                                <SelectItem key={stage} value={stage} className="rounded-lg text-xs font-bold py-2">
                                  {stage.replace('_', ' ')}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                       </div>
                    </td>
                    <td className="px-10 py-8">
                       <div className="space-y-2 w-32">
                          <div className="flex justify-between text-[9px] font-black uppercase text-slate-400">
                             <span>Likelihood</span>
                             <span className="text-indigo-600">{op.probability}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
                             <div 
                               className={cn("h-full transition-all duration-1000", STAGE_COLORS[op.stage])} 
                               style={{ width: `${op.probability}%` }} 
                             />
                          </div>
                       </div>
                    </td>
                    <td className="px-10 py-8">
                       <Badge 
                        variant={op.health === "HIGH_RISK" ? "destructive" : "outline"}
                        className={cn(
                          "rounded-full font-black text-[9px] px-3 py-1 border-none shadow-sm uppercase tracking-widest",
                          op.health === "HEALTHY" ? "bg-emerald-500/10 text-emerald-600" :
                          op.health === "STALLED" ? "bg-orange-500/10 text-orange-600" :
                          "bg-rose-500/10 text-rose-600"
                        )}
                       >
                        {op.health.replace('_', ' ')}
                       </Badge>
                    </td>
                    <td className="px-10 py-8 text-right">
                       <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-white transition-all shadow-sm">
                                <MoreVertical className="h-5 w-5 text-slate-400" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-64 rounded-2xl p-2 shadow-2xl border-none">
                               <DropdownMenuItem className="gap-3 py-3 rounded-xl font-bold" onClick={() => handleCloseWon(op.id)} disabled={op.stage === "CLOSED_WON" || op.stage === "CLOSED_LOST"}><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Close Won</DropdownMenuItem>
                               <DropdownMenuItem className="gap-3 py-3 rounded-xl font-bold" onClick={() => handleCloseLost(op.id)} disabled={op.stage === "CLOSED_WON" || op.stage === "CLOSED_LOST"}><XCircle className="h-4 w-4 text-rose-500" /> Close Lost</DropdownMenuItem>
                               <DropdownMenuSeparator />
                               <DropdownMenuItem 
                                 className="gap-3 py-3 rounded-xl font-black text-indigo-600"
                                 onClick={() => {
                                   setExpansionFeature("Automated Quote Engine");
                                   setExpansionOpen(true);
                                 }}
                               >
                                 <FileText className="h-4 w-4" /> GENERATE QUOTE
                               </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Opportunity Detail Modal */}
      <Dialog open={!!selectedOpp} onOpenChange={() => setSelectedOpp(null)}>
        <DialogContent className="max-w-4xl rounded-[3rem] p-0 overflow-hidden border-none shadow-2xl bg-white dark:bg-slate-950">
          <div className="grid md:grid-cols-[1.5fr_2.5fr]">
            <div className="bg-indigo-600 p-12 text-white relative overflow-hidden flex flex-col justify-between">
               <div className="absolute top-0 right-0 h-64 w-64 -mr-20 -mt-20 bg-white/10 rounded-full blur-3xl" />
               <div className="space-y-8 relative z-10">
                  <div className="h-20 w-20 rounded-[2rem] bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-xl">
                     <Target className="h-10 w-10" />
                  </div>
                  <div>
                     <h2 className="text-4xl font-black tracking-tighter leading-none mb-4 italic">{selectedOpp?.accountName}</h2>
                     <Badge className="bg-white/20 text-white border-none font-black px-3 py-1 rounded-full uppercase tracking-widest text-[9px]">DEAL CONTEXT</Badge>
                  </div>
                  <p className="text-white/60 font-medium text-sm leading-relaxed">Strategic deal orchestration with full lifecycle audit transparency.</p>
               </div>
               
               <div className="pt-12 space-y-6 relative z-10">
                  <div className="p-6 rounded-3xl bg-white/10 border border-white/10 space-y-4">
                     <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest opacity-60">
                        <span>Current Stage</span>
                        <span>{selectedOpp?.probability}%</span>
                     </div>
                     <p className="text-lg font-black">{selectedOpp?.stage.replace('_', ' ')}</p>
                     <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]" style={{ width: `${selectedOpp?.probability}%` }} />
                     </div>
                  </div>
               </div>
            </div>
            
            <div className="p-12 space-y-10">
               <div className="grid grid-cols-2 gap-x-12 gap-y-8">
                  <div className="space-y-1">
                     <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Projected Revenue</p>
                     <p className="text-2xl font-black text-indigo-600">${selectedOpp?.amount.toLocaleString()}</p>
                     <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">{selectedOpp?.currency} Nominal Value</p>
                  </div>
                  <div className="space-y-1">
                     <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Expected Closing</p>
                     <p className="text-xl font-black">{selectedOpp?.expected_close_date ? new Date(selectedOpp.expected_close_date).toLocaleDateString() : "TBD"}</p>
                     <p className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                        <Calendar className="h-3 w-3" /> Q2 Tactical Horizon
                     </p>
                  </div>
                  <div className="space-y-1">
                     <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Deal Custodian</p>
                     <div className="flex items-center gap-2 pt-1">
                        <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-black text-slate-400 border border-slate-200">
                           {selectedOpp?.ownerName.charAt(0)}
                        </div>
                        <span className="text-sm font-black uppercase tracking-tight">{selectedOpp?.ownerName}</span>
                     </div>
                  </div>
                  <div className="space-y-1">
                     <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Associated Quotes</p>
                     <div className="flex items-center gap-3 pt-1">
                        <p className="text-xl font-black">{quotes.filter(q => q.opportunityId === selectedOpp?.id).length}</p>
                        <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-none font-black text-[8px] uppercase tracking-widest">VALID RECORDS</Badge>
                     </div>
                  </div>
               </div>
               
               <div className="space-y-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                     <Zap className="h-3 w-3 text-indigo-600" /> NEXT STRATEGIC ACTION
                  </p>
                  <div className="p-6 rounded-[2rem] bg-slate-50 dark:bg-slate-900 border-none shadow-inner group">
                     <p className="text-sm font-bold text-slate-700 dark:text-slate-300 italic">"{selectedOpp?.nextAction || "Initiate discovery node and evaluate stakeholder alignment."}"</p>
                     <Button 
                       variant="link" 
                       onClick={() => {
                         setExpansionFeature("Activity Engagement Protocol");
                         setExpansionOpen(true);
                       }}
                       className="text-[9px] font-black uppercase tracking-widest text-indigo-600 h-auto p-0 mt-4 gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                     >
                        Log Activity Protocol <ArrowUpRight className="h-3 w-3" />
                     </Button>
                  </div>
               </div>
               
               <div className="flex gap-4 pt-6">
                  <Button 
                    onClick={() => {
                      setExpansionFeature(`${selectedOpp?.accountName} Proposal Studio`);
                      setExpansionOpen(true);
                    }}
                    className="flex-1 h-16 rounded-[1.5rem] bg-indigo-600 hover:bg-indigo-700 font-black text-xs uppercase tracking-widest shadow-2xl shadow-indigo-500/30 group"
                  >
                    <FileText className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" /> INITIALIZE QUOTE GEN
                  </Button>
                  <Button variant="outline" className="h-16 w-16 rounded-[1.5rem] border-slate-200 hover:bg-white" onClick={() => setSelectedOpp(null)}>
                     <ChevronRight className="h-5 w-5" />
                  </Button>
               </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
      <StrategicExpansionModal 
        isOpen={expansionOpen} 
        onOpenChange={setExpansionOpen} 
        featureName={expansionFeature} 
      />
    </>
  );
}
