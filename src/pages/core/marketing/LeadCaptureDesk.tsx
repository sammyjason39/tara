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
  Clock
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
import { useSession } from "@/core/security/session";
import { marketingService } from "@/core/services/marketing/marketingService";
import type { MarketingLead, MarketingCampaign } from "@/core/types/marketing/marketing";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

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
  const [leads, setLeads] = useState<MarketingLead[]>([]);
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);

  const refresh = useCallback(async () => {
    try {
      const [l, c] = await Promise.all([
        marketingService.listLeads(session.tenant_id, session),
        marketingService.listCampaigns(session.tenant_id, session),
      ]);
      setLeads(l);
      setCampaigns(c);
      if (c.length > 0 && !campaignId) {
        setCampaignId(c[0].id);
      }
    } catch (err) {
      console.error("Failed to fetch lead capture data:", err);
    } finally {
      setLoading(false);
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
    if (score >= 80) return "text-green-500 bg-green-500/10";
    if (score >= 60) return "text-yellow-500 bg-yellow-500/10";
    return "text-red-500 bg-red-500/10";
  };

  return (
    <div className="flex h-full flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Lead Capture</h1>
          <p className="text-muted-foreground">Intelligent ingestion and scoring engine.</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input 
              placeholder="Search leads..." 
              className="pl-9 min-w-[250px]"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="outline"><Filter className="mr-2 h-4 w-4" /> Filters</Button>
        </div>
      </div>

      {/* Top Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Leads Today</p>
              <p className="text-2xl font-bold">24</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Avg Score</p>
              <p className="text-2xl font-bold">72</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
              <Zap className="h-5 w-5 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Qualification Rate</p>
              <p className="text-2xl font-bold">35%</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Target className="h-5 w-5 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Handoff Ready</p>
              <p className="text-2xl font-bold">8</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <ArrowUpRight className="h-5 w-5 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-12 gap-6 flex-1 min-h-0">
        {/* Left: Lead Feed */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-4">
           <Card className="flex-1 overflow-hidden flex flex-col">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                 <div>
                    <CardTitle className="text-lg">Lead Feed</CardTitle>
                    <CardDescription>Real-time queue of incoming opportunities.</CardDescription>
                 </div>
                 <Badge variant="secondary" className="bg-primary/5 text-primary border-primary/10">
                   <Clock className="h-3 w-3 mr-1" /> Live Syncing
                 </Badge>
              </CardHeader>
              <div className="flex-1 overflow-auto">
                 <table className="w-full text-sm">
                    <thead className="bg-muted/40 text-xs uppercase text-muted-foreground sticky top-0 z-10">
                       <tr>
                          <th className="p-4 text-left">Entity</th>
                          <th className="p-4 text-left">Source / Campaign</th>
                          <th className="p-4 text-left">Intelligence</th>
                          <th className="p-4 text-left">Status</th>
                          <th className="p-4 text-right">Actions</th>
                       </tr>
                    </thead>
                    <tbody>
                       {filtered.map((lead) => (
                         <tr key={lead.id} className="border-t hover:bg-muted/30 transition-colors group">
                            <td className="p-4">
                               <div className="flex items-center gap-3">
                                  <Avatar className="h-8 w-8 rounded-lg">
                                     <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                                        {lead.companyName[0]}{lead.contactName[0]}
                                     </AvatarFallback>
                                  </Avatar>
                                  <div>
                                     <div className="font-semibold flex items-center gap-1">
                                        {lead.companyName}
                                        <Link to={`/core/marketing/customer-360?id=${lead.id}`}>
                                          <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </Link>
                                     </div>
                                     <div className="text-xs text-muted-foreground">{lead.contactName}</div>
                                  </div>
                               </div>
                            </td>
                            <td className="p-4">
                               <div className="flex flex-col gap-1">
                                  <Badge variant="outline" className="text-[10px] w-fit font-bold">{lead.source}</Badge>
                                  <span className="text-[10px] text-muted-foreground truncate max-w-[150px]">
                                     {campaigns.find(c => c.id === lead.campaignId)?.name || "Direct Lead"}
                                  </span>
                               </div>
                            </td>
                            <td className="p-4">
                               <div className="flex items-center gap-3">
                                  <div className={cn("px-2 py-0.5 rounded font-bold text-xs", getScoreColor(lead.score))}>
                                     {lead.score}
                                  </div>
                                  <div className="flex flex-col gap-0.5 min-w-[80px]">
                                     <div className="flex justify-between text-[10px] font-bold uppercase">
                                        <span>Intent</span>
                                        <span className={lead.intent === 'HIGH' ? 'text-green-500' : 'text-muted-foreground'}>{lead.intent}</span>
                                     </div>
                                     <Progress value={lead.score} className="h-1" />
                                  </div>
                               </div>
                            </td>
                            <td className="p-4">
                               <Badge className={cn(
                                 "text-[10px] font-bold",
                                 lead.status === 'HANDOFF_READY' ? "bg-green-500/10 text-green-500" : 
                                 lead.status === 'QUALIFIED' ? "bg-blue-500/10 text-blue-500" : "bg-muted text-muted-foreground"
                               )}>
                                  {lead.status.replace('_', ' ')}
                               </Badge>
                            </td>
                            <td className="p-4 text-right">
                               <div className="flex justify-end gap-2">
                                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={async () => {
                                     await marketingService.markLeadHandoffReady(session.tenant_id, session, lead.id);
                                     refresh();
                                  }}>
                                     <CheckCircle2 className="h-4 w-4 text-green-500" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-8 w-8">
                                     <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                               </div>
                            </td>
                         </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </Card>
        </div>

        {/* Right: Manual Capture & Insights */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
           <Card>
              <CardHeader>
                 <CardTitle className="text-lg">Manual Capture</CardTitle>
                 <CardDescription>Record an offline or referral lead.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-xs font-bold uppercase text-muted-foreground">Company</label>
                       <Input placeholder="Acme Inc." value={companyName} onChange={e => setCompanyName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-bold uppercase text-muted-foreground">Contact</label>
                       <Input placeholder="John Doe" value={contactName} onChange={e => setContactName(e.target.value)} />
                    </div>
                 </div>
                 <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Email Address</label>
                    <Input placeholder="john@example.com" value={email} onChange={e => setEmail(e.target.value)} />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-xs font-bold uppercase text-muted-foreground">Source</label>
                       <Select value={source} onValueChange={(v: any) => setSource(v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                             {SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                       </Select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-bold uppercase text-muted-foreground">Industry</label>
                       <Select value={industry} onValueChange={setIndustry}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                             <SelectItem value="Retail">Retail</SelectItem>
                             <SelectItem value="Technology">Technology</SelectItem>
                             <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                          </SelectContent>
                       </Select>
                    </div>
                 </div>
                 <Button className="w-full" onClick={async () => {
                    if (!companyName || !contactName) return;
                    await marketingService.captureLead(session.tenant_id, session, {
                      source,
                      companyName,
                      contactName,
                      email,
                      campaignId,
                      industry,
                      employeeBand,
                    });
                    setCompanyName("");
                    setContactName("");
                    setEmail("");
                    refresh();
                 }}>
                    Capture & Score
                 </Button>
              </CardContent>
           </Card>

           <Card className="bg-primary/5 border-primary/10">
              <CardHeader>
                 <CardTitle className="text-sm font-bold uppercase text-primary">Source Attribution</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                 {[
                   { name: 'Google Ads', val: 45, color: 'bg-blue-500' },
                   { name: 'Landing Page', val: 30, color: 'bg-green-500' },
                   { name: 'Webinars', val: 15, color: 'bg-purple-500' },
                   { name: 'Others', val: 10, color: 'bg-muted' }
                 ].map(item => (
                   <div key={item.name} className="space-y-1">
                      <div className="flex justify-between text-xs font-medium">
                         <span>{item.name}</span>
                         <span>{item.val}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-background rounded-full overflow-hidden">
                         <div className={cn("h-full", item.color)} style={{ width: `${item.val}%` }} />
                      </div>
                   </div>
                 ))}
              </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}
