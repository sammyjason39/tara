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
  ArrowRight
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
import type { MarketingCampaign } from "@/core/types/marketing/marketing";
import { cn } from "@/lib/utils";

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
  
  // Form State
  const [name, setName] = useState("");
  const [objective, setObjective] = useState<MarketingCampaign["objective"]>("LEAD_GENERATION");
  const [budget, setBudget] = useState("50000");
  const [startDate, setStartDate] = useState("2026-06-01");
  const [endDate, setEndDate] = useState("2026-06-30");
  const [audience, setAudience] = useState("");
  
  const [selectedCampaign, setSelectedCampaign] = useState<MarketingCampaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);

  const refresh = useCallback(async () => {
    try {
      const c = await marketingService.listCampaigns(session.tenant_id, session);
      setCampaigns(c);
    } catch (err) {
      console.error("Failed to fetch campaigns:", err);
    } finally {
      setLoading(false);
    }
  }, [session.tenant_id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filtered = useMemo(
    () =>
      campaigns.filter((item) =>
        search
          ? `${item.name} ${item.objective} ${item.status}`
              .toLowerCase()
              .includes(search.toLowerCase())
          : true,
      ),
    [campaigns, search],
  );

  const handleCreateCampaign = async () => {
    if (!name) return;
    try {
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
      refresh();
    } catch (err) {
      console.error("Failed to create campaign:", err);
    }
  };

  return (
    <div className="flex h-full flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Campaign Orchestrator</h1>
          <p className="text-muted-foreground">Strategic governance and channel performance hub.</p>
        </div>
        <div className="flex gap-2">
           <div className="relative mr-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input 
              placeholder="Search campaigns..." 
              className="pl-9 min-w-[250px]"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button onClick={() => setIsWizardOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Campaign
          </Button>
        </div>
      </div>

      {/* Quick Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-primary/5 border-primary/10">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Megaphone className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Active</p>
              <p className="text-2xl font-bold">{campaigns.filter(c => c.status === 'ACTIVE').length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Avg ROI</p>
              <p className="text-2xl font-bold">4.2x</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Budget Utilization</p>
              <p className="text-2xl font-bold">68%</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-orange-500/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Lead Velocity</p>
              <p className="text-2xl font-bold">+12%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Registry */}
      <Tabs defaultValue="all" className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="all">All Campaigns</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="draft">Drafts</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
          <div className="flex bg-muted p-1 rounded-lg">
             <Button 
               variant={view === "grid" ? "secondary" : "ghost"} 
               size="icon" 
               className="h-8 w-8"
               onClick={() => setView("grid")}
             >
               <LayoutGrid className="h-4 w-4" />
             </Button>
             <Button 
               variant={view === "list" ? "secondary" : "ghost"} 
               size="icon" 
               className="h-8 w-8"
               onClick={() => setView("list")}
             >
               <ListIcon className="h-4 w-4" />
             </Button>
          </div>
        </div>

        <TabsContent value="all" className="mt-0">
          {view === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((campaign) => (
                <Card key={campaign.id} className="group hover:shadow-md transition-all border-2 hover:border-primary/20">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <Badge variant="outline" className="mb-2 text-[10px] uppercase font-bold">
                        {campaign.objective.replace('_', ' ')}
                      </Badge>
                      <Badge className={cn(
                        "text-[10px] font-bold",
                        campaign.status === 'ACTIVE' ? "bg-green-500/10 text-green-500" : "bg-muted text-muted-foreground"
                      )}>
                        {campaign.status}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg group-hover:text-primary transition-colors">{campaign.name}</CardTitle>
                    <CardDescription className="line-clamp-1">{campaign.audience}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Budget</span>
                      <span className="font-bold">{campaign.budget.toLocaleString()} {campaign.currency}</span>
                    </div>
                    <div className="space-y-1">
                       <div className="flex justify-between text-[10px] uppercase font-bold text-muted-foreground">
                          <span>Spend</span>
                          <span>72%</span>
                       </div>
                       <Progress value={72} className="h-1.5" />
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {campaign.channelMix.slice(0, 3).map(ch => (
                        <Badge key={ch} variant="secondary" className="text-[9px] py-0">{ch}</Badge>
                      ))}
                      {campaign.channelMix.length > 3 && (
                        <Badge variant="secondary" className="text-[9px] py-0">+{campaign.channelMix.length - 3}</Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t">
                       <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                              {campaign.ownerName.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-muted-foreground">{campaign.ownerName}</span>
                       </div>
                       <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => setSelectedCampaign(campaign)}>
                         Details <ChevronRight className="ml-1 h-3 w-3" />
                       </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="p-4 text-left font-bold">Campaign</th>
                      <th className="p-4 text-left font-bold">Objective</th>
                      <th className="p-4 text-left font-bold">Budget</th>
                      <th className="p-4 text-left font-bold">Performance</th>
                      <th className="p-4 text-left font-bold">Status</th>
                      <th className="p-4 text-right font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((campaign) => (
                      <tr key={campaign.id} className="border-t hover:bg-muted/30 transition-colors">
                        <td className="p-4">
                          <div className="font-semibold">{campaign.name}</div>
                          <div className="text-xs text-muted-foreground">{campaign.ownerName}</div>
                        </td>
                        <td className="p-4">
                          <Badge variant="outline" className="text-[10px]">{campaign.objective}</Badge>
                        </td>
                        <td className="p-4">
                          <div className="font-bold">{campaign.budget.toLocaleString()} {campaign.currency}</div>
                        </td>
                        <td className="p-4 w-[200px]">
                           <div className="flex items-center gap-2">
                             <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-primary w-[45%]" />
                             </div>
                             <span className="text-xs font-bold">45%</span>
                           </div>
                        </td>
                        <td className="p-4">
                          <Badge variant={campaign.status === 'ACTIVE' ? 'secondary' : 'outline'}>
                            {campaign.status}
                          </Badge>
                        </td>
                        <td className="p-4 text-right">
                          <Button variant="ghost" size="icon" onClick={() => setSelectedCampaign(campaign)}>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Creation Wizard */}
      <Dialog open={isWizardOpen} onOpenChange={setIsWizardOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Growth Campaign</DialogTitle>
            <DialogDescription>
              Step {wizardStep} of 3: {wizardStep === 1 ? "Strategic Context" : wizardStep === 2 ? "Audience & Channels" : "Budget & Timeline"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="flex gap-1 mb-6">
              {[1, 2, 3].map(s => (
                <div key={s} className={cn(
                  "h-1.5 flex-1 rounded-full",
                  s <= wizardStep ? "bg-primary" : "bg-muted"
                )} />
              ))}
            </div>

            {wizardStep === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Campaign Name</label>
                  <Input 
                    placeholder="e.g. Q4 Enterprise Expansion" 
                    value={name}
                    onChange={e => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Primary Objective</label>
                  <Select value={objective} onValueChange={(v: any) => setObjective(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OBJECTIVES.map(obj => (
                        <SelectItem key={obj} value={obj}>{obj.replace('_', ' ')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {wizardStep === 2 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Target Audience</label>
                  <Input 
                    placeholder="e.g. SaaS Decision Makers, HR Leaders" 
                    value={audience}
                    onChange={e => setAudience(e.target.value)}
                  />
                </div>
                <div className="p-3 bg-primary/5 border border-primary/10 rounded-lg">
                   <p className="text-xs font-bold text-primary flex items-center gap-1.5 mb-2">
                     <Zap className="h-3 w-3" /> Recommended Channel Mix
                   </p>
                   <div className="flex flex-wrap gap-2">
                      {CHANNEL_PRESETS[objective].map(ch => (
                        <Badge key={ch} variant="secondary" className="text-[10px]">{ch}</Badge>
                      ))}
                   </div>
                </div>
              </div>
            )}

            {wizardStep === 3 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Total Budget</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                      <Input 
                        className="pl-8" 
                        type="number" 
                        value={budget}
                        onChange={e => setBudget(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Currency</label>
                    <Select defaultValue="USD">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Start Date</label>
                    <Input 
                      type="date" 
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">End Date</label>
                    <Input 
                      type="date" 
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            {wizardStep > 1 && (
              <Button variant="ghost" onClick={() => setWizardStep(s => s - 1)}>Back</Button>
            )}
            {wizardStep < 3 ? (
              <Button onClick={() => setWizardStep(s => s + 1)}>
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleCreateCampaign}>Launch Campaign</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!selectedCampaign} onOpenChange={() => setSelectedCampaign(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
           {selectedCampaign && (
             <div className="grid grid-cols-12 h-[500px]">
                <div className="col-span-4 bg-muted p-6 border-r flex flex-col justify-between">
                   <div>
                      <Badge className="mb-4">{selectedCampaign.status}</Badge>
                      <h2 className="text-2xl font-bold mb-2">{selectedCampaign.name}</h2>
                      <p className="text-sm text-muted-foreground mb-6">{selectedCampaign.audience}</p>
                      
                      <div className="space-y-4">
                         <div className="flex items-center gap-3">
                            <Target className="h-4 w-4 text-primary" />
                            <span className="text-xs font-semibold">{selectedCampaign.objective.replace('_', ' ')}</span>
                         </div>
                         <div className="flex items-center gap-3">
                            <Calendar className="h-4 w-4 text-primary" />
                            <span className="text-xs">{selectedCampaign.startDate} — {selectedCampaign.endDate}</span>
                         </div>
                         <div className="flex items-center gap-3">
                            <Layers className="h-4 w-4 text-primary" />
                            <div className="flex gap-1 flex-wrap">
                               {selectedCampaign.channelMix.map(ch => (
                                 <Badge key={ch} variant="outline" className="text-[8px] px-1">{ch}</Badge>
                               ))}
                            </div>
                         </div>
                      </div>
                   </div>
                   
                   <div className="bg-background/50 p-4 rounded-xl border">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Budget Efficiency</p>
                      <p className="text-xl font-bold">4.8x ROI</p>
                      <div className="mt-2 h-1 w-full bg-muted rounded-full">
                         <div className="h-full bg-green-500 w-[85%]" />
                      </div>
                   </div>
                </div>
                
                <div className="col-span-8 flex flex-col">
                   <div className="p-6 border-b flex items-center justify-between">
                      <div className="flex gap-4">
                         <div className="text-center">
                            <p className="text-[10px] uppercase text-muted-foreground font-bold">Total Budget</p>
                            <p className="text-lg font-bold">${selectedCampaign.budget.toLocaleString()}</p>
                         </div>
                         <Separator orientation="vertical" className="h-8" />
                         <div className="text-center">
                            <p className="text-[10px] uppercase text-muted-foreground font-bold">Spend</p>
                            <p className="text-lg font-bold">$12,450</p>
                         </div>
                         <Separator orientation="vertical" className="h-8" />
                         <div className="text-center">
                            <p className="text-[10px] uppercase text-muted-foreground font-bold">Leads</p>
                            <p className="text-lg font-bold">428</p>
                         </div>
                      </div>
                      <div className="flex gap-2">
                         <Button variant="outline" size="sm" onClick={async () => {
                            await marketingService.updateCampaignStatus(session.tenant_id, session, selectedCampaign.id, "ACTIVE");
                            refresh();
                            setSelectedCampaign(null);
                         }}>Activate</Button>
                         <Button size="sm" variant="destructive">Pause</Button>
                      </div>
                   </div>
                   
                   <ScrollArea className="flex-1 p-6">
                      <div className="space-y-6">
                         <div className="grid grid-cols-2 gap-4">
                            <Card className="shadow-none">
                               <CardHeader className="p-4">
                                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                                     <Globe className="h-4 w-4 text-blue-500" /> Web Traffic
                                  </CardTitle>
                               </CardHeader>
                               <CardContent className="p-4 pt-0">
                                  <p className="text-2xl font-bold">12.5k</p>
                                  <p className="text-xs text-green-500">+8.4% vs last week</p>
                               </CardContent>
                            </Card>
                            <Card className="shadow-none">
                               <CardHeader className="p-4">
                                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                                     <Zap className="h-4 w-4 text-yellow-500" /> Conversion
                                  </CardTitle>
                               </CardHeader>
                               <CardContent className="p-4 pt-0">
                                  <p className="text-2xl font-bold">3.2%</p>
                                  <p className="text-xs text-muted-foreground">Standard for this channel</p>
                               </CardContent>
                            </Card>
                         </div>
                         
                         <div className="space-y-4">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Recent Activity</h3>
                            {[1, 2, 3].map(i => (
                              <div key={i} className="flex gap-4 items-start">
                                 <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                                    <Zap className="h-4 w-4" />
                                 </div>
                                 <div className="flex-1 pb-4 border-b last:border-0">
                                    <p className="text-sm font-medium">New lead captured from Google Ads</p>
                                    <p className="text-xs text-muted-foreground">2 hours ago • Enterprise Segment</p>
                                 </div>
                              </div>
                            ))}
                         </div>
                      </div>
                   </ScrollArea>
                   
                   <div className="p-4 border-t flex justify-end">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedCampaign(null)}>Close Overlay</Button>
                   </div>
                </div>
             </div>
           )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Separator({ orientation = "horizontal", className }: { orientation?: "horizontal" | "vertical", className?: string }) {
  return (
    <div className={cn(
      "bg-border",
      orientation === "horizontal" ? "h-px w-full" : "w-px h-full",
      className
    )} />
  );
}
