import { useState, useCallback, useEffect } from "react";
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { 
  Filter, 
  Plus, 
  MoreVertical, 
  Layout, 
  MousePointer2, 
  Target, 
  TrendingUp, 
  ArrowRight,
  Settings,
  Trash2,
  Copy,
  ExternalLink,
  ChevronRight,
  Zap,
  Layers,
  BarChart3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSession } from "@/core/security/session";
import { marketingService } from "@/core/services/marketing/marketingService";
import { cn } from "@/lib/utils";

interface FunnelStep {
  id: string;
  name: string;
  type: "landing" | "checkout" | "upsell" | "thankyou";
  conversionRate: number;
}

interface Funnel {
  id: string;
  name: string;
  steps: FunnelStep[];
  status: "active" | "draft";
}

function SortableStep({ step, index, onRemove }: { step: FunnelStep; index: number; onRemove: (id: string) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} className="relative group">
       <div className="absolute -left-3 top-1/2 -translate-y-1/2 h-8 w-8 bg-background border rounded-full flex items-center justify-center font-bold text-xs shadow-sm z-10 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
          {index + 1}
       </div>
       <Card className="ml-2 hover:border-primary/20 transition-all cursor-default">
          <CardContent className="p-4 flex items-center justify-between">
             <div className="flex items-center gap-4 flex-1" {...listeners}>
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                   {step.type === 'landing' && <Layout className="h-5 w-5 text-blue-500" />}
                   {step.type === 'checkout' && <MousePointer2 className="h-5 w-5 text-green-500" />}
                   {step.type === 'upsell' && <Zap className="h-5 w-5 text-orange-500" />}
                   {step.type === 'thankyou' && <Target className="h-5 w-5 text-purple-500" />}
                </div>
                <div>
                   <p className="font-bold text-sm">{step.name}</p>
                   <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">{step.type}</p>
                </div>
             </div>
             
             <div className="flex items-center gap-6">
                <div className="text-right">
                   <p className="text-[10px] uppercase font-bold text-muted-foreground">Conversion</p>
                   <div className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3 text-green-500" />
                      <span className="text-sm font-bold">{step.conversionRate}%</span>
                   </div>
                </div>
                <div className="flex gap-1">
                   <Button variant="ghost" size="icon" className="h-8 w-8"><Settings className="h-4 w-4" /></Button>
                   <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onRemove(step.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
             </div>
          </CardContent>
       </Card>
       {index < 3 && ( // Mocking only few steps connector
          <div className="h-6 flex justify-center py-1">
             <div className="w-0.5 bg-border h-full relative">
                <ArrowRight className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-3 w-3 rotate-90 text-muted-foreground" />
             </div>
          </div>
       )}
    </div>
  );
}

export default function FunnelBuilderDesk() {
  const session = useSession();
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [selectedFunnel, setSelectedFunnel] = useState<Funnel | null>(null);
  const [loading, setLoading] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const refresh = useCallback(async () => {
    try {
      const f = await marketingService.listFunnels(session.tenant_id, session);
      setFunnels(f as any);
      if (f.length > 0 && !selectedFunnel) {
         setSelectedFunnel(f[0] as any);
      }
    } catch (err) {
      console.error("Failed to fetch funnels:", err);
    } finally {
      setLoading(false);
    }
  }, [session.tenant_id, selectedFunnel]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id && selectedFunnel) {
      const oldIndex = selectedFunnel.steps.findIndex((s) => s.id === active.id);
      const newIndex = selectedFunnel.steps.findIndex((s) => s.id === over.id);
      const newSteps = arrayMove(selectedFunnel.steps, oldIndex, newIndex);
      setSelectedFunnel({ ...selectedFunnel, steps: newSteps });
    }
  };

  const removeStep = (id: string) => {
    if (!selectedFunnel) return;
    const newSteps = selectedFunnel.steps.filter(s => s.id !== id);
    setSelectedFunnel({ ...selectedFunnel, steps: newSteps });
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">Loading funnel orchestrator...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Funnel Orchestrator</h1>
          <p className="text-muted-foreground">Design multi-step conversion paths and A/B test variations.</p>
        </div>
        <div className="flex gap-2">
           <Button variant="outline"><Copy className="mr-2 h-4 w-4" /> Duplicate</Button>
           <Button><Plus className="mr-2 h-4 w-4" /> New Funnel</Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6 flex-1 min-h-0">
        {/* Left: Funnel List */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-4">
           <Card className="flex-1 overflow-hidden flex flex-col">
              <CardHeader className="pb-3 border-b">
                 <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Funnels</CardTitle>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><Filter className="h-4 w-4" /></Button>
                 </div>
              </CardHeader>
              <ScrollArea className="flex-1">
                 <div className="p-0">
                    {funnels.map(f => (
                       <button
                         key={f.id}
                         onClick={() => setSelectedFunnel(f)}
                         className={cn(
                           "w-full flex items-center gap-3 p-4 text-left transition-colors border-b last:border-0",
                           selectedFunnel?.id === f.id ? "bg-muted" : "hover:bg-muted/50"
                         )}
                       >
                          <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center shrink-0">
                             <Layers className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                             <p className="text-sm font-bold truncate">{f.name}</p>
                             <div className="flex items-center gap-2 mt-0.5">
                                <Badge variant="outline" className="text-[9px] py-0">{f.status}</Badge>
                                <span className="text-[10px] text-muted-foreground font-medium">{f.steps?.length || 0} Steps</span>
                             </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                       </button>
                    ))}
                 </div>
              </ScrollArea>
           </Card>
        </div>

        {/* Center: Builder Canvas */}
        <div className="col-span-12 lg:col-span-6 flex flex-col gap-4">
           {selectedFunnel ? (
              <div className="flex-1 flex flex-col gap-4">
                 <Card className="shrink-0 border-primary/20 bg-primary/5">
                    <CardContent className="p-4 flex items-center justify-between">
                       <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
                             <Layout className="h-6 w-6" />
                          </div>
                          <div>
                             <h2 className="text-xl font-bold">{selectedFunnel.name}</h2>
                             <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1"><ExternalLink className="h-3 w-3" /> /f/launch-promo-2024</span>
                                <span className="flex items-center gap-1 text-green-500 font-bold"><CheckCircle2 className="h-3 w-3" /> Published</span>
                             </div>
                          </div>
                       </div>
                       <Button size="sm">Save Changes</Button>
                    </CardContent>
                 </Card>

                 <ScrollArea className="flex-1 pr-4">
                    <div className="p-6 bg-muted/20 rounded-2xl border-2 border-dashed min-h-[400px]">
                       <DndContext 
                         sensors={sensors}
                         collisionDetection={closestCenter}
                         onDragEnd={handleDragEnd}
                       >
                         <SortableContext 
                           items={selectedFunnel.steps.map(s => s.id)}
                           strategy={verticalListSortingStrategy}
                         >
                            <div className="space-y-4">
                               {selectedFunnel.steps.map((step, idx) => (
                                 <SortableStep key={step.id} step={step} index={idx} onRemove={removeStep} />
                               ))}
                               <Button variant="outline" className="w-full border-dashed border-2 py-8 mt-4 flex flex-col gap-2 hover:bg-primary/5 hover:border-primary/20">
                                  <Plus className="h-6 w-6 text-primary" />
                                  <span className="font-bold text-xs uppercase tracking-widest">Add Funnel Step</span>
                               </Button>
                            </div>
                         </SortableContext>
                       </DndContext>
                    </div>
                 </ScrollArea>
              </div>
           ) : (
              <div className="flex-1 flex items-center justify-center border-2 border-dashed rounded-2xl bg-muted/10">
                 <div className="text-center">
                    <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                       <Layers className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-bold">Select a Funnel</h3>
                    <p className="text-sm text-muted-foreground max-w-[300px] mx-auto mt-2">
                       Pick a conversion funnel from the registry to edit its steps and monitor performance.
                    </p>
                 </div>
              </div>
           )}
        </div>

        {/* Right: Insights & Stats */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-6">
           <Card>
              <CardHeader>
                 <CardTitle className="text-sm font-bold uppercase tracking-wider">Funnel Performance</CardTitle>
                 <CardDescription>Aggregate conversion data.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                 <div className="space-y-2">
                    <div className="flex justify-between items-center">
                       <span className="text-xs font-medium text-muted-foreground">Total Visitors</span>
                       <span className="text-sm font-bold">12,482</span>
                    </div>
                    <div className="flex justify-between items-center">
                       <span className="text-xs font-medium text-muted-foreground">Total Conversions</span>
                       <span className="text-sm font-bold text-green-500">842</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t">
                       <span className="text-xs font-bold uppercase">Net Yield</span>
                       <span className="text-lg font-bold text-primary">6.74%</span>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Drop-off Map</p>
                    <div className="space-y-3">
                       {selectedFunnel?.steps.slice(0, -1).map((step, i) => (
                          <div key={step.id} className="space-y-1">
                             <div className="flex justify-between text-[10px] font-medium">
                                <span>Step {i+1} → {i+2}</span>
                                <span className="text-orange-500">-{100 - step.conversionRate}% loss</span>
                             </div>
                             <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-orange-500/50" style={{ width: `${step.conversionRate}%` }} />
                             </div>
                          </div>
                       ))}
                    </div>
                 </div>
              </CardContent>
           </Card>

           <Card className="bg-primary/5 border-primary/10">
              <CardHeader>
                 <CardTitle className="text-xs font-bold uppercase text-primary flex items-center gap-2">
                    <BarChart3 className="h-3 w-3" /> A/B Insights
                 </CardTitle>
              </CardHeader>
              <CardContent>
                 <p className="text-[11px] text-muted-foreground leading-relaxed">
                    "Variation B of the <strong>Landing Page</strong> is outperforming Variation A by <strong>+12.4%</strong> in mobile sessions. Consider switching traffic."
                 </p>
                 <Button variant="link" className="text-[10px] h-auto p-0 mt-2">View Full Experiment Data</Button>
              </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}
