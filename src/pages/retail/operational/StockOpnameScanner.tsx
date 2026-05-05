import React, { useState, useEffect, useRef } from "react";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import {
  ScanLine,
  Box,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  History,
  RefreshCw,
  Layers,
  ShieldCheck,
  Search,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { retailService } from "@/core/services/retail/retailService";
import { useSession } from "@/core/security/session";
import { useRetail } from "../context/RetailContext";
import type { RetailShift, RetailProduct } from "@/core/types/retail/retail";

interface ScanEntry {
  sku: string;
  name: string;
  systemCount: number;
  actualCount: number;
  timestamp: string;
}

const StockOpnameScanner = ({ noShell = false }: { noShell?: boolean }) => {
  const session = useSession();
  const { activeStore, activeChannel, activeShift, isLoading: isContextLoading } = useRetail();
  const [scanInput, setScanInput] = useState("");
  const [products, setProducts] = useState<RetailProduct[]>([]);
  const [history, setHistory] = useState<ScanEntry[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = React.useMemo(() => (path: string) => window.location.href = path, []);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const data = await retailService.listInventory(
          session.tenant_id,
          session,
          { locationId: activeStore?.id || session.location_id }
        );
        setProducts(data);
      } catch (error) {
        console.error("Failed to fetch inventory", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (!isContextLoading && !activeShift) {
       toast({
        title: "Fiscal Gate Active",
        description: "Please initialize a shift before accessing the audit terminal.",
        variant: "destructive",
      });
      window.location.href = "/m/retail/operational/gateway";
      return;
    }

    if (session.tenant_id) fetchData();
  }, [session.tenant_id, session, isContextLoading, activeShift, activeStore?.id]);

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanInput) return;

    const product = products.find(
      (p) => p.sku === scanInput || p.id === scanInput,
    );
    if (product) {
      setHistory((prev) => {
        const existingIdx = prev.findIndex((h) => h.sku === product.sku);
        if (existingIdx > -1) {
          const newHistory = [...prev];
          newHistory[existingIdx] = {
            ...newHistory[existingIdx],
            actualCount: newHistory[existingIdx].actualCount + 1,
            timestamp: new Date().toLocaleTimeString(),
          };
          return newHistory;
        }
        return [
          {
            sku: product.sku,
            name: product.name,
            systemCount: product.stock || 0,
            actualCount: 1,
            timestamp: new Date().toLocaleTimeString(),
          },
          ...prev,
        ];
      });
      toast({ title: "Item Scanned", description: `Scanned: ${product.name}` });
    } else {
      toast({
        title: "Invalid SKU",
        description: `Unrecognized SKU: ${scanInput}`,
        variant: "destructive",
      });
    }
    setScanInput("");
    inputRef.current?.focus();
  };

  const totalVarianceCount = (Array.isArray(history) ? history : []).filter(
    (item) => item.actualCount !== item.systemCount,
  ).length;

  const handleSubmit = async () => {
    if (history.length === 0) return;
    setIsSubmitting(true);
    try {
      await retailService.submitOpname(
        session.tenant_id!,
        session,
        session.location_id || "unassigned",
        (Array.isArray(history) ? history : []).map((h) => ({ sku: h.sku, actualCount: h.actualCount })),
        activeShift?.id,
      );
      toast({
        title: "Audit Submitted",
        description:
          "Opname session submitted to Core Finance for reconciliation.",
      });
      setHistory([]);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast({
        title: "Submission Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const content = (
    <div className="flex-1 flex flex-col gap-8 overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 flex-1 overflow-hidden">
        <div className="lg:col-span-3 flex flex-col gap-8 overflow-hidden">
          <Card className="bg-white/5 backdrop-blur-3xl border-white/10 rounded-[3rem] overflow-hidden shadow-2xl relative">
            <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
              <Layers className="w-64 h-64 text-blue-500" />
            </div>
            <CardContent className="p-16">
              <form
                onSubmit={handleScan}
                className="flex flex-col items-center justify-center space-y-12 max-w-2xl mx-auto"
              >
                <div className="w-40 h-40 bg-blue-600 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-blue-500/30 relative transform hover:scale-105 transition-transform group">
                  <ScanLine className="w-20 h-20 text-white animate-pulse" />
                  <div className="absolute -bottom-4 -right-4 w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-blue-400 shadow-xl border-2 border-white/10">
                    <RefreshCw className="w-6 h-6" />
                  </div>
                </div>
                
                <div className="text-center">
                  <h3 className="text-4xl font-black text-white tracking-tighter italic uppercase">
                    {activeStore?.name || "RETAIL AUDIT TERMINAL"}
                  </h3>
                  <p className="text-[10px] text-blue-500 font-black tracking-[0.4em] uppercase mt-2 italic opacity-80">
                    Scanning Zone: [MAIN_FLOOR] • Hardware Sync Active
                  </p>
                </div>

                <div className="w-full relative group">
                  <Search className="absolute left-8 top-1/2 -translate-y-1/2 w-8 h-8 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                  <Input
                    ref={inputRef}
                    value={scanInput}
                    onChange={(e) => setScanInput(e.target.value)}
                    placeholder="SCAN BARCODE OR INPUT SKU..."
                    className="h-24 pl-20 text-3xl font-black bg-white/5 border-2 border-white/10 focus:border-blue-500/50 rounded-[2rem] shadow-2xl text-white italic uppercase tracking-widest placeholder:text-slate-800 transition-all"
                    autoFocus
                  />
                </div>

                <div className="flex items-center gap-6 px-8 py-4 bg-white/5 rounded-full border border-white/10 backdrop-blur-xl">
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] italic">
                    Zenvix Audit Pulse: <span className="text-emerald-500">NOMINAL</span>
                  </p>
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1 overflow-hidden">
            <Card className="bg-white/5 backdrop-blur-3xl border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col">
              <CardHeader className="p-8 border-b border-white/5 bg-black/20">
                <CardTitle className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center justify-between italic">
                  Live Session Stream
                  <Badge className="bg-blue-600 text-white font-black italic px-4 py-1">
                    {history.length} SKUs
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-hidden">
                <ScrollArea className="h-full p-8">
                  {isLoading ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-700 py-20 opacity-30">
                      <RefreshCw className="w-12 h-12 mb-4 animate-spin" />
                      <p className="text-[10px] font-black italic uppercase tracking-widest">Hydrating SKU Engine...</p>
                    </div>
                  ) : history.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-700 py-20 opacity-30">
                      <History className="w-16 h-16 mb-4" />
                      <p className="text-[10px] font-black italic uppercase tracking-widest">Awaiting First Scan</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {(Array.isArray(history) ? history : []).map((scan, i) => {
                        const hasVariance = scan.actualCount !== scan.systemCount;
                        return (
                          <div
                            key={i}
                            className={`p-5 rounded-[2rem] border transition-all flex items-center justify-between ${
                              hasVariance
                                ? "bg-amber-500/10 border-amber-500/30"
                                : "bg-white/5 border-white/10"
                            }`}
                          >
                            <div className="flex gap-5">
                              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${hasVariance ? "bg-amber-500/20" : "bg-white/5"}`}>
                                <Box className={`w-7 h-7 ${hasVariance ? "text-amber-500" : "text-slate-500"}`} />
                              </div>
                              <div>
                                <div className="text-base font-black text-white italic tracking-tight">{scan.name}</div>
                                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                                  {scan.sku} • {scan.timestamp}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-black text-white italic tracking-tighter">x{scan.actualCount}</div>
                              <div className={`text-[9px] font-black uppercase tracking-widest mt-1 ${hasVariance ? "text-amber-500" : "text-emerald-500"}`}>
                                {hasVariance ? "DISCREPANCY" : "IN-SYNC"}
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

            <Card className="bg-white/5 backdrop-blur-3xl border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col">
              <CardHeader className="p-8 border-b border-white/5 bg-black/20">
                <CardTitle className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] italic">
                  Operational Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="p-10 space-y-10 flex-1 flex flex-col justify-between">
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-black/40 p-8 rounded-[2rem] border border-white/5 shadow-inner">
                    <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-2 italic">Total Units</div>
                    <div className="text-4xl font-black italic tracking-tighter text-white">
                      {history.reduce((a, b) => a + b.actualCount, 0)}
                    </div>
                  </div>
                  <div className="bg-black/40 p-8 rounded-[2rem] border border-white/5 shadow-inner">
                    <div className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-2 italic">Confirmations</div>
                    <div className="text-4xl font-black italic tracking-tighter text-emerald-500">
                      {(Array.isArray(history) ? history : []).filter((h) => h.actualCount === h.systemCount).length}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                   <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest italic">
                      <span className="text-slate-500">Variance Vector</span>
                      <span className="text-red-500">{totalVarianceCount} Anomalies</span>
                   </div>
                   <div className="h-3 bg-black/40 rounded-full overflow-hidden p-0.5 border border-white/5">
                      <div 
                         className="h-full bg-red-600 rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(220,38,38,0.5)]" 
                         style={{ width: `${history.length > 0 ? (totalVarianceCount / history.length) * 100 : 0}%` }}
                      />
                   </div>
                </div>

                <div className="flex gap-4">
                  <Button
                    variant="outline"
                    className="flex-1 h-20 bg-white/5 border-white/10 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-2xl font-black italic uppercase tracking-widest text-[10px]"
                    onClick={() => setHistory([])}
                    disabled={history.length === 0 || isSubmitting}
                  >
                    Abort Audit
                  </Button>
                  <Button
                    className="flex-[2] h-20 bg-slate-100 hover:bg-white text-slate-950 font-black italic rounded-2xl shadow-2xl transition-all uppercase tracking-widest text-[11px]"
                    disabled={history.length === 0 || isSubmitting}
                    onClick={handleSubmit}
                  >
                    {isSubmitting ? <RefreshCw className="w-6 h-6 animate-spin" /> : "Commit Audit"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex flex-col gap-8">
          <Card className="bg-slate-900 border-none shadow-3xl rounded-[3rem] overflow-hidden relative">
             <div className="absolute -right-8 -bottom-8 opacity-10 pointer-events-none rotate-12">
                <Box className="w-48 h-48 text-blue-500" />
             </div>
             <CardHeader className="p-10 pb-4">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-400 italic">Edge Pulse Monitor</CardTitle>
             </CardHeader>
             <CardContent className="p-10 pt-0 space-y-8">
                <div className="flex items-center gap-4">
                   <div className="w-4 h-4 rounded-full bg-emerald-500 animate-ping" />
                   <span className="text-sm font-black italic uppercase text-white tracking-tighter">GATEWAY_ACTIVE: [REAL_TIME]</span>
                </div>
                <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                   <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2">Hardware Context</div>
                   <div className="text-sm font-mono font-black text-blue-400">ZVX-SCAN-PRO-992</div>
                </div>
                <p className="text-[10px] text-slate-400 font-bold leading-relaxed italic uppercase tracking-tight">
                   Audit stream is end-to-end encrypted and queued for **Zenvix Global Reconciliation**.
                </p>
             </CardContent>
          </Card>

          <Card className="bg-amber-500/5 border-amber-500/20 border-2 rounded-[2.5rem]">
             <CardContent className="p-8 flex gap-6">
                <AlertCircle className="w-8 h-8 text-amber-500 shrink-0" />
                <div>
                   <div className="text-[10px] font-black text-amber-500 uppercase italic tracking-widest">Operational Limit</div>
                   <p className="text-[11px] text-amber-200/60 font-bold mt-2 leading-relaxed italic">
                      Variance exceeding <span className="text-amber-500 underline">±15%</span> triggers mandatory supervisor biometric validation.
                   </p>
                </div>
             </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

  if (noShell) return content;

  return (
    <div className="h-[calc(100vh-64px)] overflow-hidden bg-slate-950 p-8 flex flex-col">
       {content}
    </div>
  );
};

export default StockOpnameScanner;
