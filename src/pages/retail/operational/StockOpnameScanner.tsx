import React, { useState, useEffect, useRef } from \"react\";
import { PageHeader } from \"@/core/ui/PageHeader\";
import { WorkspacePanel } from \"@/core/ui/WorkspacePanel\";
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
} from \"lucide-react\";
import { Card, CardContent, CardHeader, CardTitle } from \"@/components/ui/card\";
import { Button } from \"@/components/ui/button\";
import { Input } from \"@/components/ui/input\";
import { Badge } from \"@/components/ui/badge\";
import { ScrollArea } from \"@/components/ui/scroll-area\";
import { toast } from \"@/hooks/use-toast\";
import { Separator } from \"@/components/ui/separator\";
import { retailService } from \"@/core/services/retail/retailService\";
import { useSession } from \"@/core/security/session\";
import { useRetail } from \"../context/RetailContext\";
import { Switch } from \"@/components/ui/switch\";
import { Label } from \"@/components/ui/label\";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from \"@/components/ui/select\";
import type { RetailShift, RetailProduct } from \"@/core/types/retail/retail\";
import { useAuth } from \"@/contexts/AuthContext\";
import { StockOpnameSummaryModal } from \"@/components/shared/StockOpnameSummaryModal\";

interface ScanEntry {
  id?: string;
  sku: string;
  name: string;
  systemCount: number;
  actualCount: number;
  timestamp: string;
  serials?: string[];
}

const StockOpnameScanner = ({ noShell = false }: { noShell?: boolean }) => {
  const session = useSession();
  const { user } = useAuth();
  const { activeStore, activeChannel, activeShift, isLoading: isContextLoading } = useRetail();
  const [scanInput, setScanInput] = useState(\"\");
  const [products, setProducts] = useState\u003cRetailProduct[]\u003e([]);
  const [history, setHistory] = useState\u003cScanEntry[]\u003e([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const navigate = React.useMemo(() =\u003e (path: string) =\u003e window.location.href = path, []);
  const inputRef = useRef\u003cHTMLInputElement\u003e(null);

  const [serializationMode, setSerializationMode] = useState(false);
  const [targetSku, setTargetSku] = useState\u003cstring\u003e(\"\");

  useEffect(() =\u003e {
    const fetchData = async () =\u003e {
      try {
        setIsLoading(true);
        const data = await retailService.listInventory(
          session.tenant_id,
          session,
          { locationId: activeStore?.id || session.location_id }
        );
        setProducts(data);
      } catch (error) {
        console.error(\"Failed to fetch inventory\", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (!isContextLoading \u0026\u0026 !activeShift) {
       toast({
        title: \"Fiscal Gate Active\",
        description: \"Please initialize a shift before accessing the audit terminal.\",
        variant: \"destructive\",
      });
      window.location.href = \"/m/retail/operational/gateway\";
      return;
    }

    if (session.tenant_id) fetchData();
  }, [session.tenant_id, session, isContextLoading, activeShift, activeStore?.id]);

  const handleScan = (e: React.FormEvent) =\u003e {
    e.preventDefault();
    if (!scanInput) return;

    if (serializationMode) {
      if (!targetSku) {
        toast({ title: \"Target Missing\", description: \"Select a Product SKU first before serial scanning.\", variant: \"destructive\" });
        return;
      }

      const product = products.find(p =\u003e p.sku === targetSku);
      if (!product) return;

      setHistory((prev) =\u003e {
        const existingIdx = prev.findIndex((h) =\u003e h.sku === product.sku);
        const currentSerial = scanInput.trim();

        if (existingIdx \u003e -1) {
          const newHistory = [...prev];
          const entry = newHistory[existingIdx];
          
          // Check if serial already scanned in this session
          const alreadyScanned = entry.serials?.includes(currentSerial);
          if (alreadyScanned) {
            toast({ title: \"Duplicate Serial\", description: `Serial ${currentSerial} already scanned.`, variant: \"warning\" });
            return prev;
          }

          newHistory[existingIdx] = {
            ...entry,
            actualCount: entry.actualCount + 1,
            serials: [...(entry.serials || []), currentSerial],
            timestamp: new Date().toLocaleTimeString(),
          };
          return newHistory;
        }

        return [
          {
            id: product.id,
            sku: product.sku,
            name: product.name,
            systemCount: product.stock || 0,
            actualCount: 1,
            serials: [currentSerial],
            timestamp: new Date().toLocaleTimeString(),
          },
          ...prev,
        ];
      });

      toast({ title: \"Unique Unit Added\", description: `Serial: ${scanInput} registered to ${product.name}` });
    } else {
      const product = products.find(
        (p) =\u003e p.sku === scanInput || p.id === scanInput || p.barcode === scanInput,
      );
      if (product) {
        setHistory((prev) =\u003e {
          const existingIdx = prev.findIndex((h) =\u003e h.sku === product.sku);
          if (existingIdx \u003e -1) {
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
              id: product.id,
              sku: product.sku,
              name: product.name,
              systemCount: product.stock || 0,
              actualCount: 1,
              timestamp: new Date().toLocaleTimeString(),
            },
            ...prev,
          ];
        });
        toast({ title: \"Item Scanned\", description: `Scanned: ${product.name}` });
      } else {
        toast({
          title: \"Invalid SKU\",
          description: `Unrecognized SKU: ${scanInput}`,
          variant: \"destructive\",
        });
      }
    }
    setScanInput(\"\");
    inputRef.current?.focus();
  };

  const totalVarianceCount = (Array.isArray(history) ? history : []).filter(
    (item) =\u003e item.actualCount !== item.systemCount,
  ).length;

  const handleSubmit = async () =\u003e {
    if (history.length === 0) return;
    setIsSummaryOpen(true);
  };

  const handleFinalConfirm = async () =\u003e {
    if (history.length === 0) return;
    setIsSubmitting(true);
    try {
      const adjustments = (Array.isArray(history) ? history : []).flatMap((h) =\u003e {
        if (h.serials \u0026\u0026 h.serials.length \u003e 0) {
          return h.serials.map(s =\u003e ({ 
            sku: h.sku, 
            actualCount: 1,
            serial_number: s 
          }));
        }
        return [{ product_id: h.id, sku: h.sku, actualCount: h.actualCount }];
      });

      await retailService.submitOpname(
        session.tenant_id!,
        session,
        activeStore?.id || session.location_id || \"unassigned\",
        adjustments,
        activeShift?.id,
      );
      setHistory([]);
      setSerializationMode(false);
    } catch (error: unknown) {
      console.error(error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const content = (
    \u003cdiv className=\"flex-1 flex flex-col gap-8 overflow-hidden\"\u003e
      \u003cdiv className=\"grid grid-cols-1 lg:grid-cols-4 gap-8 flex-1 overflow-hidden\"\u003e
        \u003cdiv className=\"lg:col-span-3 flex flex-col gap-8 overflow-hidden\"\u003e
          \u003cCard className=\"bg-card/40 backdrop-blur-2xl border-border rounded-[3rem] overflow-hidden shadow-2xl relative\"\u003e
            \u003cdiv className=\"absolute top-0 right-0 p-12 opacity-5 pointer-events-none\"\u003e
              \u003cLayers className=\"w-64 h-64 text-primary\" /\u003e
            \u003c/div\u003e
            \u003cCardContent className=\"p-16\"\u003e
              \u003cform
                onSubmit={handleScan}
                className=\"flex flex-col items-center justify-center space-y-12 max-w-2xl mx-auto\"
              \u003e
                \u003cdiv className=\"w-40 h-40 bg-primary rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-primary/30 relative transform hover:scale-105 transition-transform group\"\u003e
                  \u003cScanLine className=\"w-20 h-20 text-primary-foreground animate-pulse\" /\u003e
                  \u003cdiv className=\"absolute -bottom-4 -right-4 w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center text-primary shadow-xl border-2 border-border\"\u003e
                    \u003cRefreshCw className=\"w-6 h-6\" /\u003e
                  \u003c/div\u003e
                \u003c/div\u003e
                
                \u003cdiv className=\"text-center\"\u003e
                  \u003ch3 className=\"text-4xl font-black text-foreground tracking-tighter italic uppercase\"\u003e
                    {activeStore?.name || \"RETAIL AUDIT TERMINAL\"}
                  \u003c/h3\u003e
                  \u003cp className=\"text-[10px] text-primary font-black tracking-[0.4em] uppercase mt-2 italic opacity-80\"\u003e
                    Scanning Zone: [MAIN_FLOOR] • Hardware Sync Active
                  \u003c/p\u003e
                \u003c/div\u003e

                \u003cdiv className=\"flex flex-col items-center gap-6 w-full\"\u003e
                  \u003cdiv className=\"flex items-center gap-3 px-6 py-3 bg-secondary/50 rounded-full border border-border backdrop-blur-xl\"\u003e
                    \u003cSwitch 
                      id=\"serial-mode\"
                      checked={serializationMode} 
                      onCheckedChange={setSerializationMode}
                      className=\"data-[state=checked]:bg-primary\"
                    /\u003e
                    \u003cLabel htmlFor=\"serial-mode\" className=\"text-[10px] font-black italic uppercase tracking-widest text-foreground cursor-pointer\"\u003e
                      Serialization Mode (Deep Tracking)
                    \u003c/Label\u003e
                  \u003c/div\u003e

                  {serializationMode \u0026\u0026 (
                    \u003cdiv className=\"w-full max-w-lg\"\u003e
                      \u003cSelect value={targetSku} onValueChange={setTargetSku}\u003e
                        \u003cSelectTrigger className=\"h-14 bg-background/50 border-2 border-border rounded-2xl font-black italic text-[11px] uppercase tracking-widest shadow-xl\"\u003e
                          \u003cSelectValue placeholder=\"Target SKU for Unique Units...\" /\u003e
                        \u003c/SelectTrigger\u003e
                        \u003cSelectContent className=\"rounded-2xl border-border bg-card/95 backdrop-blur-3xl shadow-2xl\"\u003e
                          {(Array.isArray(products) ? products : []).map(p =\u003e (
                            \u003cSelectItem key={p.id} value={p.sku} className=\"font-bold italic text-xs py-3\"\u003e
                              {p.name} ({p.sku})
                            \u003c/SelectItem\u003e
                          ))}
                        \u003c/SelectContent\u003e
                      \u003c/Select\u003e
                      \u003cp className=\"text-[9px] text-primary font-black uppercase text-center mt-3 italic animate-pulse\"\u003e
                        Next scan will register a new unique instance for this SKU
                      \u003c/p\u003e
                    \u003c/div\u003e
                  )}
                \u003c/div\u003e

                \u003cdiv className=\"w-full relative group\"\u003e
                  \u003cSearch className=\"absolute left-8 top-1/2 -translate-y-1/2 w-8 h-8 text-muted-foreground group-focus-within:text-primary transition-colors\" /\u003e
                  \u003cInput
                    ref={inputRef}
                    value={scanInput}
                    onChange={(e) =\u003e setScanInput(e.target.value)}
                    placeholder=\"SCAN BARCODE OR INPUT SKU...\"
                    className=\"h-24 pl-20 text-3xl font-black bg-secondary/50 border-2 border-border focus:border-primary/50 rounded-[2rem] shadow-2xl text-foreground italic uppercase tracking-widest placeholder:text-muted-foreground/30 transition-all\"
                    autoFocus
                  /\u003e
                \u003c/div\u003e

                \u003cdiv className=\"flex items-center gap-6 px-8 py-4 bg-secondary/50 rounded-full border border-border backdrop-blur-xl\"\u003e
                  \u003cShieldCheck className=\"w-5 h-5 text-success\" /\u003e
                  \u003cp className=\"text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] italic\"\u003e
                    Zenvix Audit Pulse: \u003cspan className=\"text-success\"\u003eNOMINAL\u003c/span\u003e
                  \u003c/p\u003e
                \u003c/div\u003e
              \u003c/form\u003e
            \u003c/CardContent\u003e
          \u003c/Card\u003e

          \u003cdiv className=\"grid grid-cols-1 md:grid-cols-2 gap-8 flex-1 overflow-hidden\"\u003e
            \u003cCard className=\"bg-card/40 backdrop-blur-2xl border-border rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col\"\u003e
              \u003cCardHeader className=\"p-8 border-b border-border bg-background/20\"\u003e
                \u003cCardTitle className=\"text-[11px] font-black text-muted-foreground uppercase tracking-[0.3em] flex items-center justify-between italic\"\u003e
                  Live Session Stream
                  \u003cBadge className=\"bg-primary text-primary-foreground font-black italic px-4 py-1\"\u003e
                    {history.length} SKUs
                  \u003c/Badge\u003e
                \u003c/CardTitle\u003e
              \u003c/CardHeader\u003e
              \u003cCardContent className=\"p-0 flex-1 overflow-hidden\"\u003e
                \u003cScrollArea className=\"h-full p-8\"\u003e
                  {isLoading ? (
                    \u003cdiv className=\"h-full flex flex-col items-center justify-center text-muted-foreground py-20 opacity-30\"\u003e
                      \u003cRefreshCw className=\"w-12 h-12 mb-4 animate-spin\" /\u003e
                      \u003cp className=\"text-[10px] font-black italic uppercase tracking-widest\"\u003eHydrating SKU Engine...\u003c/p\u003e
                    \u003c/div\u003e
                  ) : history.length === 0 ? (
                    \u003cdiv className=\"h-full flex flex-col items-center justify-center text-muted-foreground py-20 opacity-30\"\u003e
                      \u003cHistory className=\"w-16 h-16 mb-4\" /\u003e
                      \u003cp className=\"text-[10px] font-black italic uppercase tracking-widest\"\u003eAwaiting First Scan\u003c/p\u003e
                    \u003c/div\u003e
                  ) : (
                    \u003cdiv className=\"space-y-4\"\u003e
                      {(Array.isArray(history) ? history : []).map((scan, i) =\u003e {
                        const hasVariance = scan.actualCount !== scan.systemCount;
                        return (
                          \u003cdiv
                            key={i}
                            className={`p-5 rounded-[2rem] border transition-all flex items-center justify-between ${
                              hasVariance
                                ? \"bg-warning/10 border-warning/30\"
                                : \"bg-secondary/40 border-border\"
                            }`}
                          \u003e
                            \u003cdiv className=\"flex gap-5\"\u003e
                              \u003cdiv className={`w-14 h-14 rounded-2xl flex items-center justify-center ${hasVariance ? \"bg-warning/20\" : \"bg-secondary/50\"}`}\u003e
                                \u003cBox className={`w-7 h-7 ${hasVariance ? \"text-warning\" : \"text-muted-foreground\"}`} /\u003e
                              \u003c/div\u003e
                              \u003cdiv\u003e
                                \u003cdiv className=\"text-base font-black text-foreground italic tracking-tight\"\u003e{scan.name}\u003c/div\u003e
                                \u003cdiv className=\"flex items-center gap-2 mt-1\"\u003e
                                  \u003cdiv className=\"text-[9px] font-bold text-muted-foreground uppercase tracking-widest\"\u003e
                                    {scan.sku} • {scan.timestamp}
                                  \u003c/div\u003e
                                  {scan.serials \u0026\u0026 scan.serials.length \u003e 0 \u0026\u0026 (
                                    \u003cBadge className=\"bg-primary/20 text-primary border-none text-[8px] px-2 py-0.5 font-black italic uppercase rounded-md leading-none\"\u003e
                                      {scan.serials.length} Unique Units
                                    \u003c/Badge\u003e
                                  )}
                                \u003c/div\u003e
                              \u003c/div\u003e
                            \u003c/div\u003e
                            \u003cdiv className=\"text-right\"\u003e
                              \u003cdiv className=\"text-2xl font-black text-foreground italic tracking-tighter\"\u003ex{scan.actualCount}\u003c/div\u003e
                              \u003cdiv className={`text-[9px] font-black uppercase tracking-widest mt-1 ${hasVariance ? \"text-warning\" : \"text-success\"}`}\u003e
                                {hasVariance ? \"DISCREPANCY\" : \"IN-SYNC\"}
                              \u003c/div\u003e
                            \u003c/div\u003e
                          \u003c/div\u003e
                        );
                      })}
                    \u003c/div\u003e
                  )}
                \u003c/ScrollArea\u003e
              \u003c/CardContent\u003e
            \u003c/Card\u003e

            \u003cCard className=\"bg-card/40 backdrop-blur-2xl border-border rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col\"\u003e
              \u003cCardHeader className=\"p-8 border-b border-border bg-background/20\"\u003e
                \u003cCardTitle className=\"text-[11px] font-black text-muted-foreground uppercase tracking-[0.3em] italic\"\u003e
                  Operational Metrics
                \u003c/CardTitle\u003e
              \u003c/CardHeader\u003e
              \u003cCardContent className=\"p-10 space-y-10 flex-1 flex flex-col justify-between\"\u003e
                \u003cdiv className=\"grid grid-cols-2 gap-6\"\u003e
                  \u003cdiv className=\"bg-background/40 p-8 rounded-[2rem] border border-border shadow-inner\"\u003e
                    \u003cdiv className=\"text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-2 italic\"\u003eTotal Units\u003c/div\u003e
                    \u003cdiv className=\"text-4xl font-black italic tracking-tighter text-foreground\"\u003e
                      {history.reduce((a, b) =\u003e a + b.actualCount, 0)}
                    \u003c/div\u003e
                  \u003c/div\u003e
                  \u003cdiv className=\"bg-background/40 p-8 rounded-[2rem] border border-border shadow-inner\"\u003e
                    \u003cdiv className=\"text-[9px] font-black text-success uppercase tracking-widest mb-2 italic\"\u003eConfirmations\u003c/div\u003e
                    \u003cdiv className=\"text-4xl font-black italic tracking-tighter text-success\"\u003e
                      {(Array.isArray(history) ? history : []).filter((h) =\u003e h.actualCount === h.systemCount).length}
                    \u003c/div\u003e
                  \u003c/div\u003e
                \u003c/div\u003e

                \u003cdiv className=\"space-y-4\"\u003e
                   \u003cdiv className=\"flex justify-between items-center text-[10px] font-black uppercase tracking-widest italic\"\u003e
                      \u003cspan className=\"text-muted-foreground\"\u003eVariance Vector\u003c/span\u003e
                      \u003cspan className=\"text-destructive\"\u003e{totalVarianceCount} Anomalies\u003c/span\u003e
                   \u003c/div\u003e
                   \u003cdiv className=\"h-3 bg-background/40 rounded-full overflow-hidden p-0.5 border border-border\"\u003e
                      \u003cdiv 
                         className=\"h-full bg-destructive rounded-full transition-all duration-1000 shadow-[0_0_15px_hsl(var(--destructive)/0.5)]\" 
                         style={{ width: `${history.length \u003e 0 ? (totalVarianceCount / history.length) * 100 : 0}%` }}
                      /\u003e
                   \u003c/div\u003e
                \u003c/div\u003e

                \u003cdiv className=\"flex gap-4\"\u003e
                  \u003cButton
                    variant=\"outline\"
                    className=\"flex-1 h-20 bg-secondary/50 border-border text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-2xl font-black italic uppercase tracking-widest text-[10px]\"
                    onClick={() =\u003e setHistory([])}
                    disabled={history.length === 0 || isSubmitting}
                  \u003e
                    Abort Audit
                  \u003c/Button\u003e
                  \u003cButton
                    className=\"flex-[2] h-20 bg-primary hover:bg-primary/90 text-primary-foreground font-black italic rounded-2xl shadow-2xl transition-all uppercase tracking-widest text-[11px]\"
                    disabled={history.length === 0 || isSubmitting}
                    onClick={handleSubmit}
                  \u003e
                    {isSubmitting ? \u003cRefreshCw className=\"w-6 h-6 animate-spin\" /\u003e : \"Commit Audit\"}
                  \u003c/Button\u003e
                \u003c/div\u003e
              \u003c/CardContent\u003e
            \u003c/Card\u003e
          \u003c/div\u003e
        \u003c/div\u003e

        \u003cdiv className=\"flex flex-col gap-8\"\u003e
          \u003cCard className=\"bg-card border-none shadow-3xl rounded-[3rem] overflow-hidden relative\"\u003e
             \u003cdiv className=\"absolute -right-8 -bottom-8 opacity-10 pointer-events-none rotate-12\"\u003e
                \u003cBox className=\"w-48 h-48 text-primary\" /\u003e
             \u003c/div\u003e
             \u003cCardHeader className=\"p-10 pb-4\"\u003e
                \u003cCardTitle className=\"text-[10px] font-black uppercase tracking-[0.4em] text-primary italic\"\u003eEdge Pulse Monitor\u003c/CardTitle\u003e
             \u003c/CardHeader\u003e
             \u003cCardContent className=\"p-10 pt-0 space-y-8\"\u003e
                \u003cdiv className=\"flex items-center gap-4\"\u003e
                   \u003cdiv className=\"w-4 h-4 rounded-full bg-success animate-ping\" /\u003e
                   \u003cspan className=\"text-sm font-black italic uppercase text-foreground tracking-tighter\"\u003eGATEWAY_ACTIVE: [REAL_TIME]\u003c/span\u003e
                \u003c/div\u003e
                \u003cdiv className=\"p-6 bg-secondary/40 rounded-2xl border border-border\"\u003e
                   \u003cdiv className=\"text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-2\"\u003eHardware Context\u003c/div\u003e
                   \u003cdiv className=\"text-sm font-mono font-black text-primary\"\u003eZVX-SCAN-PRO-992\u003c/div\u003e
                \u003c/div\u003e
                \u003cp className=\"text-[10px] text-muted-foreground font-bold leading-relaxed italic uppercase tracking-tight\"\u003e
                   Audit stream is end-to-end encrypted and queued for **Zenvix Global Reconciliation**.
                \u003c/p\u003e
             \u003c/CardContent\u003e
          \u003c/Card\u003e

          \u003cCard className=\"bg-warning/5 border-warning/20 border-2 rounded-[2.5rem]\"\u003e
             \u003cCardContent className=\"p-8 flex gap-6\"\u003e
                \u003cAlertCircle className=\"w-8 h-8 text-warning shrink-0\" /\u003e
                \u003cdiv\u003e
                   \u003cdiv className=\"text-[10px] font-black text-warning uppercase italic tracking-widest\"\u003eOperational Limit\u003c/div\u003e
                   \u003cp className=\"text-[11px] text-warning/60 font-bold mt-2 leading-relaxed italic\"\u003e
                      Variance exceeding \u003cspan className=\"text-warning underline\"\u003e±15%\u003c/span\u003e triggers mandatory supervisor biometric validation.
                   \u003c/p\u003e
                \u003c/div\u003e
             \u003c/CardContent\u003e
          \u003c/Card\u003e
        \u003c/div\u003e
      \u003c/div\u003e

      \u003cStockOpnameSummaryModal
        isOpen={isSummaryOpen}
        onClose={() =\u003e setIsSummaryOpen(false)}
        onConfirm={handleFinalConfirm}
        items={history.map(h =\u003e ({
          id: h.id,
          sku: h.sku,
          name: h.name,
          systemCount: h.systemCount,
          actualCount: h.actualCount
        }))}
        locationName={activeStore?.name || \"Retail Store\"}
        auditorName={user ? `${user.first_name} ${user.last_name}` : \"Retail Auditor\"}
      /\u003e
    \u003c/div\u003e
  );

  if (noShell) return content;

  return (
    \u003cdiv className=\"flex-1 p-8 flex flex-col\"\u003e
       {content}
    \u003c/div\u003e
  );
};

export default StockOpnameScanner;
