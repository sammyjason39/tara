import React, { useState, useEffect } from "react";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { 
  Tag, 
  Zap, 
  Percent, 
  ShieldCheck, 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  BarChart3, 
  Calendar, 
  ChevronRight, 
  Plus, 
  Search, 
  Trash2,
  Lock,
  Calculator,
  RefreshCw
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { retailService } from "@/core/services/retail/retailService";
import { useSession } from "@/core/security/session";
import type { RetailPromotion } from "@/core/types/retail/retail";

const PricingPromoDesk = () => {
  const session = useSession();
  const [activeTab, setActiveTab] = useState("CAMPAIGNS");
  const [promotions, setPromotions] = useState<RetailPromotion[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = retailService.listPromotions(session.tenantId);
        setPromotions(data);
      } catch (error) {
        console.error("Failed to fetch promotions", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [session.tenantId]);

  const handleCreateProposal = async () => {
    setIsLoading(true);
    try {
      const newPromo: RetailPromotion = {
        id: `PRM-${Math.floor(Math.random() * 1000)}`,
        title: "New Flash Sale Proposal",
        type: "percentage",
        value: 20,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 86400000).toISOString(),
        status: "draft",
        target: "category",
        tenantId: session.tenantId!,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await retailService.updatePromotion(session.tenantId!, session, newPromo);
      setPromotions(prev => [newPromo, ...prev]);
      toast({ title: "Proposal Created", description: "A new pricing proposal has been logged for review." });
    } catch (error: any) {
      console.error("Failed to create proposal", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePromoClick = (promo: RetailPromotion) => {
    toast({ title: "Campaign Details", description: `Opening analytics for ${promo.title}` });
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Pricing & Promotion Desk" 
        subtitle="Tactical pricing governance • Campaign ROI estimation • Approval workflows"
      />
      
      <WorkspacePanel>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
           <Card className="shadow-lg border-slate-200 hover:border-blue-200 transition-all border-l-4 border-l-blue-600">
             <CardContent className="p-6">
               <div className="flex justify-between items-start mb-4">
                 <div className="bg-blue-50 p-2 rounded-xl text-blue-600">
                   <Percent className="w-5 h-5" />
                 </div>
                 <Badge className="bg-slate-100 text-slate-600 border-none font-black italic text-[9px]">LIVE</Badge>
               </div>
               <div className="text-sm font-black text-slate-400 uppercase tracking-widest mb-1">Active Promos</div>
               <div className="text-3xl font-black italic text-slate-900 tracking-tighter">
                 {promotions.filter(p => p.status === 'active').length} Active
               </div>
               <p className="text-[10px] font-bold text-slate-400 mt-2 italic flex items-center gap-1">
                 <TrendingUp className="w-3 h-3 text-emerald-500" /> +15.2% Sales Volume
               </p>
             </CardContent>
           </Card>

           <Card className="shadow-lg border-slate-200 hover:border-amber-200 transition-all border-l-4 border-l-amber-500">
             <CardContent className="p-6">
               <div className="flex justify-between items-start mb-4">
                 <div className="bg-amber-50 p-2 rounded-xl text-amber-600">
                   <Zap className="w-5 h-5" />
                 </div>
                 <Badge variant="destructive" className="border-none font-black italic text-[9px]">PENDING</Badge>
               </div>
               <div className="text-sm font-black text-slate-400 uppercase tracking-widest mb-1">Awaiting Review</div>
               <div className="text-3xl font-black italic text-slate-900 tracking-tighter">4 Requests</div>
               <p className="text-[10px] font-bold text-slate-400 mt-2 italic tracking-tighter uppercase">High Urgency: 1 Flash Sale</p>
             </CardContent>
           </Card>

           <Card className="shadow-lg border-slate-200 hover:border-indigo-200 transition-all border-l-4 border-l-indigo-600">
             <CardContent className="p-6">
               <div className="flex justify-between items-start mb-4">
                 <div className="bg-indigo-50 p-2 rounded-xl text-indigo-600">
                   <BarChart3 className="w-5 h-5" />
                 </div>
                 <Badge className="bg-indigo-100 text-indigo-700 border-none font-black italic text-[9px]">PROJECTED</Badge>
               </div>
               <div className="text-sm font-black text-slate-400 uppercase tracking-widest mb-1">Gross Margin Impact</div>
               <div className="text-3xl font-black italic text-slate-900 tracking-tighter">-2.4%</div>
               <p className="text-[10px] font-bold text-slate-400 mt-2 italic tracking-tighter uppercase">Trade-off for Volume</p>
             </CardContent>
           </Card>

           <Card className="shadow-lg border-slate-200 hover:border-emerald-200 transition-all border-l-4 border-l-emerald-600">
             <CardContent className="p-6">
               <div className="flex justify-between items-start mb-4">
                 <div className="bg-emerald-50 p-2 rounded-xl text-emerald-600">
                   <ShieldCheck className="w-5 h-5" />
                 </div>
                 <Badge className="bg-emerald-100 text-emerald-700 border-none font-black italic text-[9px]">ENFORCED</Badge>
               </div>
               <div className="text-sm font-black text-slate-400 uppercase tracking-widest mb-1">Governance Drift</div>
               <div className="text-3xl font-black italic text-slate-900 tracking-tighter">0.0%</div>
               <p className="text-[10px] font-bold text-slate-400 mt-2 italic">No un-authorized overrides today</p>
             </CardContent>
           </Card>
        </div>

        <div className="flex items-center gap-4 mb-8 bg-slate-50 p-4 rounded-3xl border border-slate-200">
           <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                className="pl-12 h-14 bg-white border-slate-200 rounded-2xl text-sm font-bold italic placeholder:text-slate-300 focus-visible:ring-blue-500 shadow-sm" 
                placeholder="Search Active Coupons, Flash Sales, or SKU Overrides..."
              />
           </div>
            <Button 
              className="h-14 px-8 rounded-2xl gap-2 bg-slate-900 hover:bg-slate-800 font-black italic shadow-xl"
              onClick={handleCreateProposal}
            >
               <Plus className="w-5 h-5" /> Create New Proposal
            </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           <div className="lg:col-span-2 space-y-8">
              <Card className="shadow-xl border-slate-200 rounded-[2.5rem] overflow-hidden">
                 <CardHeader className="bg-slate-900 text-white p-8">
                    <CardTitle className="text-xl font-black italic tracking-tighter flex items-center gap-2">
                       <Tag className="w-6 h-6 text-blue-400" />
                       ACTIVE CAMPAIGNS & DEALS
                    </CardTitle>
                 </CardHeader>
                 <CardContent className="p-8 space-y-6">
                    {isLoading ? (
                      <div className="flex flex-col items-center justify-center p-12 space-y-4">
                        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        <div className="text-slate-400 font-black italic uppercase text-xs tracking-widest">Loading Campaigns...</div>
                      </div>
                    ) : promotions.length > 0 ? (
                      promotions.map((promo) => (
                        <div 
                          key={promo.id} 
                          onClick={() => handlePromoClick(promo)}
                          className="group p-6 rounded-[2rem] bg-slate-50 border border-slate-100 hover:border-blue-200 hover:bg-blue-50/20 transition-all cursor-pointer"
                        >
                           <div className="flex justify-between items-start mb-4">
                              <div className="flex items-center gap-4">
                                 <div className="w-14 h-14 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-blue-600 shadow-sm group-hover:scale-110 transition-transform">
                                    <Percent className="w-6 h-6" />
                                 </div>
                                 <div>
                                    <div className="text-sm font-black italic tracking-tight text-slate-900">{promo.title}</div>
                                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{promo.type} • {promo.target || "All Grocery"}</div>
                                 </div>
                              </div>
                              <div className="text-right">
                                 <div className="text-2xl font-black italic text-blue-600 tracking-tighter">
                                   {promo.type === 'percentage' ? `${promo.value}%` : `Rp ${promo.value.toLocaleString()}`}
                                 </div>
                                 <Badge className={`${promo.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'} border-none font-black italic text-[8px] tracking-widest uppercase`}>{promo.status}</Badge>
                              </div>
                           </div>
                           <Separator className="bg-slate-200 opacity-50" />
                           <div className="flex justify-between items-center mt-4">
                              <div className="text-[10px] font-black italic text-slate-500 uppercase flex items-center gap-1">
                                 <Clock className="w-3 h-3 text-slate-400" /> Validity: <span className="text-slate-600">{new Date(promo.startDate).toLocaleDateString()} - {new Date(promo.endDate).toLocaleDateString()}</span>
                              </div>
                              <Button variant="ghost" size="sm" className="h-8 text-[10px] font-black uppercase text-blue-600 gap-2 italic hover:bg-blue-100 rounded-xl">
                                 Audit Logs <ChevronRight className="w-3 h-3" />
                              </Button>
                           </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center p-12 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                        <div className="text-slate-400 font-black italic uppercase text-sm tracking-widest">No Active Campaigns Found</div>
                      </div>
                    )}
                 </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <Card className="shadow-lg border-amber-100 bg-amber-50/20 rounded-3xl overflow-hidden group">
                    <CardHeader>
                       <CardTitle className="text-[10px] font-black uppercase tracking-widest text-amber-900 italic">Immediate Action Required</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                       <div className="p-4 rounded-2xl bg-white border border-amber-200 shadow-sm">
                          <div className="text-xs font-black italic mb-1 flex items-center gap-2">
                             <TrendingDown className="w-4 h-4 text-red-500" /> Category Loss-Leader Alert
                          </div>
                          <p className="text-[10px] text-slate-500 font-medium leading-relaxed italic">"Imported Chocolates" margin fell below 5%. Automatic markdown triggered.</p>
                       </div>
                       <Button className="w-full h-12 bg-amber-600 hover:bg-amber-700 text-white font-black italic uppercase tracking-widest shadow-lg shadow-amber-900/10 gap-2">
                          REVIEW MARKDOWNS
                       </Button>
                    </CardContent>
                 </Card>

                 <Card className="shadow-lg border-indigo-100 bg-indigo-50/20 rounded-3xl overflow-hidden group">
                    <CardHeader>
                       <CardTitle className="text-[10px] font-black uppercase tracking-widest text-indigo-900 italic">Campaign ROI Engine</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                       <div className="space-y-2">
                          <div className="flex justify-between text-[10px] font-black italic uppercase tracking-widest text-indigo-600">
                             <span>Budget Utilization</span>
                             <span>72%</span>
                          </div>
                          <Progress value={72} className="h-2 bg-slate-200" />
                       </div>
                       <Button variant="outline" className="w-full h-12 border-indigo-200 text-indigo-700 hover:bg-indigo-100 font-black italic uppercase text-[10px] tracking-widest rounded-2xl">
                          VIEW IMPACT HEATMAP
                       </Button>
                    </CardContent>
                 </Card>
              </div>
           </div>

           <div className="space-y-8">
              <Card className="bg-slate-900 text-white shadow-2xl rounded-[3rem] overflow-hidden relative">
                 <div className="absolute top-0 right-0 p-8 opacity-10">
                    <ShieldCheck className="w-24 h-24" />
                 </div>
                 <CardHeader className="p-8 pb-0">
                   <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 italic">Governance Vault</CardTitle>
                 </CardHeader>
                 <CardContent className="p-8 space-y-8">
                    <div className="relative pl-8 border-l-2 border-slate-700 space-y-10">
                       <div className="relative">
                          <div className="absolute -left-[41px] top-0 w-6 h-6 rounded-full bg-blue-500 border-4 border-slate-900 shadow-lg shadow-blue-500/20 flex items-center justify-center">
                             <Calculator className="w-2.5 h-2.5 text-white" />
                          </div>
                          <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1 italic">Phase 1: MAKER</div>
                          <div className="text-sm font-black italic">Store Pricing Specialist</div>
                          <div className="text-[9px] text-slate-500 mt-1 uppercase font-bold tracking-tighter">Drafted Proposal: PRIC-9921</div>
                       </div>
                       <div className="relative">
                          <div className="absolute -left-[41px] top-0 w-6 h-6 rounded-full bg-amber-500 border-4 border-slate-900 animate-pulse">
                             <Search className="w-2.5 h-2.5 text-white" />
                          </div>
                          <div className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1 italic">Phase 2: CHECKER</div>
                          <div className="text-sm font-black italic">Regional Marketing Manager</div>
                          <div className="text-[9px] text-amber-500/50 mt-1 uppercase font-bold tracking-tighter italic">Awaiting Compliance Review</div>
                       </div>
                       <div className="relative">
                          <div className="absolute -left-[41px] top-0 w-6 h-6 rounded-full bg-slate-700 border-4 border-slate-900">
                             <Lock className="w-2.5 h-2.5 text-white" />
                          </div>
                          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 italic">Phase 3: FINALIZER</div>
                          <div className="text-sm font-black italic opacity-40">Group Finance HOD</div>
                          <div className="text-[9px] text-slate-700 mt-1 uppercase font-bold tracking-tighter">Pending Phase 2 Approval</div>
                       </div>
                    </div>

                    <Separator className="bg-white/10" />

                    <div className="p-6 rounded-3xl bg-white/5 border border-white/10 space-y-3">
                       <div className="text-[10px] font-black uppercase text-slate-500 tracking-widest italic">Compliance Status</div>
                       <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span className="text-xs font-black italic text-emerald-400">Policy: ROI_POSITIVE_ENFORCED</span>
                       </div>
                    </div>
                 </CardContent>
              </Card>

              <Card className="shadow-lg border-slate-200 rounded-3xl overflow-hidden relative group cursor-pointer hover:border-blue-300 transition-all">
                 <div className="absolute top-0 left-0 w-2 h-full bg-blue-600" />
                 <CardContent className="p-8 space-y-4">
                    <div className="flex items-center gap-4">
                       <div className="bg-blue-50 p-3 rounded-2xl text-blue-600">
                          <Zap className="w-6 h-6" />
                       </div>
                       <div>
                          <div className="text-sm font-black italic text-slate-900 tracking-tight">Smart AI Scheduling</div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Recommended Flash Sale</div>
                       </div>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-relaxed font-medium italic">System detects excess inventory in Fresh Produce. Propose 50% markdown for next 24 hours?</p>
                    <Button className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-black italic h-10 rounded-xl gap-2 transition-all">
                       GENERATE PROPOSAL <ChevronRight className="w-4 h-4" />
                    </Button>
                 </CardContent>
              </Card>
           </div>
        </div>
      </WorkspacePanel>
    </div>
  );
};

export default PricingPromoDesk;
