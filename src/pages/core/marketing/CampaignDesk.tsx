import { useCallback, useEffect, useMemo, useState } from "react";
import { 
  Megaphone, 
  ShieldCheck, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Calendar, 
  ChevronRight, 
  Plus, 
  Search,
  Filter,
  MoreVertical,
  LayoutGrid,
  List as ListIcon,
  Layers,
  Target,
  Zap,
  Globe,
  ArrowRight,
  Activity,
  RefreshCw,
  PieChart,
  Target as TargetIcon,
  ArrowUpRight,
  Split,
  Box,
  CheckCircle2,
  Clock,
  ShieldAlert
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSession } from "@/core/security/session";
import { marketingService } from "@/core/services/marketing/marketingService";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { MarketingCampaign } from "@/core/types/marketing/marketing";

const OBJECTIVES: MarketingCampaign["objective"][] = [
  "LEAD_GENERATION",
  "AWARENESS",
  "NURTURE",
  "REMARKETING",
];

const CHANNEL_PRESETS: Record<MarketingCampaign["objective"], MarketingCampaign["channelMix"]> = {
  LEAD_GENERATION: ["META_ADS", "GOOGLE_ADS", "LANDING_PAGE"],
  AWARENESS: ["META_ADS", "GOOGLE_ADS", "EVENT"],
  NURTURE: ["EMAIL", "WHATSAPP", "WEBINAR"],
  REMARKETING: ["META_ADS", "GOOGLE_ADS", "EMAIL"],
};

export default function CampaignDesk() {
  const session = useSession();
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<MarketingCampaign | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [objective, setObjective] = useState<MarketingCampaign["objective"]>("LEAD_GENERATION");
  const [budget, setBudget] = useState("50000");
  const [startDate, setStartDate] = useState("2026-06-01");
  const [endDate, setEndDate] = useState("2026-06-30");
  const [audience, setAudience] = useState("");

  const refresh = useCallback(async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);
      const c = await marketingService.listCampaigns(session.tenant_id, session);
      setCampaigns(c);
      if (isManual) toast.success("Campaign telemetry synchronized.");
    } catch (err) {
      console.error("Failed to fetch campaigns:", err);
      toast.error("Telemetry failure in campaign suite.");
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
      (Array.isArray(campaigns) ? campaigns : []).filter((item) =>
        search
          ? `${item.name} ${item.objective} ${item.status}`
              .toLowerCase()
              .includes(search.toLowerCase())
          : true,
      ),
    [campaigns, search],
  );

  const handleCreateCampaign = async () => {
    if (!name) {
      toast.error("Campaign designation required.");
      return;
    }
    try {
      setRefreshing(true);
      await marketingService.createCampaign(session.tenant_id, session, {
        name,
        objective,
        channelMix: CHANNEL_PRESETS[objective],
        budget: Number(budget),
        startDate,
        endDate,
        audience,
      });
      setIsWizardOpen(false);
      setWizardStep(1);
      setName("");
      toast.success("Strategic Campaign Injected", {
        description: `"${name}" has been added to the execution cluster.`
      });
      refresh(true);
    } catch (err) {
      toast.error("Campaign injection protocol failure.");
      setRefreshing(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: MarketingCampaign["status"]) => {
    try {
      await marketingService.updateCampaignStatus(session.tenant_id, session, id, status);
      toast.success(`Protocol ${status} successful.`);
      refresh(true);
      setSelectedCampaign(null);
    } catch (err) {
      toast.error("Status update failure.");
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-6">
          <div className="h-20 w-20 bg-indigo-600 rounded-[2.5rem] animate-pulse flex items-center justify-center shadow-2xl shadow-indigo-500/20">
            <Megaphone className="h-10 w-10 text-white" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Orchestrating Strategic Nodes...</p>
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
            <Badge className="bg-indigo-600 text-white border-none font-black px-3 py-1 rounded-full uppercase tracking-widest text-[10px]">Growth Orchestration</Badge>
            <div className="flex items-center gap-1.5 text-indigo-500 font-bold text-xs uppercase tracking-widest">
               <Activity className="h-4 w-4 animate-pulse" />
               Campaign Cluster Active
            </div>
          </div>
          <h1 className="text-6xl font-black tracking-tighter bg-gradient-to-br from-slate-900 via-slate-700 to-indigo-900 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">Campaign Desk</h1>
          <p className="text-slate-500 font-medium max-w-2xl text-lg leading-relaxed italic">"Strategic dominance is won through the coordination of elite channel execution."</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl p-2 rounded-[2rem] border border-white/20 dark:border-slate-800/20 shadow-2xl">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                className="pl-11 h-14 w-[300px] rounded-[1.5rem] bg-transparent border-none focus-visible:ring-0 text-base font-medium"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search cluster..."
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
            className="h-[4.5rem] px-10 rounded-[2rem] bg-indigo-600 hover:bg-indigo-700 shadow-2xl shadow-indigo-500/30 font-black text-sm gap-3 group transition-all hover:scale-105 active:scale-95"
            onClick={() => setIsWizardOpen(true)}
          >
            <Plus className="h-6 w-6 group-hover:rotate-90 transition-transform duration-500" /> 
            NEW STRATEGIC CAMPAIGN
          </Button>
        </div>
      </div>

      {/* Strategic Metrics Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
         <Card className="rounded-[2.5rem] border-none shadow-xl bg-white dark:bg-slate-900 p-8 space-y-4 group hover:shadow-indigo-500/10 transition-all">
            <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
               <Activity className="h-7 w-7 text-indigo-600" />
            </div>
            <div>
               <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">ACTIVE PROTOCOLS</p>
               <h4 className="text-3xl font-black">{(Array.isArray(campaigns) ? campaigns : []).filter(c => c.status === 'ACTIVE').length}</h4>
               <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 italic">Cluster Execution Live</p>
            </div>
         </Card>
         <Card className="rounded-[2.5rem] border-none shadow-xl bg-white dark:bg-slate-900 p-8 space-y-4 group hover:shadow-emerald-500/10 transition-all">
            <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
               <TrendingUp className="h-7 w-7 text-emerald-600" />
            </div>
            <div>
               <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">AVERAGE YIELD</p>
               <h4 className="text-3xl font-black text-emerald-600">4.2x ROI</h4>
               <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 italic">Blended ROI Efficiency</p>
            </div>
         </Card>
         <Card className="rounded-[2.5rem] border-none shadow-xl bg-white dark:bg-slate-900 p-8 space-y-4 group hover:shadow-amber-500/10 transition-all">
            <div className="h-14 w-14 rounded-2xl bg-amber-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
               <DollarSign className="h-7 w-7 text-amber-600" />
            </div>
            <div>
               <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">BUDGET BURN</p>
               <h4 className="text-3xl font-black text-amber-600">68%</h4>
               <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 italic">Utilization Metric</p>
            </div>
         </Card>
         <Card className="rounded-[2.5rem] border-none shadow-xl bg-indigo-600 text-white p-8 space-y-4 group hover:shadow-indigo-500/30 transition-all">
            <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center group-hover:scale-110 transition-transform border border-white/20">
               <Zap className="h-7 w-7 text-white" />
            </div>
            <div>
               <p className="text-[10px] font-black uppercase tracking-widest opacity-60">LEAD VELOCITY</p>
               <h4 className="text-3xl font-black">+12.4%</h4>
               <p className="text-[10px] font-bold text-white/60 uppercase mt-1 italic">Growth Delta (Weekly)</p>
            </div>
         </Card>
      </div>

      {/* Main Campaign Registry */}
      <Card className="rounded-[3rem] border-none shadow-2xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl overflow-hidden">
        <Tabs defaultValue="all" className="w-full">
          <CardHeader className="p-10 pb-0">
             <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
                <TabsList className="bg-slate-100/50 dark:bg-slate-800/50 p-1.5 rounded-2xl shadow-inner border-none">
                  <TabsTrigger value="all" className="rounded-xl px-6 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-lg h-10 border-none transition-all">Global Cluster</TabsTrigger>
                  <TabsTrigger value="active" className="rounded-xl px-6 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-lg h-10 border-none transition-all">Execution Live</TabsTrigger>
                  <TabsTrigger value="draft" className="rounded-xl px-6 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-lg h-10 border-none transition-all">Strategic Drafts</TabsTrigger>
                </TabsList>

                <div className="flex items-center gap-3 bg-slate-100/50 dark:bg-slate-800/50 p-1.5 rounded-2xl shadow-inner">
                   <Button 
                      variant="ghost" 
                      size="icon" 
                      className={cn("h-10 w-10 rounded-xl transition-all", view === "grid" ? "bg-white dark:bg-slate-700 shadow-md text-indigo-600" : "text-slate-400")}
                      onClick={() => setView("grid")}
                   >
                      <LayoutGrid className="h-5 w-5" />
                   </Button>
                   <Button 
                      variant="ghost" 
                      size="icon" 
                      className={cn("h-10 w-10 rounded-xl transition-all", view === "list" ? "bg-white dark:bg-slate-700 shadow-md text-indigo-600" : "text-slate-400")}
                      onClick={() => setView("list")}
                   >
                      <ListIcon className="h-5 w-5" />
                   </Button>
                </div>
             </div>
          </CardHeader>

          <TabsContent value="all" className="mt-0 outline-none">
            {view === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 p-10 pt-0">
                {filtered.map((campaign) => (
                  <Card key={campaign.id} className="group rounded-[2.5rem] border-none bg-white dark:bg-slate-900 shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 overflow-hidden cursor-default relative">
                    <div className={cn("absolute top-0 right-0 h-24 w-24 rounded-full blur-3xl -mr-12 -mt-12 transition-all duration-700 opacity-20", campaign.status === 'ACTIVE' ? "bg-emerald-500" : "bg-slate-500")} />
                    <CardHeader className="p-8 pb-4">
                      <div className="flex justify-between items-start mb-4">
                        <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest border-slate-200 dark:border-slate-800 text-slate-400">
                          {campaign.objective.replace('_', ' ')}
                        </Badge>
                        <Badge className={cn(
                          "rounded-full font-black text-[8px] px-3 py-0.5 border-none shadow-sm uppercase tracking-widest",
                          campaign.status === 'ACTIVE' ? "bg-emerald-500 text-white shadow-emerald-500/20" : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                        )}>
                          {campaign.status}
                        </Badge>
                      </div>
                      <CardTitle className="text-xl font-black uppercase tracking-tight group-hover:text-indigo-600 transition-colors">{campaign.name}</CardTitle>
                      <CardDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter line-clamp-1 italic italic">"{campaign.audience}"</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 pt-4 space-y-6">
                      <div className="flex justify-between items-end">
                         <div className="space-y-1">
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Yield Allocation</p>
                            <p className="text-xl font-black text-indigo-600">${campaign.budget.toLocaleString()} <span className="text-[10px] uppercase">{campaign.currency}</span></p>
                         </div>
                         <div className="text-right">
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Burn Rate</p>
                            <p className="text-base font-black">72%</p>
                         </div>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
                         <div className="h-full bg-indigo-600 rounded-full shadow-lg" style={{ width: '72%' }} />
                      </div>
                      <div className="flex flex-wrap gap-2 pt-2">
                        {campaign.channelMix.map(ch => (
                          <Badge key={ch} variant="secondary" className="rounded-full text-[8px] font-black px-2 py-0 h-4 border-none bg-slate-100 dark:bg-slate-800 text-slate-500">{ch}</Badge>
                        ))}
                      </div>
                      <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-slate-800">
                         <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8 rounded-xl ring-2 ring-white dark:ring-slate-900">
                              <AvatarFallback className="text-[10px] font-black bg-indigo-500 text-white">
                                {campaign.ownerName.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <p className="text-[10px] font-black uppercase tracking-tight text-slate-400">Custodian {campaign.ownerName.split(' ')[0]}</p>
                         </div>
                         <Button 
                            variant="ghost" 
                            className="rounded-xl h-10 px-4 font-black text-[10px] uppercase tracking-widest text-indigo-600 hover:bg-indigo-50 gap-2"
                            onClick={() => setSelectedCampaign(campaign)}
                         >
                           DETAILS <ChevronRight className="h-3.5 w-3.5" />
                         </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="px-10 pb-10 overflow-x-auto pt-0">
                <table className="w-full">
                  <thead className="bg-slate-50/50 dark:bg-slate-800/50">
                    <tr>
                      <th className="px-6 py-6 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Strategic Node</th>
                      <th className="px-6 py-6 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Objective</th>
                      <th className="px-6 py-6 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Budget Yield</th>
                      <th className="px-6 py-6 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Efficiency</th>
                      <th className="px-6 py-6 text-right text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10 dark:divide-slate-800/10">
                    {filtered.map((campaign) => (
                      <tr key={campaign.id} className="group hover:bg-white/60 dark:hover:bg-slate-800/60 transition-all cursor-default">
                        <td className="px-6 py-8">
                           <div className="flex items-center gap-4">
                              <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                 <Rocket className="h-5 w-5" />
                              </div>
                              <div>
                                 <p className="font-black text-sm uppercase tracking-tight">{campaign.name}</p>
                                 <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">OWNER: {campaign.ownerName}</p>
                              </div>
                           </div>
                        </td>
                        <td className="px-6 py-8">
                           <Badge variant="outline" className="rounded-full font-black text-[8px] px-3 py-1 border-slate-200 dark:border-slate-800 uppercase tracking-widest text-slate-400">{campaign.objective}</Badge>
                        </td>
                        <td className="px-6 py-8">
                           <p className="text-sm font-black text-indigo-600">${campaign.budget.toLocaleString()} <span className="text-[10px] text-slate-400 uppercase">{campaign.currency}</span></p>
                        </td>
                        <td className="px-6 py-8">
                           <div className="flex items-center gap-3 w-[150px]">
                              <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
                                 <div className="h-full bg-indigo-600 w-[45%] transition-all duration-1000" />
                              </div>
                              <span className="text-[10px] font-black text-slate-400">45%</span>
                           </div>
                        </td>
                        <td className="px-6 py-8 text-right">
                           <Badge variant={campaign.status === 'ACTIVE' ? 'default' : 'secondary'} className={cn("rounded-full font-black text-[8px] uppercase tracking-widest", campaign.status === 'ACTIVE' ? "bg-emerald-500" : "bg-slate-100 dark:bg-slate-800 text-slate-400")}>
                             {campaign.status}
                           </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </Card>

      {/* Creation Wizard */}
      <Dialog open={isWizardOpen} onOpenChange={setIsWizardOpen}>
        <DialogContent className="sm:max-w-[600px] border-none bg-white dark:bg-slate-950 p-0 overflow-hidden shadow-2xl">
          <div className="h-2 bg-indigo-600" />
          <div className="p-10 space-y-10">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                 <Badge className="bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest">Step {wizardStep} / 3</Badge>
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Campaign Injection Protocol</p>
              </div>
              <DialogTitle className="text-4xl font-black tracking-tighter">
                {wizardStep === 1 ? "Strategic Context" : wizardStep === 2 ? "Audience & Channels" : "Budget & Horizon"}
              </DialogTitle>
              <DialogDescription className="text-base font-medium italic italic leading-relaxed italic">
                 {wizardStep === 1 ? "Define the primary designation and tactical objective for the growth cluster." : 
                  wizardStep === 2 ? "Coordinate the target audience and strategic channel mix for optimal yield." : 
                  "Authorize the financial allocation and tactical timeline for execution."}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-8">
              <div className="flex gap-2 mb-4">
                {[1, 2, 3].map(s => (
                  <div key={s} className={cn(
                    "h-1.5 flex-1 rounded-full transition-all duration-500",
                    s <= wizardStep ? "bg-indigo-600 shadow-[0_0_8px_rgba(79,70,229,0.5)]" : "bg-slate-100 dark:bg-slate-800"
                  )} />
                ))}
              </div>

              {wizardStep === 1 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Campaign Designation</label>
                    <Input 
                      className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none shadow-inner font-bold text-lg"
                      placeholder="e.g. Q4 ENTERPRISE EXPANSION" 
                      value={name}
                      onChange={e => setName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Tactical Objective</label>
                    <Select value={objective} onValueChange={(v: any) => setObjective(v)}>
                      <SelectTrigger className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none shadow-inner font-bold text-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-none shadow-2xl">
                        {OBJECTIVES.map(obj => (
                          <SelectItem key={obj} value={obj} className="font-bold text-sm uppercase">{obj.replace('_', ' ')}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {wizardStep === 2 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Target Audience</label>
                    <Input 
                      className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none shadow-inner font-bold text-lg"
                      placeholder="e.g. SAAS DECISION MAKERS, HR LEADERS" 
                      value={audience}
                      onChange={e => setAudience(e.target.value)}
                    />
                  </div>
                  <div className="p-6 bg-indigo-500/5 border border-indigo-500/10 rounded-3xl space-y-4">
                     <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                       <Zap className="h-3.5 w-3.5" /> AI Recommended Channel Mix
                     </p>
                     <div className="flex flex-wrap gap-2">
                        {CHANNEL_PRESETS[objective].map(ch => (
                          <Badge key={ch} variant="secondary" className="rounded-full text-[10px] font-black px-4 py-1 bg-white dark:bg-slate-800 text-indigo-600 shadow-sm border border-indigo-500/10 uppercase tracking-widest">{ch}</Badge>
                        ))}
                     </div>
                  </div>
                </div>
              )}

              {wizardStep === 3 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Total Yield Allocation</label>
                      <div className="relative">
                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-indigo-600" />
                        <Input 
                          className="pl-12 h-14 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none shadow-inner font-bold text-lg" 
                          type="number" 
                          value={budget}
                          onChange={e => setBudget(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Currency</label>
                      <Select defaultValue="USD">
                        <SelectTrigger className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none shadow-inner font-bold text-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-none shadow-2xl">
                          <SelectItem value="USD" className="font-bold">USD</SelectItem>
                          <SelectItem value="EUR" className="font-bold">EUR</SelectItem>
                          <SelectItem value="GBP" className="font-bold">GBP</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Tactical Start</label>
                      <Input 
                        type="date" 
                        className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none shadow-inner font-bold text-lg"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Tactical End</label>
                      <Input 
                        type="date" 
                        className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none shadow-inner font-bold text-lg"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="gap-4">
              {wizardStep > 1 && (
                <Button variant="ghost" className="h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest px-8" onClick={() => setWizardStep(s => s - 1)}>BACK</Button>
              )}
              {wizardStep < 3 ? (
                <Button className="h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 font-black text-[10px] uppercase tracking-widest px-10 gap-2" onClick={() => setWizardStep(s => s + 1)}>
                  CONTINUE <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button className="h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 font-black text-[10px] uppercase tracking-widest px-10 gap-2" onClick={handleCreateCampaign} disabled={refreshing}>
                   {refreshing ? "INJECTING..." : "LAUNCH CAMPAIGN CLUSTER"}
                </Button>
              )}
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Overlay */}
      <Dialog open={!!selectedCampaign} onOpenChange={() => setSelectedCampaign(null)}>
        <DialogContent className="max-w-6xl border-none bg-white dark:bg-slate-950 p-0 overflow-hidden shadow-2xl rounded-[3rem]">
           {selectedCampaign && (
             <div className="grid grid-cols-12 min-h-[600px]">
                <div className="col-span-4 bg-slate-50 dark:bg-slate-900/50 p-10 flex flex-col justify-between border-r border-slate-100 dark:border-slate-800">
                   <div className="space-y-8">
                      <div className="flex items-center gap-3">
                         <Badge className="bg-indigo-600 text-white font-black text-[9px] px-3 py-1 uppercase tracking-widest rounded-full">{selectedCampaign.status}</Badge>
                         <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Node: {selectedCampaign.id.slice(-8)}</p>
                      </div>
                      
                      <div className="space-y-2">
                         <h2 className="text-4xl font-black tracking-tighter uppercase leading-tight italic">{selectedCampaign.name}</h2>
                         <p className="text-sm font-medium text-slate-500 italic">"{selectedCampaign.audience}"</p>
                      </div>
                      
                      <div className="space-y-6 pt-4">
                         <div className="flex items-center gap-4 group">
                            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                               <TargetIcon className="h-5 w-5 text-indigo-600" />
                            </div>
                            <div>
                               <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Objective</p>
                               <span className="text-sm font-black uppercase">{selectedCampaign.objective.replace('_', ' ')}</span>
                            </div>
                         </div>
                         <div className="flex items-center gap-4 group">
                            <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                               <Calendar className="h-5 w-5 text-amber-600" />
                            </div>
                            <div>
                               <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Tactical Horizon</p>
                               <span className="text-sm font-black uppercase tracking-tighter">{selectedCampaign.startDate} — {selectedCampaign.endDate}</span>
                            </div>
                         </div>
                         <div className="space-y-3">
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Channel Matrix</p>
                            <div className="flex gap-2 flex-wrap">
                               {selectedCampaign.channelMix.map(ch => (
                                 <Badge key={ch} variant="outline" className="text-[9px] font-black uppercase px-2 py-0 h-5 border-slate-200 dark:border-slate-800 text-slate-500">{ch}</Badge>
                               ))}
                            </div>
                         </div>
                      </div>
                   </div>
                   
                   <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-xl space-y-4">
                      <div className="flex justify-between items-end">
                         <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Yield Multiple</p>
                            <p className="text-3xl font-black text-emerald-600">4.8x ROI</p>
                         </div>
                         <ArrowUpRight className="h-6 w-6 text-emerald-600" />
                      </div>
                      <div className="h-2 w-full bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden shadow-inner">
                         <div className="h-full bg-emerald-500 w-[85%] transition-all duration-1000 shadow-lg" />
                      </div>
                   </div>
                </div>
                
                <div className="col-span-8 flex flex-col bg-white dark:bg-slate-950">
                   <div className="p-10 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white/50 dark:bg-slate-900/50 backdrop-blur-md relative z-10">
                      <div className="flex gap-12">
                         <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Global Budget</p>
                            <p className="text-2xl font-black text-indigo-600">${selectedCampaign.budget.toLocaleString()}</p>
                         </div>
                         <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Current Spend</p>
                            <p className="text-2xl font-black">$12,450</p>
                         </div>
                         <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Leads</p>
                            <p className="text-2xl font-black">428</p>
                         </div>
                      </div>
                      <div className="flex gap-3">
                         <Button 
                            className="rounded-2xl h-12 px-8 bg-emerald-600 hover:bg-emerald-700 font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/20" 
                            onClick={() => handleUpdateStatus(selectedCampaign.id, "ACTIVE")}
                         >
                            ACTIVATE NODE
                         </Button>
                         <Button 
                            variant="destructive" 
                            className="rounded-2xl h-12 px-8 font-black text-[10px] uppercase tracking-widest shadow-lg shadow-rose-500/20"
                            onClick={() => handleUpdateStatus(selectedCampaign.id, "PAUSED")}
                         >
                            PAUSE EXECUTION
                         </Button>
                      </div>
                   </div>
                   
                   <ScrollArea className="flex-1 p-10">
                      <div className="space-y-10">
                         <div className="grid grid-cols-2 gap-8">
                            <Card className="rounded-[2rem] border-none bg-slate-50 dark:bg-slate-900 p-8 space-y-4 group">
                               <div className="flex items-center justify-between">
                                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                     <Globe className="h-4 w-4 text-blue-500" /> Web Velocity
                                  </h4>
                                  <Badge className="bg-emerald-500 text-white font-black text-[8px]">+8.4%</Badge>
                               </div>
                               <p className="text-4xl font-black tracking-tighter">12.5k <span className="text-sm font-bold text-slate-400 uppercase">Hits</span></p>
                            </Card>
                            <Card className="rounded-[2rem] border-none bg-slate-50 dark:bg-slate-900 p-8 space-y-4 group">
                               <div className="flex items-center justify-between">
                                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                     <Zap className="h-4 w-4 text-amber-500" /> Conversion Ratio
                                  </h4>
                                  <p className="text-[10px] font-black uppercase text-slate-400 italic">NOMINAL</p>
                               </div>
                               <p className="text-4xl font-black tracking-tighter">3.2% <span className="text-sm font-bold text-slate-400 uppercase">Rate</span></p>
                            </Card>
                         </div>
                         
                         <div className="space-y-6">
                            <div className="flex items-center justify-between">
                               <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-3">
                                  <Clock className="h-5 w-5 text-indigo-600" />
                                  Real-time Activity Stream
                               </h3>
                               <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Live Telemetry</p>
                            </div>
                            <div className="space-y-4">
                               {[1, 2, 3].map(i => (
                                 <div key={i} className="flex gap-6 items-start p-6 rounded-[1.5rem] hover:bg-slate-50 dark:hover:bg-slate-900 transition-all group">
                                    <div className="h-10 w-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center shrink-0 shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                       <Zap className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1 space-y-1">
                                       <div className="flex justify-between items-center">
                                          <p className="text-sm font-black uppercase tracking-tight">Lead Injection Detected</p>
                                          <span className="text-[10px] font-bold text-slate-400 uppercase">2H AGO</span>
                                       </div>
                                       <p className="text-xs font-medium text-slate-500 italic leading-relaxed">System identified a high-intent conversion event from the Google Ads cluster in the Enterprise Segment.</p>
                                    </div>
                                 </div>
                               ))}
                            </div>
                         </div>
                      </div>
                   </ScrollArea>
                   
                   <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-end">
                      <Button variant="ghost" className="rounded-xl h-10 px-8 font-black text-[10px] uppercase tracking-widest text-slate-400" onClick={() => setSelectedCampaign(null)}>CLOSE PROTOCOL</Button>
                   </div>
                </div>
             </div>
           )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
