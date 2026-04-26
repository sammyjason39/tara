import { useCallback, useEffect, useMemo, useState } from "react";
import { 
  Play, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Server, 
  Activity, 
  Cpu, 
  BarChart3, 
  Plus, 
  Search,
  MoreVertical,
  History,
  Zap,
  Globe,
  Radio,
  Settings
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { useSession } from "@/core/security/session";
import { marketingService } from "@/core/services/marketing/marketingService";
import type { CampaignExecutionRun, MarketingCampaign } from "@/core/types/marketing/marketing";
import { cn } from "@/lib/utils";

const CHANNELS: CampaignExecutionRun["channel"][] = [
  "META_ADS",
  "GOOGLE_ADS",
  "EMAIL",
  "WHATSAPP",
  "WEBINAR",
  "LANDING_PAGE",
  "EVENT",
];

export default function ExecutionDesk() {
  const session = useSession();
  const [search, setSearch] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [channel, setChannel] = useState<CampaignExecutionRun["channel"]>("META_ADS");
  const [scheduledAt, setScheduledAt] = useState(
    new Date(Date.now() + 1000 * 60 * 60 * 4).toISOString().slice(0, 16),
  );
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [executions, setExecutions] = useState<CampaignExecutionRun[]>([]);

  const refresh = useCallback(async () => {
    try {
      const [c, e] = await Promise.all([
        marketingService.listCampaigns(session.tenant_id, session),
        marketingService.listExecutions(session.tenant_id, session),
      ]);
      setCampaigns(c);
      setExecutions(e);
      if (c.length > 0 && !campaignId) {
        setCampaignId(c[0].id);
      }
    } catch (err) {
      console.error("Failed to fetch execution desk data:", err);
    } finally {
      setLoading(false);
    }
  }, [session.tenant_id, campaignId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filtered = useMemo(
    () =>
      executions.filter((item) =>
        search
          ? `${item.id} ${item.channel} ${item.status}`.toLowerCase().includes(search.toLowerCase())
          : true,
      ),
    [executions, search],
  );

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">Loading execution runs...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Execution Control</h1>
          <p className="text-muted-foreground">Channel orchestration and real-time execution monitoring.</p>
        </div>
        <div className="flex gap-2">
           <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input 
              placeholder="Search runs..." 
              className="pl-9 min-w-[200px]"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="outline"><Settings className="mr-2 h-4 w-4" /> Config</Button>
        </div>
      </div>

      {/* Channel Health Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
         {[
           { name: 'Meta Ads', status: 'Healthy', color: 'text-green-500', icon: Globe },
           { name: 'Google Ads', status: 'Healthy', color: 'text-green-500', icon: Zap },
           { name: 'Email API', status: 'Warning', color: 'text-yellow-500', icon: Radio },
           { name: 'WhatsApp', status: 'Healthy', color: 'text-green-500', icon: Activity }
         ].map(ch => (
           <Card key={ch.name} className="bg-primary/5 border-primary/10">
              <CardContent className="p-4 flex items-center gap-3">
                 <div className="h-8 w-8 rounded-lg bg-background flex items-center justify-center border shadow-sm">
                    <ch.icon className="h-4 w-4" />
                 </div>
                 <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">{ch.name}</p>
                    <div className="flex items-center gap-1.5">
                       <span className={cn("h-1.5 w-1.5 rounded-full animate-pulse", ch.color.replace('text', 'bg'))} />
                       <span className={cn("text-xs font-bold", ch.color)}>{ch.status}</span>
                    </div>
                 </div>
              </CardContent>
           </Card>
         ))}
      </div>

      <div className="grid grid-cols-12 gap-6 flex-1 min-h-0">
         {/* Left: Execution Queue */}
         <div className="col-span-12 lg:col-span-8 flex flex-col gap-4">
            <Card className="flex-1 overflow-hidden flex flex-col">
               <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
                  <div>
                     <CardTitle className="text-lg">Run History & Queue</CardTitle>
                     <CardDescription>Monitor scheduled and past execution performance.</CardDescription>
                  </div>
                  <Button size="sm" variant="outline" onClick={refresh}><History className="h-4 w-4 mr-2" /> Refresh</Button>
               </CardHeader>
               <div className="flex-1 overflow-auto">
                  <table className="w-full text-sm">
                     <thead className="bg-muted/40 text-[10px] uppercase text-muted-foreground sticky top-0 z-10 font-bold tracking-wider">
                        <tr>
                           <th className="p-4 text-left">Target Campaign</th>
                           <th className="p-4 text-left">Channel</th>
                           <th className="p-4 text-left">Schedule</th>
                           <th className="p-4 text-left">Result</th>
                           <th className="p-4 text-left">Status</th>
                           <th className="p-4 text-right">Actions</th>
                        </tr>
                     </thead>
                     <tbody>
                        {filtered.map((run) => (
                          <tr key={run.id} className="border-t hover:bg-muted/30 transition-colors">
                             <td className="p-4 font-semibold">
                                {campaigns.find(c => c.id === run.campaignId)?.name || "Unknown"}
                                <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{run.id}</div>
                             </td>
                             <td className="p-4">
                                <Badge variant="outline" className="text-[10px] font-bold">{run.channel}</Badge>
                             </td>
                             <td className="p-4">
                                <div className="flex items-center gap-2 text-xs">
                                   <Clock className="h-3 w-3 text-muted-foreground" />
                                   {new Date(run.scheduledAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                </div>
                             </td>
                             <td className="p-4">
                                <div className="flex flex-col gap-1">
                                   <div className="flex justify-between text-[10px] font-bold">
                                      <span>{run.leadsGenerated} Leads</span>
                                      <span>${run.spend.toLocaleString()}</span>
                                   </div>
                                   <Progress value={Math.min(100, (run.leadsGenerated / 50) * 100)} className="h-1" />
                                </div>
                             </td>
                             <td className="p-4">
                                <Badge className={cn(
                                  "text-[10px] font-bold",
                                  run.status === 'COMPLETED' ? "bg-green-500/10 text-green-500 border-green-500/20" :
                                  run.status === 'FAILED' ? "bg-destructive/10 text-destructive border-destructive/20" : "bg-muted text-muted-foreground"
                                )}>
                                   {run.status}
                                </Badge>
                             </td>
                             <td className="p-4 text-right">
                                <div className="flex justify-end gap-2">
                                   <Button size="icon" variant="ghost" className="h-8 w-8" onClick={async () => {
                                      await marketingService.runExecution(session.tenant_id, session, run.id);
                                      refresh();
                                   }}>
                                      <Play className="h-4 w-4 text-primary" />
                                   </Button>
                                   <Button size="icon" variant="ghost" className="h-8 w-8">
                                      <AlertCircle className="h-4 w-4 text-muted-foreground" />
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

         {/* Right: Orchestrator Tools */}
         <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
            <Card>
               <CardHeader>
                  <CardTitle className="text-lg">Orchestrator</CardTitle>
                  <CardDescription>Schedule a new channel execution run.</CardDescription>
               </CardHeader>
               <CardContent className="space-y-4">
                  <div className="space-y-2">
                     <label className="text-xs font-bold uppercase text-muted-foreground">Select Campaign</label>
                     <Select value={campaignId} onValueChange={setCampaignId}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                           {campaigns.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                     </Select>
                  </div>
                  <div className="space-y-2">
                     <label className="text-xs font-bold uppercase text-muted-foreground">Execution Channel</label>
                     <Select value={channel} onValueChange={(v: any) => setChannel(v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                           {CHANNELS.map(ch => <SelectItem key={ch} value={ch}>{ch}</SelectItem>)}
                        </SelectContent>
                     </Select>
                  </div>
                  <div className="space-y-2">
                     <label className="text-xs font-bold uppercase text-muted-foreground">Dispatch Time</label>
                     <Input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} />
                  </div>
                  <Button className="w-full" onClick={async () => {
                     if (!campaignId) return;
                     await marketingService.scheduleExecution(session.tenant_id, session, {
                        campaignId,
                        channel,
                        scheduledAt: new Date(scheduledAt).toISOString(),
                     });
                     refresh();
                  }}>
                     <Cpu className="mr-2 h-4 w-4" />
                     Initialize Run
                  </Button>
               </CardContent>
            </Card>

            <Card className="flex-1 overflow-hidden flex flex-col">
               <CardHeader className="pb-2 border-b">
                  <CardTitle className="text-xs font-bold uppercase flex items-center gap-2">
                     <Server className="h-3 w-3" /> Runtime Logs
                  </CardTitle>
               </CardHeader>
               <ScrollArea className="flex-1 bg-black/95 p-4 font-mono text-[10px]">
                  <div className="space-y-2">
                     <p className="text-blue-400">[SYSTEM] Initializing execution engine v4.2.0</p>
                     <p className="text-green-400">[INFO] All channel gateways confirmed healthy</p>
                     <p className="text-muted-foreground">[IDLE] Waiting for next scheduled dispatch...</p>
                     <p className="text-yellow-400">[WARN] High latency detected on Email API gateway</p>
                     <p className="text-green-400">[SUCCESS] Automated sync with Google Ads completed</p>
                     <div className="flex gap-1 animate-pulse">
                        <span className="w-1 h-3 bg-primary" />
                     </div>
                  </div>
               </ScrollArea>
            </Card>
         </div>
      </div>
    </div>
  );
}
