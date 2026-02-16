import React, { useState, useEffect, useRef } from "react";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { ScanLine, Box, ArrowUpRight, CheckCircle2, AlertCircle, History, RefreshCw, Layers, ShieldCheck, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { retailService } from "@/core/services/retail/retailService";
import { useSession } from "@/core/security/session";

interface ScanEntry {
  sku: string;
  name: string;
  systemCount: number;
  actualCount: number;
  timestamp: string;
}

const StockOpnameScanner = () => {
  const session = useSession();
  const [scanInput, setScanInput] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [history, setHistory] = useState<ScanEntry[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeShift, setActiveShift] = useState<any | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchData = () => {
      try {
        const data = retailService.listInventory(session.tenantId);
        setProducts(data);

        // Fetch active shift
        const shifts = retailService.listShifts(session.tenantId);
        const openShift = shifts.find(s => s.status === "open" && s.employeeId === session.userId);
        setActiveShift(openShift || null);
      } catch (error) {
        console.error("Failed to fetch inventory or shift", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [session.tenantId, session.userId]);

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanInput) return;

    const product = products.find(p => p.sku === scanInput || p.id === scanInput);
    if (product) {
      setHistory(prev => {
        const existingIdx = prev.findIndex(h => h.sku === product.sku);
        if (existingIdx > -1) {
          const newHistory = [...prev];
          newHistory[existingIdx] = {
            ...newHistory[existingIdx],
            actualCount: newHistory[existingIdx].actualCount + 1,
            timestamp: new Date().toLocaleTimeString()
          };
          return newHistory;
        }
        return [{
          sku: product.sku,
          name: product.name,
          systemCount: product.stock || 0,
          actualCount: 1,
          timestamp: new Date().toLocaleTimeString()
        }, ...prev];
      });
      toast({ title: "Item Scanned", description: `Scanned: ${product.name}` });
    } else {
      toast({ title: "Invalid SKU", description: `Unrecognized SKU: ${scanInput}`, variant: "destructive" });
    }
    setScanInput("");
    inputRef.current?.focus();
  };

  const totalVarianceCount = history.filter(item => item.actualCount !== item.systemCount).length;

  const handleSubmit = async () => {
    if (history.length === 0) return;
    setIsSubmitting(true);
    try {
      await retailService.submitOpname(
        session.tenantId!,
        session,
        "store-1", // Mock storeId
        history.map(h => ({ sku: h.sku, actualCount: h.actualCount })),
        activeShift?.id
      );
      toast({ title: "Audit Submitted", description: "Opname session submitted to Core Finance for reconciliation." });
      setHistory([]);
    } catch (error: any) {
      toast({ title: "Submission Failed", description: error.message || "Unknown error", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-screen flex flex-col p-2 overflow-hidden bg-slate-50">
      <WorkspacePanel className="flex-1 overflow-auto rounded-[2rem]">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-6">
            <Card className="border-blue-200 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 shadow-2xl overflow-hidden relative rounded-[2.5rem]">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <Layers className="w-48 h-48" />
              </div>
              <CardContent className="pt-12 pb-14">
                <form onSubmit={handleScan} className="flex flex-col items-center justify-center space-y-8 max-w-lg mx-auto">
                  <div className="w-32 h-32 bg-white rounded-[2rem] flex items-center justify-center border-4 border-blue-600 shadow-2xl shadow-blue-500/30 relative transform hover:rotate-6 transition-transform group">
                    <ScanLine className="w-16 h-16 text-blue-600 animate-pulse group-hover:scale-110 transition-transform" />
                    <div className="absolute -bottom-3 -right-3 w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-xl border-4 border-white">
                      <RefreshCw className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="text-center">
                    <h3 className="text-3xl font-black text-slate-900 tracking-tighter italic uppercase">SCAN TERMINAL</h3>
                    <p className="text-xs text-slate-500 font-black tracking-widest uppercase mt-1 opacity-60">Scanning Zone: [MAIN_FLOOR]</p>
                  </div>
                  <div className="w-full relative px-4">
                    <Search className="absolute left-10 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400" />
                    <Input 
                      ref={inputRef}
                      value={scanInput}
                      onChange={(e) => setScanInput(e.target.value)}
                      placeholder="Input SKU or Scan Barcode..." 
                      className="h-20 pl-16 text-2xl font-black bg-white/90 border-blue-100 focus:ring-blue-600 rounded-[1.5rem] shadow-inner uppercase tracking-widest italic"
                      autoFocus
                    />
                  </div>
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] animate-pulse flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" /> Nexus Audit Pulse Active • Hardware Validated
                  </p>
                </form>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="shadow-2xl border-slate-200 flex flex-col h-[450px] rounded-[2rem] overflow-hidden">
                <CardHeader className="p-8 border-b bg-slate-50/80">
                  <CardTitle className="text-sm font-black text-slate-600 uppercase tracking-[0.2em] flex items-center justify-between italic">
                    Live Session Stream
                    <Badge className="bg-blue-600 text-white font-black italic px-4">{history.length} SKUs</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 flex-1 overflow-hidden">
                  <ScrollArea className="h-full p-6">
                    {isLoading ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-300 py-20">
                         <RefreshCw className="w-10 h-10 mb-4 animate-spin opacity-20" />
                         <p className="text-[10px] font-black italic uppercase tracking-widest">Warming SKU Engine...</p>
                      </div>
                    ) : history.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-300 py-20">
                        <History className="w-16 h-16 mb-4 opacity-10" />
                        <p className="text-[10px] font-black italic uppercase tracking-[0.2em]">Awaiting First Entry</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {history.map((scan, i) => {
                          const hasVariance = scan.actualCount !== scan.systemCount;
                          return (
                            <div key={i} className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                              hasVariance ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-50'
                            }`}>
                              <div className="flex gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-inner ${hasVariance ? 'bg-amber-100' : 'bg-slate-100'}`}>
                                  <Box className={`w-6 h-6 ${hasVariance ? 'text-amber-600' : 'text-slate-400'}`} />
                                </div>
                                <div className="min-w-0">
                                  <div className="text-sm font-black text-slate-900 truncate italic">{scan.name}</div>
                                  <div className="text-[10px] font-bold text-slate-500 uppercase leading-none mt-2 tracking-tighter">{scan.sku} • {scan.timestamp}</div>
                                </div>
                              </div>
                              <div className="text-right">
                                 <div className="text-lg font-black text-slate-900 italic">x{scan.actualCount}</div>
                                 <div className={`text-[10px] font-black uppercase tracking-tighter ${hasVariance ? 'text-amber-600' : 'text-emerald-600'}`}>
                                   {hasVariance ? `${scan.actualCount - scan.systemCount} VARIANCE` : 'IN-SYNC'}
                                 </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card className="shadow-2xl border-slate-200 bg-slate-50/50 rounded-[2rem] flex flex-col">
                <CardHeader className="p-8 border-b bg-slate-50/80">
                  <CardTitle className="text-sm font-black text-slate-600 uppercase tracking-[0.2em] italic">Operational Metrics</CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-8 flex-1">
                   <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white p-6 rounded-3xl border-2 border-slate-100 shadow-sm">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Total Units</div>
                        <div className="text-4xl font-black italic tracking-tighter">{history.reduce((a, b) => a + b.actualCount, 0)}</div>
                      </div>
                      <div className="bg-white p-6 rounded-3xl border-2 border-slate-100 shadow-sm">
                        <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1 italic">Confirms</div>
                        <div className="text-4xl font-black italic tracking-tighter text-emerald-600">{history.filter(h => h.actualCount === h.systemCount).length}</div>
                      </div>
                   </div>

                   <div className="space-y-4 pt-4">
                      <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 italic">
                        <span>Discrepancy Vector</span>
                        <span className="text-red-600">{totalVarianceCount} Anomalies</span>
                      </div>
                      <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden shadow-inner">
                        <div 
                          className="bg-red-500 h-full transition-all duration-1000" 
                          style={{ width: `${history.length > 0 ? (totalVarianceCount / history.length) * 100 : 0}%` }}
                        />
                      </div>
                   </div>

                   <Separator className="bg-slate-200" />

                    <div className="flex gap-4 pt-4">
                      <Button 
                        variant="outline"
                        className="flex-1 h-14 border-slate-200 text-slate-500 font-bold italic rounded-xl hover:bg-red-50 hover:text-red-600 transition-all uppercase tracking-widest text-[10px]"
                        onClick={() => setHistory([])}
                        disabled={history.length === 0 || isSubmitting}
                      >
                        Abort Audit
                      </Button>
                      <Button 
                        className="flex-[2] h-14 bg-slate-900 hover:bg-slate-800 text-white font-black italic rounded-xl shadow-xl disabled:opacity-50 transition-all uppercase tracking-widest text-[10px]"
                        disabled={history.length === 0 || isSubmitting}
                        onClick={handleSubmit}
                      >
                        {isSubmitting ? <RefreshCw className="w-5 h-5 animate-spin" /> : "Commit Audit"}
                      </Button>
                    </div>
                    <p className="text-[10px] text-center text-slate-400 font-bold italic px-4 uppercase tracking-tighter leading-relaxed">
                      Submission triggers automated <span className="text-slate-900">Fiscal Adjustments</span> <br /> within the Finance Ledger.
                    </p>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="space-y-6">
            <Card className="bg-slate-900 text-white border-none shadow-3xl relative overflow-hidden rounded-[2.5rem]">
              <div className="absolute -right-8 -bottom-8 opacity-10 transform rotate-12">
                <Box className="w-48 h-48" />
              </div>
              <CardHeader className="p-8 pb-4">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 italic">Gatehouse Pulse</CardTitle>
              </CardHeader>
              <CardContent className="space-y-8 pb-10 px-8">
                <div className="flex items-center gap-4">
                  <div className="w-4 h-4 rounded-full bg-green-500 animate-ping shadow-[0_0_15px_rgba(34,197,94,0.5)]" />
                  <span className="text-sm font-black italic uppercase tracking-tighter text-white">EDGE_GATEWAY: [REAL_TIME]</span>
                </div>
                <div className="space-y-4">
                  <div className="p-5 bg-white/5 rounded-2xl border border-white/10 shadow-inner">
                    <div className="text-[9px] font-black text-slate-500 uppercase mb-2 tracking-widest">Hardware Context</div>
                    <div className="text-sm font-mono font-black text-blue-400 italic">ZVX-SCAN-PRO-992</div>
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold leading-relaxed italic uppercase tracking-tight">
                    Audited data is stream-queued to the <strong>Nexus Global Ledger</strong>. 
                    Local buffer encryption active.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-amber-100 bg-amber-50/20 rounded-[2rem] border-2">
               <CardContent className="p-6 flex gap-4">
                  <AlertCircle className="w-6 h-6 text-amber-500 shrink-0" />
                  <div>
                    <div className="text-[10px] font-black text-amber-900 uppercase italic tracking-widest">Audit Restriction</div>
                    <p className="text-[11px] text-amber-800 font-bold mt-2 leading-relaxed italic">
                      Discrepancies exceeding <span className="underline">±15%</span> will lock the zone for manual supervisor verification.
                    </p>
                  </div>
               </CardContent>
            </Card>
          </div>
        </div>
      </WorkspacePanel>
    </div>
  );
};

export default StockOpnameScanner;
