import { useCallback, useEffect, useMemo, useState } from "react";
import { 
  Target, 
  ShieldCheck, 
  Search, 
  Plus, 
  RefreshCw, 
  Filter, 
  ChevronRight, 
  Activity,
  DollarSign,
  User,
  Building2,
  Mail,
  Phone,
  Clock,
  ArrowUpRight,
  TrendingUp,
  AlertCircle,
  MoreVertical,
  CheckCircle2,
  Zap,
  Info,
  Loader2
} from "lucide-react";
import { StrategicExpansionModal } from "@/components/ui/StrategicExpansionModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Label } from "@/components/ui/label";
import { useSession } from "@/core/security/session";
import { salesService } from "@/core/services/sales/salesService";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { SalesLead } from "@/core/types/sales/sales";

export default function LeadDesk() {
  const session = useSession();
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [leads, setLeads] = useState<SalesLead[]>([]);
  
  // Create Lead State
  const [createOpen, setCreateOpen] = useState(false);
  const [newLead, setNewLead] = useState({
    companyName: "",
    contactName: "",
    contactEmail: "",
    potentialValue: "0",
    priority: "MEDIUM" as SalesLead["priority"]
  });

  // Filter State
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  // Selection/Detail State
  const [selectedLead, setSelectedLead] = useState<SalesLead | null>(null);
  const [expansionOpen, setExpansionOpen] = useState(false);
  const [expansionFeature, setExpansionFeature] = useState("");

  const refresh = useCallback(async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);
      const data = await salesService.listLeads(session.tenant_id, session);
      setLeads(data);
      if (isManual) toast.success("Lead registry synchronized.");
    } catch (err) {
      console.error("Failed to fetch leads:", err);
      toast.error("Telemetry failure in lead pool.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session.tenant_id, session]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    let result = leads;
    if (statusFilter === "QUALIFIED") {
      result = result.filter(l => l.status === "QUALIFIED");
    } else if (statusFilter === "SLA_DELINQUENT") {
      // Logic for SLA delinquent leads (e.g. status NEW and older than 24h)
      // For now, mapping to a feature expansion trigger since it's a complex logic
      return result.filter(l => l.status === "NEW"); 
    }
    
    return result.filter((lead) =>
      search
        ? `${lead.companyName} ${lead.contactName} ${lead.ownerName} ${lead.status}`
            .toLowerCase()
            .includes(search.toLowerCase())
        : true,
    );
  }, [leads, search, statusFilter]);

  const handleCreateLead = async () => {
    if (!newLead.companyName || !newLead.contactName) {
      toast.error("Company and Contact designation required.");
      return;
    }
    try {
      await salesService.createLead(session.tenant_id, session, {
        companyName: newLead.companyName,
        contactName: newLead.contactName,
        contactEmail: newLead.contactEmail,
        source: "DIRECT",
        potentialValue: Number(newLead.potentialValue),
        priority: newLead.priority,
      });
      toast.success("Lead injected into registry.");
      setCreateOpen(false);
      setNewLead({ companyName: "", contactName: "", contactEmail: "", potentialValue: "0", priority: "MEDIUM" });
      refresh(true);
    } catch (err) {
      toast.error("Injection failure.");
    }
  };

  const handleUpdateStatus = async (leadId: string, status: any) => {
    try {
      await salesService.updateLeadStatus(session.tenant_id, session, leadId, status);
      toast.success(`Protocol updated to ${status}`);
      refresh(true);
    } catch (err) {
      toast.error("Protocol update failure.");
    }
  };

  const handleConvert = async (leadId: string) => {
    try {
      await salesService.convertLeadToOpportunity(session.tenant_id, session, leadId);
      toast.success("Lead converted to Strategic Opportunity.");
      refresh(true);
    } catch (err) {
      toast.error("Conversion failure.");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="h-12 w-12 text-indigo-600 animate-spin opacity-20" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 animate-pulse">Syncing Lead Pool...</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-10 animate-in fade-in duration-1000 min-h-0">
      {/* Premium Header */}
      <div className="flex flex-col lg:flex-row justify-between items-end gap-6">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Badge className="bg-emerald-600/10 text-emerald-600 border-none font-black px-3 py-1 rounded-full uppercase tracking-widest text-[10px]">Registry Intake</Badge>
            <div className="flex items-center gap-1.5 text-indigo-500 font-bold text-xs uppercase tracking-widest">
               <Activity className="h-4 w-4 animate-pulse" />
               Lead Flow Active
            </div>
          </div>
          <h1 className="text-6xl font-black tracking-tighter bg-gradient-to-br from-slate-900 via-slate-700 to-indigo-900 dark:from-white dark:to-slate-400 bg-clip-text text-transparent italic">Lead Reception</h1>

          <p className="text-slate-500 font-medium max-w-2xl text-lg leading-relaxed">Systematic demand qualification and SLA-backed ownership orchestration.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl p-2 rounded-[2rem] border border-white/20 dark:border-slate-800/20 shadow-2xl">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                className="pl-11 h-14 w-[300px] rounded-[1.5rem] bg-transparent border-none focus-visible:ring-0 text-base font-medium"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search registry..."
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

          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="h-[4.5rem] px-10 rounded-[2rem] bg-indigo-600 hover:bg-indigo-700 shadow-2xl shadow-indigo-500/30 font-black text-sm gap-3 group transition-all hover:scale-105 active:scale-95">
                <Plus className="h-6 w-6 group-hover:rotate-90 transition-transform duration-500" /> 
                INJECT NEW LEAD
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden bg-white dark:bg-slate-950">
              <div className="h-2 bg-gradient-to-r from-emerald-500 via-indigo-500 to-purple-500" />
              <div className="p-10 space-y-8">
                <DialogHeader>
                  <DialogTitle className="text-3xl font-black tracking-tight">Lead Injection Protocol</DialogTitle>
                  <DialogDescription>Register a new qualified prospect into the sales ecosystem.</DialogDescription>
                </DialogHeader>
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Company</Label>
                      <Input 
                        placeholder="Global Dynamics Inc." 
                        className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none shadow-inner"
                        value={newLead.companyName}
                        onChange={(e) => setNewLead({...newLead, companyName: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Contact</Label>
                      <Input 
                        placeholder="Sarah Connor" 
                        className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none shadow-inner"
                        value={newLead.contactName}
                        onChange={(e) => setNewLead({...newLead, contactName: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email Address</Label>
                    <Input 
                      placeholder="sarah@global.example" 
                      className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none shadow-inner"
                      value={newLead.contactEmail}
                      onChange={(e) => setNewLead({...newLead, contactEmail: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Potential Value</Label>
                      <Input 
                        type="number"
                        placeholder="50000" 
                        className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none shadow-inner"
                        value={newLead.potentialValue}
                        onChange={(e) => setNewLead({...newLead, potentialValue: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Priority</Label>
                      <div className="flex gap-2 h-14 items-center bg-slate-50 dark:bg-slate-900 rounded-2xl px-4 border-none shadow-inner">
                         {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => (
                           <button
                             key={p}
                             onClick={() => setNewLead({...newLead, priority: p as any})}
                             className={cn(
                               "flex-1 py-1.5 rounded-xl text-[8px] font-black tracking-widest transition-all",
                               newLead.priority === p ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-600"
                             )}
                           >
                             {p}
                           </button>
                         ))}
                      </div>
                    </div>
                  </div>
                </div>
                <DialogFooter className="pt-4">
                  <Button onClick={handleCreateLead} className="w-full h-16 rounded-[1.5rem] bg-indigo-600 hover:bg-indigo-700 font-black text-sm">INITIATE INTAKE</Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Main Registry Area */}
      <Card className="rounded-[3rem] border-none shadow-2xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl overflow-hidden">
        <CardHeader className="p-10 pb-6 border-b border-white/20 dark:border-slate-800/20">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-2xl font-black tracking-tight flex items-center gap-3">
                <Target className="h-6 w-6 text-indigo-600" />
                Active Registry Pool
              </CardTitle>
              <CardDescription className="text-sm font-medium">Real-time lifecycle management and qualification matrix.</CardDescription>
            </div>
            <div className="flex gap-4">
                <div className="flex bg-slate-100/50 dark:bg-slate-800/50 p-1.5 rounded-[1.5rem] shadow-inner">
                  <Button 
                    variant="ghost" size="sm" 
                    onClick={() => setStatusFilter(null)}
                    className={cn("h-10 rounded-xl px-4 font-black text-[10px] tracking-widest transition-all", !statusFilter ? "bg-white dark:bg-slate-700 shadow-md text-indigo-600" : "text-slate-400")}
                  >
                    ALL RECORDS
                  </Button>
                  <Button 
                    variant="ghost" size="sm" 
                    onClick={() => setStatusFilter("QUALIFIED")}
                    className={cn("h-10 rounded-xl px-4 font-black text-[10px] tracking-widest transition-all", statusFilter === "QUALIFIED" ? "bg-white dark:bg-slate-700 shadow-md text-indigo-600" : "text-slate-400")}
                  >
                    QUALIFIED
                  </Button>
                  <Button 
                    variant="ghost" size="sm" 
                    onClick={() => { setExpansionFeature("SLA Monitoring Protocol"); setExpansionOpen(true); }}
                    className="h-10 rounded-xl px-4 font-black text-[10px] tracking-widest text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    SLA DELINQUENT
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
                  <th className="px-10 py-6 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Designation</th>
                  <th className="px-10 py-6 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Intake Detail</th>
                  <th className="px-10 py-6 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Custodian</th>
                  <th className="px-10 py-6 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Potential Yield</th>
                  <th className="px-10 py-6 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Lifecycle State</th>
                  <th className="px-10 py-6 text-right text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Action Matrix</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 dark:divide-slate-800/10">
                {filtered.map((lead) => (
                  <tr 
                    key={lead.id} 
                    className="group hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-all cursor-pointer"
                    onClick={() => setSelectedLead(lead)}
                  >
                    <td className="px-10 py-8">
                      <div className="flex items-center gap-5">
                        <div className="h-12 w-12 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center font-black text-sm shadow-xl transition-all group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white">
                          {lead.companyName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-black text-base">{lead.companyName}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight italic">Protocol ID: {lead.id.slice(-6)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-8">
                       <div className="space-y-1">
                          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{lead.contactName}</p>
                          <p className="text-[10px] font-medium text-slate-400">{lead.contactEmail || "No digital link"}</p>
                       </div>
                    </td>
                    <td className="px-10 py-8">
                       <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-xs font-black uppercase tracking-tight">{lead.ownerName}</span>
                       </div>
                    </td>
                    <td className="px-10 py-8">
                       <div className="space-y-1">
                          <p className="text-sm font-black text-indigo-600">${lead.potentialValue.toLocaleString()}</p>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{lead.currency}</p>
                       </div>
                    </td>
                    <td className="px-10 py-8">
                       <div className="flex flex-col gap-2">
                          <Badge 
                            variant={lead.status === "NEW" ? "destructive" : "outline"}
                            className="w-fit rounded-full font-black text-[9px] px-3 py-1 border-none shadow-sm uppercase tracking-widest bg-slate-100 dark:bg-slate-800 text-slate-500"
                          >
                            {lead.status}
                          </Badge>
                          <div className="flex items-center gap-1">
                             <div className="h-1 w-12 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div className={cn(
                                  "h-full bg-indigo-500 transition-all",
                                  lead.status === "NEW" ? "w-1/4" : 
                                  lead.status === "CONTACTED" ? "w-1/2" :
                                  lead.status === "QUALIFIED" ? "w-3/4" : "w-full"
                                )} />
                             </div>
                          </div>
                       </div>
                    </td>
                    <td className="px-10 py-8 text-right">
                       <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-white transition-all shadow-sm">
                                <MoreVertical className="h-5 w-5 text-slate-400" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 shadow-2xl border-none">
                               <DropdownMenuItem className="gap-3 py-3 rounded-xl font-bold" onClick={() => handleUpdateStatus(lead.id, 'CONTACTED')} disabled={lead.status !== "NEW"}><MessageSquare className="h-4 w-4" /> Log Contact</DropdownMenuItem>
                               <DropdownMenuItem className="gap-3 py-3 rounded-xl font-bold" onClick={() => handleUpdateStatus(lead.id, 'QUALIFIED')} disabled={lead.status !== "CONTACTED"}><ShieldCheck className="h-4 w-4" /> Qualify Node</DropdownMenuItem>
                               <DropdownMenuSeparator />
                               <DropdownMenuItem className="gap-3 py-3 rounded-xl font-black text-indigo-600" onClick={() => handleConvert(lead.id)} disabled={lead.status !== "QUALIFIED"}><Zap className="h-4 w-4" /> CONVERT TO OPP</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-10 border-t border-white/20 dark:border-slate-800/20 flex justify-between items-center">
             <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">Showing {filtered.length} Active Records</p>
             <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="rounded-xl font-black text-[10px] h-10 px-6 uppercase tracking-widest border-slate-200"
                  onClick={() => {
                    setExpansionFeature("Registry Data Export");
                    setExpansionOpen(true);
                  }}
                >
                  Export Registry
                </Button>
                <Button 
                  variant="outline" 
                  className="rounded-xl font-black text-[10px] h-10 px-6 uppercase tracking-widest border-slate-200"
                  onClick={() => {
                    setExpansionFeature("Bulk Lead Management");
                    setExpansionOpen(true);
                  }}
                >
                  Bulk Operations
                </Button>
             </div>
          </div>
        </CardContent>
      </Card>

      {/* Lead Detail Modal */}
      <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <DialogContent className="max-w-4xl rounded-[3rem] p-0 overflow-hidden border-none shadow-2xl bg-white dark:bg-slate-950">
          <div className="grid md:grid-cols-[1.5fr_2.5fr]">
            <div className="bg-indigo-600 p-12 text-white relative overflow-hidden flex flex-col justify-between">
               <div className="absolute top-0 right-0 h-64 w-64 -mr-20 -mt-20 bg-white/10 rounded-full blur-3xl" />
               <div className="space-y-8 relative z-10">
                  <div className="h-20 w-20 rounded-[2rem] bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-xl">
                     <Target className="h-10 w-10" />
                  </div>
                  <div>
                     <h2 className="text-4xl font-black tracking-tighter leading-none mb-4 italic">{selectedLead?.companyName}</h2>
                     <Badge className="bg-white/20 text-white border-none font-black px-3 py-1 rounded-full uppercase tracking-widest text-[9px]">PROTOCOL SNAPSHOT</Badge>
                  </div>
                  <p className="text-white/60 font-medium text-sm leading-relaxed italic">"Intelligent demand qualification ensures the strategic alignment of sales resources."</p>
               </div>
               
               <div className="pt-12 space-y-6 relative z-10">
                  <div className="p-5 rounded-3xl bg-white/10 border border-white/10 space-y-1">
                     <p className="text-[10px] font-black uppercase tracking-widest opacity-60">SLA Matrix</p>
                     <p className="text-sm font-black flex items-center gap-2 text-emerald-300">
                        <CheckCircle2 className="h-4 w-4" /> Compliant Execution
                     </p>
                  </div>
               </div>
            </div>
            
            <div className="p-12 space-y-10">
               <div className="grid grid-cols-2 gap-x-12 gap-y-8">
                  <div className="space-y-1">
                     <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Core Contact</p>
                     <p className="text-lg font-black">{selectedLead?.contactName}</p>
                     <p className="text-xs font-bold text-indigo-600">{selectedLead?.contactEmail}</p>
                  </div>
                  <div className="space-y-1">
                     <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Financial Designation</p>
                     <p className="text-lg font-black text-emerald-600">${selectedLead?.potentialValue.toLocaleString()}</p>
                     <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">{selectedLead?.currency} Potential</p>
                  </div>
                  <div className="space-y-1">
                     <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Operational Owner</p>
                     <div className="flex items-center gap-2 pt-1">
                        <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400 border border-slate-200">
                           {selectedLead?.ownerName.charAt(0)}
                        </div>
                        <span className="text-sm font-bold">{selectedLead?.ownerName}</span>
                     </div>
                  </div>
                  <div className="space-y-1">
                     <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status Vector</p>
                     <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-600 border-none font-black px-3 py-1 rounded-full uppercase tracking-widest text-[9px] mt-1">{selectedLead?.status}</Badge>
                  </div>
               </div>
               
               <div className="space-y-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                     <Clock className="h-3 w-3" /> LIFECYCLE CHRONOLOGY
                  </p>
                  <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-4">
                     <div className="flex items-center gap-4">
                        <div className="h-2 w-2 rounded-full bg-indigo-500" />
                        <div className="flex-1 border-b border-slate-200 dark:border-slate-800 pb-2">
                           <p className="text-xs font-black">Node Initialized</p>
                           <p className="text-[10px] font-bold text-slate-400 italic">Created on {selectedLead?.createdAt?.slice(0, 10)}</p>
                        </div>
                     </div>
                     <div className="flex items-center gap-4">
                        <div className="h-2 w-2 rounded-full bg-slate-300" />
                        <div className="flex-1 pb-2">
                           <p className="text-xs font-black text-slate-400">Pending Transition...</p>
                        </div>
                     </div>
                  </div>
               </div>
               
               <div className="flex gap-4 pt-6">
                  <Button 
                    onClick={() => {
                      setExpansionFeature(`${selectedLead?.companyName} Command Workspace`);
                      setExpansionOpen(true);
                    }}
                    className="flex-1 h-14 rounded-2xl bg-indigo-600 font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-500/20"
                  >
                    Action Workspace
                  </Button>
                  <Button variant="outline" className="h-14 w-14 rounded-2xl border-slate-200" onClick={() => setSelectedLead(null)}>
                     <ChevronRight className="h-5 w-5" />
                  </Button>
               </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <StrategicExpansionModal 
        isOpen={expansionOpen} 
        onOpenChange={setExpansionOpen} 
        featureName={expansionFeature} 
      />
    </div>
  );
}
