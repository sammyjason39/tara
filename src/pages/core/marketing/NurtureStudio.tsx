import { useCallback, useEffect, useMemo, useState } from "react";
import { 
  Workflow, 
  Play, 
  Pause, 
  Settings2, 
  Plus, 
  Clock, 
  Mail, 
  MessageSquare, 
  Zap, 
  ArrowDown, 
  Trash2,
  Edit2,
  ChevronRight,
  Sparkles,
  Target
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
import { Separator } from "@/components/ui/separator";
import { useSession } from "@/core/security/session";
import { marketingService } from "@/core/services/marketing/marketingService";
import type { NurtureWorkflow } from "@/core/types/marketing/marketing";
import { cn } from "@/lib/utils";

const TRIGGERS: NurtureWorkflow["trigger"][] = [
  "NEW_LEAD",
  "SCORE_BELOW_THRESHOLD",
  "REENGAGEMENT",
];

export default function NurtureStudio() {
  const session = useSession();
  const [selectedWorkflow, setSelectedWorkflow] = useState<NurtureWorkflow | null>(null);
  const [loading, setLoading] = useState(true);
  const [workflows, setWorkflows] = useState<NurtureWorkflow[]>([]);

  const refresh = useCallback(async () => {
    try {
      const w = await marketingService.listWorkflows(session.tenant_id, session);
      setWorkflows(w);
      if (w.length > 0 && !selectedWorkflow) {
         setSelectedWorkflow(w[0]);
      }
    } catch (err) {
      console.error("Failed to fetch nurture workflows:", err);
    } finally {
      setLoading(false);
    }
  }, [session.tenant_id, selectedWorkflow]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">Loading nurture studio...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Automation Studio</h1>
          <p className="text-muted-foreground">Build and orchestrate event-driven growth workflows.</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Rule
        </Button>
      </div>

      <div className="grid grid-cols-12 gap-6 flex-1 min-h-0">
        {/* Left: Rule List */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
           <Card className="flex-1 overflow-hidden flex flex-col">
              <CardHeader className="pb-3 border-b">
                 <CardTitle className="text-lg">Active Automations</CardTitle>
              </CardHeader>
              <ScrollArea className="flex-1">
                 <div className="p-0">
                    {workflows.map((wf) => (
                      <button
                        key={wf.id}
                        onClick={() => setSelectedWorkflow(wf)}
                        className={cn(
                          "w-full flex items-center gap-4 p-4 text-left transition-colors border-b last:border-0",
                          selectedWorkflow?.id === wf.id ? "bg-muted" : "hover:bg-muted/50"
                        )}
                      >
                         <div className={cn(
                           "h-10 w-10 rounded-lg flex items-center justify-center shrink-0 border",
                           wf.status === 'ACTIVE' ? "bg-primary/5 text-primary border-primary/20" : "bg-muted text-muted-foreground"
                         )}>
                            <Zap className="h-5 w-5" />
                         </div>
                         <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                               <p className="text-sm font-bold truncate">{wf.name}</p>
                               <Badge variant={wf.status === 'ACTIVE' ? 'secondary' : 'outline'} className="text-[9px] h-4">
                                 {wf.status}
                               </Badge>
                            </div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-tight font-medium">
                               {wf.trigger.replace('_', ' ')}
                            </p>
                         </div>
                         <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </button>
                    ))}
                 </div>
              </ScrollArea>
           </Card>

           <Card className="bg-primary/5 border-primary/10">
              <CardHeader className="pb-2">
                 <CardTitle className="text-xs font-bold uppercase text-primary flex items-center gap-2">
                    <Sparkles className="h-3 w-3" /> AI Optimization
                 </CardTitle>
              </CardHeader>
              <CardContent>
                 <p className="text-[11px] text-muted-foreground leading-relaxed italic">
                    "{selectedWorkflow?.aiSuggestion || "Select a workflow to see AI-driven performance tips."}"
                 </p>
              </CardContent>
           </Card>
        </div>

        {/* Right: Builder View */}
        <div className="col-span-12 lg:col-span-8 overflow-hidden">
           {selectedWorkflow ? (
             <div className="h-full flex flex-col gap-6">
                <Card className="shrink-0">
                   <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                         <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center border-2 border-primary/20">
                               <Workflow className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                               <h2 className="text-xl font-bold">{selectedWorkflow.name}</h2>
                               <p className="text-xs text-muted-foreground">ID: {selectedWorkflow.id}</p>
                            </div>
                         </div>
                         <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                               <Settings2 className="mr-2 h-4 w-4" />
                               Edit Config
                            </Button>
                            {selectedWorkflow.status === 'ACTIVE' ? (
                               <Button variant="secondary" size="sm" onClick={async () => {
                                  await marketingService.updateWorkflowStatus(session.tenant_id, session, selectedWorkflow.id, "PAUSED");
                                  refresh();
                               }}>
                                  <Pause className="mr-2 h-4 w-4" />
                                  Pause
                               </Button>
                            ) : (
                               <Button size="sm" onClick={async () => {
                                  await marketingService.updateWorkflowStatus(session.tenant_id, session, selectedWorkflow.id, "ACTIVE");
                                  refresh();
                               }}>
                                  <Play className="mr-2 h-4 w-4" />
                                  Activate
                               </Button>
                            )}
                         </div>
                      </div>
                   </CardContent>
                </Card>

                <div className="flex-1 bg-muted/30 rounded-xl border-2 border-dashed flex flex-col items-center overflow-y-auto py-10 gap-6">
                   {/* Trigger Node */}
                   <div className="relative group">
                      <div className="bg-background border-2 border-primary p-4 rounded-xl shadow-lg w-64 text-center z-10 relative">
                         <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">Trigger</p>
                         <p className="font-bold text-sm">{selectedWorkflow.trigger.replace('_', ' ')}</p>
                      </div>
                      <div className="absolute top-full left-1/2 -translate-x-1/2 w-0.5 h-6 bg-primary/30" />
                   </div>

                   {/* Step Nodes */}
                   {selectedWorkflow.steps.map((step, idx) => (
                      <div key={step.id} className="flex flex-col items-center gap-6">
                         <div className="relative group">
                            <div className="bg-background border-2 border-border p-4 rounded-xl shadow-sm w-72 flex gap-4 items-start relative z-10">
                               <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                  {step.channel === 'EMAIL' ? <Mail className="h-5 w-5 text-blue-500" /> : <MessageSquare className="h-5 w-5 text-green-500" />}
                               </div>
                               <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-center mb-1">
                                     <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Step {idx + 1}</p>
                                     <span className="text-[10px] font-medium bg-muted px-1.5 py-0.5 rounded flex items-center gap-1">
                                        <Clock className="h-3 w-3" /> {step.waitHours}h Wait
                                     </span>
                                  </div>
                                  <p className="text-sm font-bold truncate">{step.messageTemplate}</p>
                                  <div className="flex gap-2 mt-2">
                                     <Button variant="ghost" size="icon" className="h-6 w-6"><Edit2 className="h-3 w-3" /></Button>
                                     <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive"><Trash2 className="h-3 w-3" /></Button>
                                  </div>
                               </div>
                            </div>
                            {idx < selectedWorkflow.steps.length - 1 && (
                               <div className="absolute top-full left-1/2 -translate-x-1/2 w-0.5 h-6 bg-border" />
                            )}
                         </div>
                      </div>
                   ))}

                   {/* Add Step Button */}
                   <Button variant="outline" className="border-dashed border-2 h-12 w-12 rounded-full p-0 mt-2">
                      <Plus className="h-5 w-5" />
                   </Button>

                   {/* Goal Node */}
                   <div className="mt-4">
                      <div className="bg-green-500/10 border-2 border-green-500/20 p-4 rounded-xl w-64 text-center">
                         <p className="text-[10px] font-bold text-green-500 uppercase tracking-widest mb-1">Outcome</p>
                         <p className="font-bold text-sm flex items-center justify-center gap-2">
                            <Target className="h-4 w-4" /> Qualification Goal
                         </p>
                      </div>
                   </div>
                </div>
             </div>
           ) : (
             <div className="h-full flex items-center justify-center border-2 border-dashed rounded-xl">
                <div className="text-center">
                   <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                      <Workflow className="h-8 w-8 text-muted-foreground" />
                   </div>
                   <h3 className="text-lg font-bold">No Rule Selected</h3>
                   <p className="text-sm text-muted-foreground max-w-[300px] mx-auto mt-2">
                      Select an automation rule from the sidebar to view and edit its logic flow.
                   </p>
                </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
