import { useCallback, useEffect, useMemo, useState } from "react";
import { 
  Users, 
  Target, 
  Zap, 
  ArrowUpRight, 
  Filter, 
  Search, 
  MoreHorizontal, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  Phone,
  Mail,
  Building2,
  TrendingUp,
  Clock,
  RefreshCw,
  Plus,
  ShieldCheck,
  ChevronRight,
  Activity,
  Rocket,
  Globe,
  PieChart,
  Layers,
  Box,
  Fingerprint
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSession } from "@/core/security/session";
import { marketingService } from "@/core/services/marketing/marketingService";
import type { MarketingLead, MarketingCampaign } from "@/core/types/marketing/marketing";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const SOURCES: MarketingLead["source"][] = [
  "LANDING_PAGE",
  "EMBEDDED_FORM",
  "CHATBOT",
  "WEBINAR",
  "META_LEAD_ADS",
  "GOOGLE_ADS",
  "PARTNER_API",
];

export default function LeadCaptureDesk() {
  const session = useSession();
  const [search, setSearch] = useState("");
  const [source, setSource] = useState<MarketingLead["source"]>("LANDING_PAGE");
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [industry, setIndustry] = useState("Retail");
  const [employeeBand, setEmployeeBand] = useState("51-200");
  const [campaignId, setCampaignId] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [leads, setLeads] = useState<MarketingLead[]>([]);
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [captureOpen, setCaptureOpen] = useState(false);

  const refresh = useCallback(async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);
      const [l, c] = await Promise.all([
        marketingService.listLeads(session.tenant_id, session),
        marketingService.listCampaigns(session.tenant_id, session),
      ]);
      setLeads(l);
      setCampaigns(c);
      if (c.length > 0 && !campaignId) {
        setCampaignId(c[0].id);
      }
      if (isManual) toast.success("Intelligence registry synchronized.");
    } catch (err) {
      console.error("Failed to fetch lead capture data:", err);
      toast.error("Telemetry failure in capture suite.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session.tenant_id, campaignId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filtered = useMemo(
    () =>
      leads.filter((item) =>
        search
          ? `${item.companyName} ${item.contactName} ${item.source} ${item.status}`
              .toLowerCase()
              .includes(search.toLowerCase())
          : true,
      ),
    [leads, search],
  );

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-500 bg-emerald-500/10";
    if (score >= 60) return "text-amber-500 bg-amber-500/10";
    return "text-rose-500 bg-rose-500/10";
  };

  const handleCapture = async () => {
    if (!companyName || !contactName) {
      toast.error("Company and Contact designation required.");
      return;
    }
    try {
      setRefreshing(true);
      await marketingService.captureLead(session.tenant_id, session, {
        source,
        companyName,
        contactName,
        email,
        campaignId,
        industry,
        employeeBand,
      });
      setCaptureOpen(false);
      setCompanyName("");
      setContactName("");
      setEmail("");
      toast.success("Lead Ingested & Scored", {
        description: `Entity ${companyName} has been authorized for strategic nurturing.`
      });
      refresh(true);
    } catch (err) {
      toast.error("Ingestion failure.");
      setRefreshing(false);
    }
  };

  const handleHandoff = async (id: string) => {
    try {
      setRefreshing(true);
      await marketingService.markLeadHandoffReady(session.tenant_id, session, id);
      toast.success("Strategic Handoff Authorized", {
        description: "Entity has been transitioned to Sales Core for final conversion."
      });
      refresh(true);
    } catch (err) {
      toast.error("Authorization protocol failure.");
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-6">
          <div className="h-20 w-20 bg-indigo-600 rounded-[2.5rem] animate-pulse flex items-center justify-center shadow-2xl shadow-indigo-500/20">
             <Fingerprint className="h-10 w-10 text-white" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Booting Intelligence Ingestion...</p>
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
            <Badge className="bg-indigo-600 text-white border-none font-black px-3 py-1 rounded-full uppercase tracking-widest text-[10px]">Strategic Ingestion</Badge>
            <div className="flex items-center gap-1.5 text-indigo-500 font-bold text-xs uppercase tracking-widest">
               <Activity className="h-4 w-4 animate-pulse" />
               Scoring Matrix Active
            </div>
          </div>
          <h1 className="text-6xl font-black tracking-tighter bg-gradient-to-br from-slate-900 via-slate-700 to-indigo-900 dark:from-white dark:to-slate-400 bg-clip-text text-transparent text-left italic">Lead Capture</h1>
          <p className="text-slate-500 font-medium max-w-2xl text-lg leading-relaxed italic text-left">"Intelligent ingestion engine authorizing high-intent entities for strategic conversion."</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
            <Input 
              placeholder="Search entity matrix..." 
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
            className="h-[4.5rem] px-10 rounded-[2rem] bg-indigo-600 hover:bg-indigo-700 shadow-2xl shadow-indigo-500/30 font-black text-sm gap-3 group transition-all hover:scale-105 active:scale-95"
            onClick={() => setCaptureOpen(true)}
          >
            <Plus className="h-6 w-6 group-hover:rotate-90 transition-transform duration-500" /> 
            AUTHORIZE ENTRY
          </Button>
        </div>
      </div>

      {/* Top Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Ingestion Today', val: '24', icon: Users, color: 'text-indigo-600' },
          { label: 'Avg Intelligence', val: '72', icon: Zap, color: 'text-amber-500' },
          { label: 'Qualified Rate', val: '35%', icon: Target, color: 'text-emerald-500' },
          { label: 'Handoff Ready', val: '8', icon: Rocket, color: 'text-blue-500' },
        ].map((stat, i) => (
          <Card key={i} className="rounded-[2.5rem] border-none shadow-xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-md group hover:shadow-2xl transition-all">
            <CardContent className="p-8 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 italic leading-none">{stat.label}</p>
                <p className={cn("text-3xl font-black tracking-tighter uppercase italic leading-none", stat.color)}>{stat.val}</p>
              </div>
              <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform", stat.color.replace('text', 'bg').replace('600', '100').replace('500', '100'))}>
                <stat.icon className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-10 flex-1 min-h-0">
        {/* Left: Intelligence Feed */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
           <Card className="flex-1 rounded-[3rem] border-none shadow-2xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl overflow-hidden flex flex-col">
              <CardHeader className="p-10 pb-6 border-b border-white/10 dark:border-slate-800/10 flex flex-row items-center justify-between">
                 <div className="space-y-1">
                    <CardTitle className="text-2xl font-black tracking-tight flex items-center gap-3 uppercase italic">
                       <Layers className="h-6 w-6 text-indigo-600" />
                       Intelligence Feed
                    </CardTitle>
                    <CardDescription className="text-xs font-medium italic italic">Real-time queue of incoming entities and their strategic scores.</CardDescription>
                 </div>
                 <Badge variant="outline" className="rounded-full font-black text-[9px] px-3 py-1 border-slate-200 dark:border-slate-800 uppercase tracking-widest text-slate-400 flex gap-2">
                   <Clock className="h-3 w-3 animate-pulse" /> LIVE SYNCING
                 </Badge>
              </CardHeader>
              <ScrollArea className="flex-1">
                 <div className="p-0">
                    <table className="w-full text-sm">
                       <thead className="bg-slate-50/50 dark:bg-slate-800/50 text-[10px] uppercase text-slate-400 sticky top-0 z-10 font-black tracking-[0.2em] italic">
                          <tr>
                             <th className="p-8 text-left">Target Entity</th>
                             <th className="p-8 text-left">Source / Matrix</th>
                             <th className="p-8 text-left">Intelligence IQ</th>
                             <th className="p-8 text-left">Status</th>
                             <th className="p-8 text-right">Actions</th>
                          </tr>
                       </thead>
                       <tbody>
                          {filtered.map((lead) => (
                            <tr key={lead.id} className="border-t border-white/10 dark:border-slate-800/10 group hover:bg-indigo-600/5 transition-all">
                               <td className="p-8">
                                  <div className="flex items-center gap-4">
                                     <Avatar className="h-14 w-14 rounded-2xl shadow-xl ring-2 ring-white/10 transition-transform duration-500 group-hover:scale-110">
                                        <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-black text-sm italic">
                                           {lead.companyName[0]}{lead.contactName[0]}
                                        </AvatarFallback>
                                     </Avatar>
                                     <div className="space-y-1">
                                        <div className="font-black uppercase tracking-tight italic flex items-center gap-3 text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                                           {lead.companyName}
                                           <Link to={`/core/marketing/customer-360?id=${lead.id}`}>
                                             <ExternalLink className="h-3.5 w-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-all hover:text-indigo-600" />
                                           </Link>
                                        </div>
                                        <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest opacity-60 italic">{lead.contactName}</div>
                                     </div>
                                  </div>
                               </td>
                               <td className="p-8">
                                  <div className="flex flex-col gap-2">
                                     <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-500 font-black text-[9px] px-3 py-1 rounded-full border-none uppercase tracking-widest w-fit">
                                        {lead.source}
                                     </Badge>
                                     <span className="text-[9px] text-slate-400 font-black uppercase tracking-tighter italic opacity-60 truncate max-w-[120px]">
                                        {campaigns.find(c => c.id === lead.campaignId)?.name || "DIRECT PROTOCOL"}
                                     </span>
                                  </div>
                               </td>
                               <td className="p-8">
                                  <div className="flex items-center gap-6">
                                     <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center font-black text-xs shadow-lg", getScoreColor(lead.score))}>
                                        {lead.score}
                                     </div>
                                     <div className="flex-1 space-y-2 min-w-[100px]">
                                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest italic">
                                           <span className="text-slate-400">Intent IQ</span>
                                           <span className={lead.intent === 'HIGH' ? 'text-emerald-500' : 'text-slate-400'}>{lead.intent}</span>
                                        </div>
                                        <div className="h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
                                           <Progress value={lead.score} className="h-full bg-indigo-600 transition-all duration-1000" />
                                        </div>
                                     </div>
                                  </div>
                               </td>
                               <td className="p-8">
                                  <Badge className={cn(
                                    "text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full border-none shadow-sm",
                                    lead.status === 'HANDOFF_READY' ? "bg-emerald-500 text-white shadow-emerald-500/20" : 
                                    lead.status === 'QUALIFIED' ? "bg-indigo-600 text-white shadow-indigo-500/20" : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                                  )}>
                                     {lead.status.replace('_', ' ')}
                                  </Badge>
                               </td>
                               <td className="p-8 text-right">
                                  <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                     <Button 
                                       size="icon" 
                                       className="h-10 w-10 rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:scale-110 active:scale-95 transition-all" 
                                       onClick={() => handleHandoff(lead.id)}
                                     >
                                        <CheckCircle2 className="h-5 w-5" />
                                     </Button>
                                     <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button size="icon" variant="ghost" className="h-10 w-10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"><MoreHorizontal className="h-4 w-4 text-slate-400" /></Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 border-none shadow-2xl">
                                           <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest opacity-50 px-3 py-2">Entity Actions</DropdownMenuLabel>
                                           <DropdownMenuSeparator />
                                           <DropdownMenuItem className="gap-3 py-3 rounded-xl font-bold"><ShieldCheck className="h-4 w-4" /> Verify IQ Data</DropdownMenuItem>
                                           <DropdownMenuItem className="gap-3 py-3 rounded-xl font-bold"><TrendingUp className="h-4 w-4" /> Manual Scoring</DropdownMenuItem>
                                           <DropdownMenuSeparator />
                                           <DropdownMenuItem className="gap-3 text-rose-600 py-3 rounded-xl font-bold"><AlertCircle className="h-4 w-4" /> Mark as Spore/Fraud</DropdownMenuItem>
                                        </DropdownMenuContent>
                                     </DropdownMenu>
                                  </div>
                               </td>
                            </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              </ScrollArea>
           </Card>
        </div>

        {/* Right: Attribution & Intelligence */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-10">
           <Card className="rounded-[3rem] border-none shadow-2xl bg-indigo-900 text-white p-10 relative overflow-hidden group">
              <div className="absolute top-0 right-0 h-40 w-40 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20 group-hover:scale-150 transition-transform duration-1000" />
              <div className="relative z-10 space-y-8">
                 <div className="flex items-center gap-4">
                    <div className="h-14 w-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl group-hover:rotate-12 transition-transform">
                       <Zap className="h-7 w-7 text-white fill-white" />
                    </div>
                    <div>
                       <h4 className="font-black text-xl uppercase tracking-tighter italic">Ingestion</h4>
                       <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Tactical Entry Node</p>
                    </div>
                 </div>
                 <p className="text-sm font-medium italic italic opacity-70 leading-relaxed italic">
                    "Intelligence scroring is active. <strong>87% of incoming nodes</strong> from Meta Ads are being qualified for Enterprise Q4 protocols."
                 </p>
                 <Button 
                   className="w-full h-16 bg-white text-indigo-900 hover:bg-slate-100 border-none rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl gap-3 group/btn"
                   onClick={() => setCaptureOpen(true)}
                 >
                    <Plus className="h-5 w-5 group-hover/btn:rotate-90 transition-transform duration-500" />
                    INITIALIZE MANUAL ENTRY
                 </Button>
              </div>
           </Card>

           <Card className="rounded-[3rem] border-none shadow-2xl bg-white dark:bg-slate-900 overflow-hidden group">
              <CardHeader className="p-8 pb-4">
                 <div className="flex items-center justify-between mb-4">
                    <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 italic">Source Attribution Matrix</CardTitle>
                    <PieChart className="h-4 w-4 text-indigo-600" />
                 </div>
              </CardHeader>
              <CardContent className="p-8 pt-0 space-y-8">
                 {[
                   { name: 'GOOGLE ADS', val: 45, color: 'bg-blue-600' },
                   { name: 'LANDING PAGE', val: 30, color: 'bg-emerald-500' },
                   { name: 'WEBINARS', val: 15, color: 'bg-indigo-600' },
                   { name: 'OTHERS', val: 10, color: 'bg-slate-200 dark:bg-slate-800' }
                 ].map(item => (
                   <div key={item.name} className="space-y-2 group/bar">
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

           <Card className="rounded-[2.5rem] border-none shadow-2xl bg-indigo-600/5 dark:bg-indigo-900/10 p-8 border border-indigo-600/10">
              <div className="flex items-start gap-4">
                 <div className="h-10 w-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center shadow-lg shrink-0">
                    <Activity className="h-5 w-5 text-indigo-600 animate-pulse" />
                 </div>
                 <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Scoring Advisory</p>
                    <p className="text-xs font-medium italic leading-relaxed text-slate-600 dark:text-slate-400 italic">
                       "Incoming traffic from <strong>LinkedIn Direct</strong> shows a <strong>+22% increase</strong> in intent IQ. Recommend scaling budget for Q4 Enterprise links."
                    </p>
                 </div>
              </div>
           </Card>
        </div>
      </div>

      {/* Initialize Entry Wizard */}
      <Dialog open={captureOpen} onOpenChange={setCaptureOpen}>
        <DialogContent className="sm:max-w-[550px] rounded-[3rem] border-none bg-white dark:bg-slate-950 p-0 overflow-hidden shadow-2xl">
          <div className="h-2 bg-indigo-600" />
          <div className="p-12 space-y-10">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                 <Badge className="bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest">Protocol Entry</Badge>
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Manual Ingestion</p>
              </div>
              <DialogTitle className="text-4xl font-black tracking-tighter uppercase italic">Manual Capture</DialogTitle>
              <DialogDescription className="text-base font-medium italic italic">Authorize a new entity node for strategic scoring and nurturing.</DialogDescription>
            </DialogHeader>
            <div className="space-y-8">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Entity Company</Label>
                  <Input 
                    placeholder="ACME INC." 
                    value={companyName} 
                    onChange={e => setCompanyName(e.target.value)} 
                    className="h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none shadow-inner font-bold text-lg uppercase"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Principal Contact</Label>
                  <Input 
                    placeholder="JOHN DOE" 
                    value={contactName} 
                    onChange={e => setContactName(e.target.value)} 
                    className="h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none shadow-inner font-bold text-lg uppercase"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Secure Email</Label>
                <Input 
                   placeholder="JOHN@EXAMPLE.COM" 
                   value={email} 
                   onChange={e => setEmail(e.target.value)} 
                   className="h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none shadow-inner font-bold text-lg text-indigo-600"
                />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Ingestion Source</Label>
                  <Select value={source} onValueChange={(v: any) => setSource(v)}>
                    <SelectTrigger className="h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none shadow-inner font-bold text-xs uppercase tracking-widest">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-none shadow-2xl p-2">
                      {SOURCES.map(s => <SelectItem key={s} value={s} className="rounded-xl py-3 font-bold uppercase tracking-widest text-[10px]">{s.replace('_', ' ')}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Sector Industry</Label>
                  <Select value={industry} onValueChange={setIndustry}>
                    <SelectTrigger className="h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none shadow-inner font-bold text-xs uppercase tracking-widest">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-none shadow-2xl p-2">
                      <SelectItem value="Retail" className="rounded-xl py-3 font-bold uppercase tracking-widest text-[10px]">RETAIL</SelectItem>
                      <SelectItem value="Technology" className="rounded-xl py-3 font-bold uppercase tracking-widest text-[10px]">TECHNOLOGY</SelectItem>
                      <SelectItem value="Manufacturing" className="rounded-xl py-3 font-bold uppercase tracking-widest text-[10px]">MANUFACTURING</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button 
                 className="w-full h-16 rounded-2xl bg-indigo-600 hover:bg-indigo-700 font-black text-xs uppercase tracking-widest shadow-2xl shadow-indigo-500/30 gap-3"
                 onClick={handleCapture}
                 disabled={refreshing}
              >
                {refreshing ? <RefreshCw className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
                CAPTURE & SCORE ENTITY
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Label({ className, children, ...props }: any) {
  return (
    <label className={cn("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", className)} {...props}>
      {children}
    </label>
  );
}

function Hash({ className }: any) {
   return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
         <line x1="4" y1="9" x2="20" y2="9" />
         <line x1="4" y1="15" x2="20" y2="15" />
         <line x1="10" y1="3" x2="8" y2="21" />
         <line x1="16" y1="3" x2="14" y2="21" />
      </svg>
   );
}
