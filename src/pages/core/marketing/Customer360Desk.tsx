import * as React from "react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  TrendingUp, 
  Calendar, 
  MessageSquare, 
  ShoppingBag, 
  Search,
  Filter,
  MoreVertical,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Zap,
  Loader2,
  Clock,
  Briefcase,
  Activity,
  Target,
  RefreshCw,
  Layers,
  ArrowUpRight,
  BrainCircuit,
  Split,
  Box,
  CheckCircle2,
  MoreHorizontal,
  ActivitySquare,
  Network,
  Cpu,
  Monitor,
  Fingerprint,
  PieChart,
  BarChart4,
  Bot
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useSession } from "@/core/security/session";
import { marketingService } from "@/core/services/marketing/marketingService";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function Customer360Desk() {
  console.log("[Customer360Desk] Rendering");
  const session = useSession();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  const loadContacts = useCallback(async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);
      const data = await marketingService.listContacts(session.tenant_id, session);
      setContacts(data);
      if (isManual) toast.success("Contact cluster synchronized.");
    } catch (err) {
      console.error("Failed to load contacts:", err);
      toast.error("Telemetry failure in contact suite.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session.tenant_id, session]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const fetchProfile = async (contactId: string) => {
    try {
      setLoadingProfile(true);
      const data = await marketingService.getContactProfile(session.tenant_id, session, contactId);
      setProfile(data);
      setSelectedContact(data);
    } catch (err) {
      console.error("Failed to fetch contact profile:", err);
      toast.error("Profile retrieval failure.");
    } finally {
      setLoadingProfile(false);
    }
  };

  const filteredContacts = useMemo(() => {
    return contacts.filter(c => 
      `${c.first_name} ${c.last_name} ${c.email}`.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [contacts, searchQuery]);

  const getInitials = (first: string, last: string) => {
    return `${(first || "").charAt(0)}${(last || "").charAt(0)}`.toUpperCase() || "?";
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Synthesizing Unified Profiles...</p>
        </div>
      </div>
    );
  }

  return (
    <div id="customer-360-root" className="p-8 space-y-10 animate-in fade-in duration-1000 max-w-[1600px] mx-auto pb-24 h-screen overflow-hidden flex flex-col text-left">
      {/* Premium Header */}
      <div className="flex flex-col lg:flex-row justify-between items-end gap-6 shrink-0">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Badge className="bg-indigo-600 text-white border-none font-black px-3 py-1 rounded-full uppercase tracking-widest text-[10px]">Unified Intelligence</Badge>
            <div className="flex items-center gap-1.5 text-indigo-500 font-bold text-xs uppercase tracking-widest">
               <ActivitySquare className="h-4 w-4 animate-pulse" />
               Customer 360 Matrix Active
            </div>
          </div>
          <h1 className="text-6xl font-black tracking-tighter bg-gradient-to-br from-slate-900 via-slate-700 to-indigo-900 dark:from-white dark:to-slate-400 bg-clip-text text-transparent italic leading-none">Customer 360</h1>
          <p className="text-slate-500 font-medium max-w-2xl text-lg leading-relaxed italic">"Total relationship visibility authorizes absolute tactical dominance across every ingestion node."</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
            <input 
              placeholder="Search entity cluster..." 
              className="pl-12 h-14 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border-none shadow-inner rounded-2xl min-w-[300px] font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-600/20 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button
            variant="secondary"
            className="h-14 w-14 rounded-2xl bg-white dark:bg-slate-800 border-none shadow-xl hover:scale-110 transition-all"
            onClick={() => loadContacts(true)}
            disabled={refreshing}
          >
            <RefreshCw className={cn("h-6 w-6 text-indigo-600", refreshing && "animate-spin")} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-10 flex-1 min-h-0">
        {/* Left Sidebar: Entity Cluster */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6 overflow-hidden">
          <Card className="flex-1 rounded-[4rem] border-none shadow-2xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl overflow-hidden flex flex-col group/registry">
            <CardHeader className="p-10 pb-6 border-b border-white/10 dark:border-slate-800/10 shrink-0">
               <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 italic">Entity Cluster</p>
                    <CardTitle className="text-xl font-black uppercase tracking-tighter italic">Relationship Nodes</CardTitle>
                  </div>
                  <Badge className="rounded-full font-black text-[9px] px-4 py-1.5 bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 uppercase tracking-widest">{filteredContacts.length} NODES</Badge>
               </div>
            </CardHeader>
            <ScrollArea className="flex-1 bg-black/5 dark:bg-white/5">
              {filteredContacts.length === 0 ? (
                <div className="text-center py-32 grayscale opacity-20 space-y-8 flex flex-col items-center">
                   <div className="h-24 w-24 bg-white dark:bg-slate-800 rounded-[3rem] flex items-center justify-center shadow-2xl border border-slate-100 dark:border-slate-700">
                      <User className="h-12 w-12 text-slate-400" />
                   </div>
                   <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Cluster Empty</p>
                      <p className="text-xs font-medium italic italic opacity-40">"No relationship nodes detected in the current ingestion segment."</p>
                   </div>
                </div>
              ) : (
                <div className="p-6 space-y-4">
                  {filteredContacts.map((customer) => (
                    <button
                      key={customer.id}
                      onClick={() => fetchProfile(customer.id)}
                      className={cn(
                        "w-full flex items-center gap-6 p-6 rounded-[2.5rem] text-left transition-all duration-500 group relative overflow-hidden",
                        selectedContact?.id === customer.id 
                          ? "bg-white dark:bg-slate-800 shadow-2xl shadow-indigo-500/20 translate-x-3 scale-[1.02] border border-indigo-600/10" 
                          : "hover:bg-white/50 dark:hover:bg-slate-800/50 hover:translate-x-2"
                      )}
                    >
                      {selectedContact?.id === customer.id && (
                        <div className="absolute left-0 top-0 h-full w-2 bg-indigo-600" />
                      )}
                      <div className="relative">
                        <Avatar className="h-16 w-16 rounded-[1.5rem] ring-4 ring-white dark:ring-slate-900 shadow-xl group-hover:scale-110 transition-transform duration-500">
                          <AvatarFallback className="bg-indigo-600 text-white font-black text-lg italic shadow-inner">
                            {getInitials(customer.first_name, customer.last_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className={cn(
                          "absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-4 border-white dark:border-slate-800 shadow-lg transition-colors",
                          customer.status === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                        )} />
                      </div>
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-lg font-black uppercase tracking-tighter group-hover:text-indigo-600 transition-colors italic leading-none">{customer.first_name} {customer.last_name}</p>
                          <Badge className="text-[9px] font-black px-3 py-1 rounded-full border-none bg-indigo-600/10 text-indigo-600 uppercase tracking-widest shadow-inner">
                            IQ {customer.score || 0}
                          </Badge>
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate leading-none italic opacity-60">{customer.email || "NO TRANSMISSION LINK"}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </Card>
        </div>

        {/* Right Section: Intelligence & Lifecycle */}
        <div className="col-span-12 lg:col-span-8 overflow-hidden flex flex-col gap-10">
          {loadingProfile ? (
            <div className="h-full flex flex-col items-center justify-center rounded-[4rem] border-2 border-dashed border-white/20 dark:border-slate-800/20 bg-white/10 dark:bg-slate-900/10 grayscale opacity-20 space-y-8 animate-in fade-in duration-1000">
               <div className="relative">
                  <div className="h-24 w-24 rounded-[3rem] bg-indigo-600 flex items-center justify-center shadow-2xl animate-spin duration-[3000ms]">
                     <RefreshCw className="h-12 w-12 text-white" />
                  </div>
               </div>
               <div className="text-center space-y-3">
                 <h3 className="text-3xl font-black uppercase tracking-tighter italic">Verifying Entity Integrity</h3>
                 <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 max-w-[300px] mx-auto leading-relaxed italic">Synchronizing unified profile telemetry from the core relationship matrix.</p>
               </div>
            </div>
          ) : selectedContact && profile ? (
            <div className="h-full flex flex-col gap-10 overflow-hidden">
              {/* Profile Matrix Header */}
              <Card className="rounded-[4rem] border-none shadow-2xl bg-indigo-950 text-white p-12 relative overflow-hidden group shrink-0">
                <div className="absolute top-0 right-0 h-96 w-96 bg-indigo-600/20 rounded-full blur-[100px] -mr-48 -mt-48 group-hover:scale-150 transition-transform duration-[2000ms]" />
                <div className="relative z-10 flex flex-col md:flex-row gap-12 items-center justify-between">
                  <div className="flex flex-col md:flex-row items-center gap-10">
                    <div className="relative">
                       <Avatar className="h-32 w-32 rounded-[3rem] ring-8 ring-white/10 shadow-[0_40px_80px_-15px_rgba(79,70,229,0.5)] group-hover:rotate-6 transition-all duration-700">
                         <AvatarFallback className="text-5xl font-black bg-indigo-600 text-white italic shadow-2xl">
                           {getInitials(profile.first_name, profile.last_name)}
                         </AvatarFallback>
                       </Avatar>
                       <div className="absolute -bottom-2 -right-2 h-10 w-10 bg-emerald-500 rounded-2xl border-4 border-indigo-950 flex items-center justify-center shadow-2xl">
                          <CheckCircle2 className="h-5 w-5 text-white" />
                       </div>
                    </div>
                    <div className="space-y-4 text-center md:text-left">
                      <div className="flex flex-col md:flex-row items-center gap-6">
                        <h2 className="text-6xl font-black tracking-tighter uppercase italic leading-none">{profile.first_name} {profile.last_name}</h2>
                        <Badge className="bg-white/10 border-none text-[10px] font-black px-6 py-2 rounded-full text-indigo-300 uppercase tracking-[0.3em] backdrop-blur-xl shadow-2xl animate-pulse">
                          {profile.score > 80 ? "HIGH VALUE ASSET" : "STRATEGIC NODE"}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap justify-center md:justify-start gap-10 text-[11px] font-black uppercase tracking-[0.2em] opacity-60 italic">
                        <span className="flex items-center gap-3"><Mail className="h-4.5 w-4.5 text-indigo-400" /> {profile.email}</span>
                        <span className="flex items-center gap-3"><Phone className="h-4.5 w-4.5 text-indigo-400" /> {profile.phone || "UNVERIFIED"}</span>
                        {profile.company && (
                          <span className="flex items-center gap-3"><Briefcase className="h-4.5 w-4.5 text-indigo-400" /> {profile.company}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <Button className="h-16 w-16 rounded-[1.5rem] bg-white/5 border border-white/10 shadow-2xl hover:bg-white hover:text-slate-900 hover:scale-110 transition-all text-white"><MessageSquare className="h-7 w-7" /></Button>
                    <Button className="h-16 w-16 rounded-[1.5rem] bg-white/5 border border-white/10 shadow-2xl hover:bg-white hover:text-slate-900 hover:scale-110 transition-all text-white"><Calendar className="h-7 w-7" /></Button>
                    <Button className="h-16 w-16 rounded-[1.5rem] bg-white/5 border border-white/10 shadow-2xl hover:bg-white hover:text-slate-900 hover:scale-110 transition-all text-white"><MoreHorizontal className="h-7 w-7" /></Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-12 mt-16 pt-12 border-t border-white/10 relative z-10">
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 italic leading-none">Intelligence IQ</p>
                    <p className="text-5xl font-black tracking-tighter italic">{profile.score}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 italic leading-none">Engagement Velocity</p>
                    <div className="flex items-center gap-3">
                       <ActivitySquare className="h-6 w-6 text-indigo-400 animate-pulse" />
                       <p className="text-3xl font-black tracking-tighter italic uppercase">Critical</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 italic leading-none">Yield Potential</p>
                    <p className="text-5xl font-black tracking-tighter text-emerald-400 italic">ULTRA</p>
                  </div>
                  <div className="space-y-2 text-right md:text-left">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 italic leading-none">Operational Status</p>
                    <Badge className="bg-emerald-500 text-white border-none text-[12px] font-black px-6 py-2 rounded-full uppercase tracking-widest shadow-2xl shadow-emerald-500/20">
                       {profile.status}
                    </Badge>
                  </div>
                </div>
              </Card>

              {/* Intelligence & Lifecycle Matrix */}
              <Tabs defaultValue="timeline" className="w-full flex-1 flex flex-col min-h-0">
                <CardHeader className="p-0 shrink-0">
                   <TabsList className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl p-2 rounded-[2rem] shadow-inner border border-white/10 w-fit h-auto">
                      <TabsTrigger value="timeline" className="rounded-[1.5rem] px-10 py-3 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-2xl h-12 border-none transition-all italic">Strategic Timeline</TabsTrigger>
                      <TabsTrigger value="insights" className="rounded-[1.5rem] px-10 py-3 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-2xl h-12 border-none transition-all italic">ROI Intelligence</TabsTrigger>
                      <TabsTrigger value="history" className="rounded-[1.5rem] px-10 py-3 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-2xl h-12 border-none transition-all italic">Conversion Trail</TabsTrigger>
                   </TabsList>
                </CardHeader>
                
                <div className="flex-1 min-h-0 mt-10 overflow-hidden">
                   <TabsContent value="timeline" className="h-full m-0 outline-none">
                     <Card className="h-full rounded-[4rem] border-none shadow-2xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl overflow-hidden flex flex-col group/timeline">
                       <CardHeader className="p-12 pb-6 border-b border-white/10 dark:border-slate-800/10 flex flex-row items-center justify-between shrink-0">
                          <div className="space-y-2">
                             <CardTitle className="text-2xl font-black uppercase tracking-tighter flex items-center gap-4 italic leading-none">
                                <Clock className="h-8 w-8 text-indigo-600 group-hover/timeline:rotate-12 transition-transform duration-500" />
                                Strategic Lifecycle
                             </CardTitle>
                             <CardDescription className="text-sm font-medium italic italic opacity-60">Complete temporal audit of every relationship interaction and conversion event.</CardDescription>
                          </div>
                          <Badge className="bg-indigo-600/10 text-indigo-600 font-black text-[10px] px-4 py-1.5 rounded-full border-none uppercase tracking-widest shadow-inner">LIVE TELEMETRY</Badge>
                       </CardHeader>
                       <ScrollArea className="flex-1 bg-black/5 dark:bg-white/5">
                         <div className="p-12 space-y-12">
                           {(!profile.timeline || profile.timeline.length === 0) ? (
                             <div className="text-center py-32 grayscale opacity-20 space-y-8 flex flex-col items-center">
                               <div className="h-24 w-24 bg-white dark:bg-slate-800 rounded-[3rem] flex items-center justify-center shadow-2xl border border-slate-100 dark:border-slate-700">
                                  <Layers className="h-12 w-12 text-slate-400" />
                               </div>
                               <div className="space-y-2">
                                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Zero Temporal Events</p>
                                  <p className="text-sm font-medium italic italic opacity-40">"No tactical interactions have been authorized for this node."</p>
                               </div>
                             </div>
                           ) : (
                             <div className="relative pl-12 space-y-12">
                                <div className="absolute left-4 top-4 bottom-4 w-1 bg-indigo-500/10 rounded-full" />
                                {profile.timeline.map((item: any, i: number) => (
                                  <div key={item.id} className="relative group/item">
                                     <div className={cn(
                                       "absolute -left-12 top-0 h-10 w-10 rounded-[1.25rem] flex items-center justify-center ring-8 ring-white dark:ring-slate-900 shadow-2xl transition-all group-hover/item:scale-125 z-10 duration-500",
                                       item.type === 'MESSAGE' ? 'bg-indigo-600 text-white' :
                                       item.type === 'APPOINTMENT' ? 'bg-emerald-500 text-white' :
                                       item.type === 'PURCHASE' ? 'bg-amber-500 text-white' : 'bg-slate-900 text-white'
                                     )}>
                                       {item.type === 'MESSAGE' && <MessageSquare className="h-5 w-5" />}
                                       {item.type === 'APPOINTMENT' && <Calendar className="h-5 w-5" />}
                                       {item.type === 'PURCHASE' && <ShoppingBag className="h-5 w-5" />}
                                       {item.type === 'LEAD_CAPTURE' && <Zap className="h-5 w-5" />}
                                     </div>
                                     <div className="p-8 rounded-[2.5rem] bg-white dark:bg-slate-900 shadow-xl border border-white/10 group-hover/item:shadow-2xl group-hover/item:translate-x-3 transition-all duration-500 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 h-32 w-32 bg-indigo-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover/item:scale-150 transition-transform duration-1000" />
                                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10 mb-6">
                                          <div className="space-y-1">
                                             <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 italic leading-none">{item.type.replace('_', ' ')}</p>
                                             <h4 className="font-black text-2xl uppercase tracking-tighter italic group-hover/item:text-indigo-600 transition-colors leading-none">{item.title || item.type.replace('_', ' ')}</h4>
                                          </div>
                                          <div className="text-right">
                                             <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600 italic leading-none">{new Date(item.timestamp).toLocaleDateString()}</p>
                                             <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic opacity-60">{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                          </div>
                                        </div>
                                        <p className="text-base font-medium text-slate-600 dark:text-slate-300 italic leading-relaxed italic max-w-3xl relative z-10">
                                          "{item.content || item.detail || item.notes || "Executing standard relationship protocol within the core ingestion matrix."}"
                                        </p>
                                        <div className="flex items-center gap-4 mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 relative z-10">
                                           <Badge className="rounded-full bg-indigo-600/10 text-indigo-600 font-black text-[9px] px-4 py-1.5 uppercase tracking-widest border-none shadow-inner italic">NODE: {item.id.slice(-8)}</Badge>
                                           <Badge className="rounded-full bg-emerald-500/10 text-emerald-500 font-black text-[9px] px-4 py-1.5 uppercase tracking-widest border-none shadow-inner italic">{item.status || "COMPLETED"}</Badge>
                                        </div>
                                     </div>
                                  </div>
                                ))}
                             </div>
                           )}
                         </div>
                       </ScrollArea>
                     </Card>
                   </TabsContent>

                   <TabsContent value="insights" className="h-full m-0 outline-none">
                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 h-full">
                        <Card className="rounded-[4rem] border-none shadow-2xl bg-white dark:bg-slate-900 p-12 space-y-10 group hover:shadow-[0_40px_80px_-20px_rgba(79,70,229,0.2)] transition-all duration-700 relative overflow-hidden">
                           <div className="absolute top-0 right-0 h-48 w-48 bg-indigo-500/5 rounded-full blur-[80px] -mr-24 -mt-24 group-hover:scale-150 transition-transform duration-1000" />
                           <div className="flex items-center justify-between relative z-10">
                              <div className="h-20 w-20 rounded-[2rem] bg-indigo-600/10 flex items-center justify-center group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500 shadow-inner">
                                 <BrainCircuit className="h-10 w-10 text-indigo-600 group-hover:text-white" />
                              </div>
                              <p className="text-[12px] font-black uppercase tracking-[0.4em] text-slate-400 italic">Neural Matrix</p>
                           </div>
                           <div className="space-y-10 relative z-10">
                              <div className="space-y-2">
                                <h3 className="text-4xl font-black uppercase tracking-tighter italic leading-none">Predictive IQ</h3>
                                <p className="text-sm font-medium italic italic opacity-60">AI-driven behavior modelling and churn probability delta.</p>
                              </div>
                              <div className="space-y-12 pt-4">
                                 <div className="space-y-4">
                                    <div className="flex justify-between items-end">
                                       <p className="text-[12px] font-black uppercase tracking-[0.3em] text-slate-400 italic">Churn Probability</p>
                                       <p className="text-2xl font-black text-emerald-500 italic">12% — LOW</p>
                                    </div>
                                    <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner p-0.5">
                                       <div className="h-full bg-emerald-500 rounded-full w-[12%] transition-all duration-[2000ms] shadow-[0_0_12px_rgba(16,185,129,0.5)]" />
                                    </div>
                                 </div>
                                 <div className="space-y-4">
                                    <div className="flex justify-between items-end">
                                       <p className="text-[12px] font-black uppercase tracking-[0.3em] text-slate-400 italic">Growth Velocity</p>
                                       <p className="text-2xl font-black text-indigo-600 italic">88% — ULTRA</p>
                                    </div>
                                    <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner p-0.5">
                                       <div className="h-full bg-indigo-600 rounded-full w-[88%] transition-all duration-[2000ms] shadow-[0_0_20px_rgba(79,70,229,0.5)]" />
                                    </div>
                                 </div>
                              </div>
                           </div>
                        </Card>

                        <Card className="rounded-[4rem] border-none shadow-2xl bg-slate-900 text-white p-12 relative overflow-hidden group hover:shadow-slate-500/20 transition-all duration-700 flex flex-col justify-between">
                           <div className="absolute top-0 right-0 h-64 w-64 bg-white/5 rounded-full blur-[100px] -mr-32 -mt-32 group-hover:scale-150 transition-transform duration-1000" />
                           <div className="relative z-10 space-y-8">
                              <div className="h-20 w-20 rounded-[2rem] bg-white/10 backdrop-blur-xl flex items-center justify-center shadow-2xl border border-white/10 group-hover:rotate-12 transition-all duration-500">
                                 <Target className="h-10 w-10 text-white" />
                              </div>
                              <div className="space-y-3">
                                <p className="text-[12px] font-black uppercase tracking-[0.4em] opacity-40 italic">Strategic Yield</p>
                                <h3 className="text-4xl font-black uppercase tracking-tighter italic leading-none">Authorization Recommended</h3>
                              </div>
                              <p className="text-lg font-medium italic italic opacity-60 leading-relaxed italic italic">
                                "Unified intelligence authorizes an <strong>immediate remarketing injection</strong> for high-intent conversion nodes. ROI projection suggests a <strong>4.2x multiplier</strong> in the current quarter."
                              </p>
                           </div>
                           <Button className="w-full h-20 rounded-[2.5rem] bg-indigo-600 text-white font-black text-[12px] uppercase tracking-[0.3em] shadow-2xl hover:scale-105 active:scale-95 transition-all gap-4 relative z-10 border-none group/btn">
                              <Rocket className="h-7 w-7 group-hover/btn:translate-y-[-4px] group-hover/btn:translate-x-[4px] transition-transform" /> AUTHORIZE STRATEGIC INJECTION
                           </Button>
                        </Card>
                     </div>
                   </TabsContent>
                </div>
              </Tabs>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center rounded-[5rem] border-2 border-dashed border-white/20 dark:border-slate-800/20 bg-white/5 dark:bg-slate-900/5 grayscale opacity-20 space-y-10 animate-in fade-in duration-1000 relative overflow-hidden">
               <div className="absolute inset-0 bg-indigo-500/5 blur-[120px] rounded-full scale-150 animate-pulse" />
               <div className="relative z-10">
                  <div className="h-48 w-48 rounded-[4rem] bg-white dark:bg-slate-800 flex items-center justify-center shadow-[0_60px_100px_-20px_rgba(79,70,229,0.3)] relative z-10 border border-white/10 group">
                     <User className="h-24 w-24 text-indigo-600 group-hover:scale-110 transition-transform duration-700" />
                  </div>
               </div>
               <div className="text-center space-y-4 relative z-10">
                 <h3 className="text-5xl font-black uppercase tracking-tighter italic leading-none text-slate-900 dark:text-white">Zero Entity Context</h3>
                 <p className="text-base font-black uppercase tracking-[0.4em] text-slate-400 max-w-[450px] mx-auto leading-relaxed italic italic">Authorize a strategic relationship node from the cluster to synchronize unified 360 intelligence.</p>
               </div>
               <Button className="h-16 px-12 rounded-full bg-indigo-600 text-white font-black text-[10px] uppercase tracking-[0.3em] shadow-2xl animate-bounce mt-10">SELECT NODE</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
