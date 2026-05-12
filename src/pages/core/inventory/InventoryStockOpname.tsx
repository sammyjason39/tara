import React, { useState, useEffect, useRef, useCallback } from \"react\";
import { 
  ScanLine, Box, ArrowUpRight, CheckCircle2, AlertCircle, 
  History, RefreshCw, Layers, ShieldCheck, Search,
  ClipboardList, ArrowLeft, Save, Trash2, Layout, BarChart,
  Package, AlertTriangle, CheckCircle, XCircle
} from \"lucide-react\";
import { Card, CardContent, CardHeader, CardTitle } from \"@/components/ui/card\";
import { Button } from \"@/components/ui/button\";
import { Input } from \"@/components/ui/input\";
import { Badge } from \"@/components/ui/badge\";
import { ScrollArea } from \"@/components/ui/scroll-area\";
import { toast } from \"@/hooks/use-toast\";
import { Separator } from \"@/components/ui/separator\";
import { inventoryService } from \"@/core/services/inventory/inventoryService\";
import { retailService } from \"@/core/services/retail/retailService\";
import { useSession } from \"@/core/security/session\";
import { useBarcodeScanner } from \"@/hooks/useBarcodeScanner\";
import { InventoryGlassHeader } from \"@/components/shared/InventoryGlassHeader\";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from \"@/components/ui/select\";
import { useNavigate } from \"react-router-dom\";
import { UnknownBarcodeDialog } from \"@/components/shared/UnknownBarcodeDialog\";
import { useAuth } from \"@/contexts/AuthContext\";
import { StockOpnameSummaryModal } from \"@/components/shared/StockOpnameSummaryModal\";


interface OpnameEntry {
  id: string;
  sku: string;
  name: string;
  systemCount: number;
  actualCount: number;
  timestamp: string;
}

export default function InventoryStockOpname() {
  const session = useSession();
  const navigate = useNavigate();
  const [scanInput, setScanInput] = useState(\"\");
  const [history, setHistory] = useState\u003cOpnameEntry[]\u003e([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [locations, setLocations] = useState\u003cany[]\u003e([]);
  const [selectedLocation, setSelectedLocation] = useState\u003cstring\u003e(session.location_id || \"\");
  const [activeCycleId, setActiveCycleId] = useState\u003cstring | null\u003e(null);
  const [categories, setCategories] = useState\u003cany[]\u003e([]);
  const [anomalies, setAnomalies] = useState\u003cstring[]\u003e([]);
  const [newItems, setNewItems] = useState\u003cany[]\u003e([]);
  const [unknownBarcode, setUnknownBarcode] = useState\u003cstring | null\u003e(null);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const { user } = useAuth();
  const inputRef = useRef\u003cHTMLInputElement\u003e(null);


  // Fetch locations on mount
  useEffect(() =\u003e {
    const fetchLocations = async () =\u003e {
      try {
        const [coreLocations, retailStores] = await Promise.all([
          inventoryService.listLocations(session.tenant_id, session),
          retailService.listStores(session.tenant_id, session).catch(() =\u003e []),
        ]);

        const locationMap = new Map\u003cstring, { id: string; name: string }\u003e();

        (Array.isArray(coreLocations) ? coreLocations : []).forEach((loc: any) =\u003e {
          if (!loc?.id) return;
          locationMap.set(loc.id, {
            id: loc.id,
            name: loc.name || loc.code || loc.id,
          });
        });

        (Array.isArray(retailStores) ? retailStores : []).forEach((store: any) =\u003e {
          const locationId = store.location_id || store.locationId;
          if (!locationId) return;
          
          // Overwrite location name with store name if available
          locationMap.set(locationId, {
            id: locationId,
            name: store.name || store.code || locationId,
          });
        });

        const locs = Array.from(locationMap.values()).sort((a, b) =\u003e a.name.localeCompare(b.name));
        setLocations(locs);
        if (!selectedLocation \u0026\u0026 locs.length \u003e 0) {
          setSelectedLocation(locs[0].id);
        }
      } catch (err) {
        console.error(\"Failed to fetch locations\", err);
      }
    };
    fetchLocations();

    const fetchCategories = async () =\u003e {
      try {
        const cats = await inventoryService.listCategories(session.tenant_id, session);
        setCategories(cats);
      } catch (err) {
        console.error(\"Failed to fetch categories\", err);
      }
    };
    fetchCategories();
  }, [session, session.tenant_id]);


  // Global Barcode Scanner Integration
  useBarcodeScanner((barcode) =\u003e {
    if (activeCycleId) {
      processScan(barcode);
    }
  });

  const processScan = useCallback(async (barcode: string) =\u003e {
    if (!barcode) return;
    
    try {
      // Lookup item
      const item = await inventoryService.lookupItemByBarcode(session.tenant_id, session, barcode);
      
      if (!item) {
        setUnknownBarcode(barcode);
        return;
      }

      setHistory((prev) =\u003e {
        const existingIdx = prev.findIndex((h) =\u003e h.sku === item.sku);
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
            id: item.id,
            sku: item.sku,
            name: item.name,
            systemCount: 0, // In a real audit, we'd fetch current balance for this location
            actualCount: 1,
            timestamp: new Date().toLocaleTimeString(),
          },
          ...prev,
        ];
      });

      toast({ title: \"Count Updated\", description: `${item.name} recorded.` });
    } catch (err) {
      console.error(\"Scan processing failed\", err);
    }
  }, [session]);

  const handleManualScan = (e: React.FormEvent) =\u003e {
    e.preventDefault();
    if (!scanInput) return;
    processScan(scanInput);
    setScanInput(\"\");
    inputRef.current?.focus();
  };

  const startAudit = async () =\u003e {
    if (!selectedLocation) {
      toast({ title: \"Location Required\", description: \"Select a target location first.\", variant: \"destructive\" });
      return;
    }
    
    setIsLoading(true);
    try {
      const cycle = await inventoryService.initiateAudit(session.tenant_id, session, {
        location_id: selectedLocation,
        scope: \"LOCATION\"
      });
      setActiveCycleId(cycle.id || \"temp-cycle\");
      toast({ title: \"Audit Session Active\", description: \"Terminal initialized and ready for scanning.\" });
    } catch (err) {
      toast({ title: \"Initialization Failed\", description: \"Could not start audit cycle.\", variant: \"destructive\" });
    } finally {
      setIsLoading(false);
    }
  };

  const commitAudit = async () =\u003e {
    if (!activeCycleId) return;
    setIsSummaryOpen(true);
  };

  const handleFinalConfirm = async () =\u003e {
    if (!activeCycleId) return;
    setIsSubmitting(true);
    try {
      const totalCounted = history.reduce((a, b) =\u003e a + b.actualCount, 0);
      
      await inventoryService.closeAuditCycle(session.tenant_id, session, activeCycleId, {
        counted_value: totalCounted,
        variance_value: 0,
        anomalies,
        newItems: newItems.map(item =\u003e ({ id: item.id })),
        items: history.map(h =\u003e ({ id: h.id, sku: h.sku, actualCount: h.actualCount }))
      });

      setHistory([]);
      setAnomalies([]);
      setNewItems([]);
      setActiveCycleId(null);
    } catch (err) {
      console.error(\"Final commit failed\", err);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReportAnomaly = (barcode: string) =\u003e {
    setAnomalies(prev =\u003e [...prev, barcode]);
    toast({ title: \"Anomaly Recorded\", description: `Barcode ${barcode} flagged for review.` });
  };

  const handleCreateNewItem = async (itemData: any) =\u003e {
    try {
      const created = await inventoryService.createAuditItem(session.tenant_id, session, activeCycleId!, itemData);
      setNewItems(prev =\u003e [...prev, created]);
      
      // Also add to local history so it shows up in the list
      setHistory(prev =\u003e [
        {
          id: created.id,
          sku: created.sku,
          name: created.name,
          systemCount: 0,
          actualCount: 1,
          timestamp: new Date().toLocaleTimeString(),
        },
        ...prev
      ]);

      toast({ title: \"New Item Registered\", description: `${created.name} added to audit.` });
    } catch (err) {
      toast({ title: \"Registration Failed\", description: \"Could not create item during audit.\", variant: \"destructive\" });
    }
  };


  const totalVariances = history.filter(h =\u003e h.actualCount !== h.systemCount).length;

  return (
    \u003cdiv className=\"flex-1 p-8 flex flex-col gap-8 bg-slate-50/50 dark:bg-slate-950/50 min-h-full\"\u003e
      \u003cInventoryGlassHeader
        title=\"Stock Opname Terminal\"
        subtitle=\"Physical verification and variance reconciliation engine.\"
        icon={ClipboardList}
        actions={
          \u003cButton 
            variant=\"ghost\" 
            onClick={() =\u003e navigate(\"/core/inventory/hub\")}
            className=\"rounded-2xl font-black italic text-[10px] uppercase tracking-widest gap-2\"
          \u003e
            \u003cArrowLeft className=\"w-4 h-4\" /\u003e Back to Hub
          \u003c/Button\u003e
        }
      /\u003e

      {!activeCycleId ? (
        \u003cdiv className=\"flex-1 flex items-center justify-center\"\u003e
          \u003cCard className=\"w-full max-w-2xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border-none shadow-2xl rounded-[3rem] overflow-hidden\"\u003e
            \u003cCardContent className=\"p-16 text-center space-y-8\"\u003e
              \u003cdiv className=\"w-24 h-24 bg-primary/10 rounded-[2rem] flex items-center justify-center mx-auto\"\u003e
                \u003cShieldCheck className=\"w-12 h-12 text-primary\" /\u003e
              \u003c/div\u003e
              \u003cdiv className=\"space-y-2\"\u003e
                \u003ch2 className=\"text-3xl font-black italic tracking-tighter uppercase\"\u003eInitialize Audit Cycle\u003c/h2\u003e
                \u003cp className=\"text-sm text-slate-500 font-medium italic\"\u003eSelect a target location to begin the physical count verification.\u003c/p\u003e
              \u003c/div\u003e

              \u003cdiv className=\"space-y-4 max-w-sm mx-auto\"\u003e
                \u003cSelect value={selectedLocation} onValueChange={setSelectedLocation}\u003e
                  \u003cSelectTrigger className=\"h-16 rounded-2xl bg-background border-2 border-slate-200 font-black italic text-sm\"\u003e
                    \u003cSelectValue placeholder=\"Select Target Location...\" /\u003e
                  \u003c/SelectTrigger\u003e
                  \u003cSelectContent className=\"rounded-2xl border-none shadow-2xl\"\u003e
                    {locations.map(loc =\u003e (
                      \u003cSelectItem key={loc.id} value={loc.id} className=\"font-bold italic\"\u003e{loc.name}\u003c/SelectItem\u003e
                    ))}
                  \u003c/SelectContent\u003e
                \u003c/Select\u003e

                \u003cButton 
                  onClick={startAudit} 
                  disabled={isLoading}
                  className=\"w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black italic uppercase tracking-widest text-xs gap-3 shadow-xl shadow-primary/20\"
                \u003e
                  {isLoading ? \u003cRefreshCw className=\"w-5 h-5 animate-spin\" /\u003e : \u003cLayers className=\"w-5 h-5\" /\u003e}
                  Begin Physical Audit
                \u003c/Button\u003e
              \u003c/div\u003e
            \u003c/CardContent\u003e
          \u003c/Card\u003e
        \u003c/div\u003e
      ) : (
        \u003cdiv className=\"grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 overflow-hidden\"\u003e
          \u003cdiv className=\"lg:col-span-2 flex flex-col gap-8 overflow-hidden\"\u003e
            \u003cCard className=\"bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border-none shadow-2xl rounded-[2.5rem] overflow-hidden\"\u003e
              \u003cCardContent className=\"p-12\"\u003e
                \u003cform onSubmit={handleManualScan} className=\"flex flex-col items-center gap-10 max-w-xl mx-auto\"\u003e
                  \u003cdiv className=\"w-24 h-24 bg-primary rounded-[1.5rem] flex items-center justify-center shadow-2xl shadow-primary/30 animate-pulse\"\u003e
                    \u003cScanLine className=\"w-12 h-12 text-primary-foreground\" /\u003e
                  \u003c/div\u003e
                  
                  \u003cdiv className=\"w-full relative group\"\u003e
                    \u003cSearch className=\"absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400 group-focus-within:text-primary transition-colors\" /\u003e
                    \u003cInput
                      ref={inputRef}
                      value={scanInput}
                      onChange={(e) =\u003e setScanInput(e.target.value)}
                      placeholder=\"SCAN BARCODE OR SKU...\"
                      className=\"h-20 pl-16 text-2xl font-black bg-slate-100/50 dark:bg-slate-800/50 border-none rounded-3xl shadow-inner italic uppercase tracking-widest\"
                      autoFocus
                    /\u003e
                  \u003c/div\u003e

                  \u003cdiv className=\"flex items-center gap-4 px-6 py-3 bg-emerald-500/10 rounded-full border border-emerald-500/20\"\u003e
                    \u003cdiv className=\"w-2 h-2 rounded-full bg-emerald-500 animate-ping\" /\u003e
                    \u003cspan className=\"text-[10px] font-black italic uppercase tracking-widest text-emerald-600\"\u003eScanner Engine: Active \u0026 Calibrated\u003c/span\u003e
                  \u003c/div\u003e
                \u003c/form\u003e
              \u003c/CardContent\u003e
            \u003c/Card\u003e

            \u003cCard className=\"flex-1 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border-none shadow-2xl rounded-[2.5rem] overflow-hidden flex flex-col\"\u003e
              \u003cCardHeader className=\"p-8 border-b border-slate-100 dark:border-slate-800\"\u003e
                \u003cCardTitle className=\"text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center justify-between italic\"\u003e
                  Live Audit Stream
                  \u003cBadge variant=\"outline\" className=\"rounded-lg border-primary/20 text-primary font-black italic\"\u003e{history.length} Unique SKUs\u003c/Badge\u003e
                \u003c/CardTitle\u003e
              \u003c/CardHeader\u003e
              \u003cCardContent className=\"p-0 flex-1 overflow-hidden\"\u003e
                \u003cScrollArea className=\"h-[400px] p-8\"\u003e
                  {history.length === 0 ? (
                    \u003cdiv className=\"h-full flex flex-col items-center justify-center opacity-20 py-20\"\u003e
                      \u003cPackage className=\"w-20 h-20 mb-4 stroke-[1]\" /\u003e
                      \u003cp className=\"text-xs font-black italic uppercase tracking-widest\"\u003eAwaiting First Scan...\u003c/p\u003e
                    \u003c/div\u003e
                  ) : (
                    \u003cdiv className=\"space-y-4\"\u003e
                      {history.map((entry, idx) =\u003e (
                        \u003cdiv key={idx} className=\"p-6 bg-slate-100/30 dark:bg-slate-800/30 rounded-3xl border border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between group hover:bg-primary/[0.02] transition-all\"\u003e
                          \u003cdiv className=\"flex gap-4\"\u003e
                            \u003cdiv className=\"w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center\"\u003e
                              \u003cBox className=\"w-6 h-6 text-slate-400\" /\u003e
                            \u003c/div\u003e
                            \u003cdiv\u003e
                              \u003cdiv className=\"text-sm font-black italic text-slate-900 dark:text-white\"\u003e{entry.name}\u003c/div\u003e
                              \u003cdiv className=\"text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1\"\u003e{entry.sku} • {entry.timestamp}\u003c/div\u003e
                            \u003c/div\u003e
                          \u003c/div\u003e
                          \u003cdiv className=\"flex items-center gap-8\"\u003e
                             \u003cdiv className=\"text-right\"\u003e
                                \u003cdiv className=\"text-2xl font-black italic text-primary\"\u003ex{entry.actualCount}\u003c/div\u003e
                                \u003cdiv className=\"text-[9px] font-black uppercase tracking-widest text-slate-400\"\u003ePhysical Count\u003c/div\u003e
                             \u003c/div\u003e
                             \u003cButton 
                              variant=\"ghost\" 
                              size=\"icon\" 
                              className=\"h-10 w-10 rounded-xl hover:bg-rose-500/10 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all\"
                              onClick={() =\u003e setHistory(prev =\u003e prev.filter((_, i) =\u003e i !== idx))}
                             \u003e
                               \u003cTrash2 className=\"w-4 h-4\" /\u003e
                             \u003c/Button\u003e
                          \u003c/div\u003e
                        \u003c/div\u003e
                      ))}
                    \u003c/div\u003e
                  )}
                \u003c/ScrollArea\u003e
              \u003c/CardContent\u003e
            \u003c/Card\u003e
          \u003c/div\u003e

          \u003cdiv className=\"flex flex-col gap-8\"\u003e
            \u003cCard className=\"bg-slate-900 border-none shadow-2xl rounded-[3rem] overflow-hidden relative\"\u003e
              \u003cdiv className=\"absolute top-0 right-0 p-8 opacity-10 pointer-events-none\"\u003e
                \u003cBarChart className=\"w-32 h-32 text-primary\" /\u003e
              \u003c/div\u003e
              \u003cCardHeader className=\"p-10 pb-4\"\u003e
                \u003cCardTitle className=\"text-[10px] font-black uppercase tracking-[0.4em] text-primary italic\"\u003eSession Intelligence\u003c/CardTitle\u003e
              \u003c/CardHeader\u003e
              \u003cCardContent className=\"p-10 pt-0 space-y-10\"\u003e
                \u003cdiv className=\"space-y-6\"\u003e
                  \u003cdiv className=\"bg-slate-800/50 p-6 rounded-2xl border border-white/5\"\u003e
                    \u003cdiv className=\"text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 italic\"\u003eAudit Target\u003c/div\u003e
                    \u003cdiv className=\"text-lg font-black text-white italic\"\u003e{locations.find(l =\u003e l.id === selectedLocation)?.name}\u003c/div\u003e
                  \u003c/div\u003e

                  \u003cdiv className=\"grid grid-cols-2 gap-4\"\u003e
                    \u003cdiv className=\"bg-slate-800/50 p-6 rounded-2xl border border-white/5\"\u003e
                      \u003cdiv className=\"text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1 italic\"\u003eTotal Units\u003c/div\u003e
                      \u003cdiv className=\"text-3xl font-black text-white italic tracking-tighter\"\u003e
                        {history.reduce((a, b) =\u003e a + b.actualCount, 0)}
                      \u003c/div\u003e
                    \u003c/div\u003e
                    \u003cdiv className=\"bg-slate-800/50 p-6 rounded-2xl border border-white/5\"\u003e
                      \u003cdiv className=\"text-[9px] font-black text-rose-500 uppercase tracking-widest mb-1 italic\"\u003eSKUs Scanned\u003c/div\u003e
                      \u003cdiv className=\"text-3xl font-black text-white italic tracking-tighter\"\u003e{history.length}\u003c/div\u003e
                    \u003c/div\u003e
                  \u003c/div\u003e
                \u003c/div\u003e

                \u003cdiv className=\"space-y-4\"\u003e
                   \u003cdiv className=\"flex justify-between items-center text-[10px] font-black uppercase tracking-widest italic\"\u003e
                      \u003cspan className=\"text-slate-500\"\u003eAnomaly Vector\u003c/span\u003e
                      \u003cspan className=\"text-amber-500\">{totalVariances} Mismatches\u003c/span\u003e
                   \u003c/div\u003e
                   \u003cdiv className=\"h-2 bg-slate-800 rounded-full overflow-hidden p-0.5\"\u003e
                      \u003cdiv 
                         className=\"h-full bg-amber-500 rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(245,158,11,0.5)]\" 
                         style={{ width: `${history.length \u003e 0 ? (totalVariances / history.length) * 100 : 0}%` }}
                      /\u003e
                   \u003c/div\u003e
                \u003c/div\u003e

                \u003cdiv className=\"flex gap-4 pt-4\"\u003e
                  \u003cButton
                    variant=\"outline\"
                    className=\"flex-1 h-16 bg-transparent border-white/10 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-2xl font-black italic uppercase tracking-widest text-[10px]\"
                    onClick={() =\u003e {
                      if (confirm(\"Abort current audit session? Data will not be saved.\")) {
                        setActiveCycleId(null);
                        setHistory([]);
                      }
                    }}
                    disabled={isSubmitting}
                  \u003e
                    Abort
                  \u003c/Button\u003e
                  \u003cButton
                    className=\"flex-[2] h-16 bg-primary hover:bg-primary/90 text-primary-foreground font-black italic rounded-2xl shadow-xl transition-all uppercase tracking-widest text-xs\"
                    disabled={history.length === 0 || isSubmitting}
                    onClick={commitAudit}
                  \u003e
                    {isSubmitting ? \u003cRefreshCw className=\"w-5 h-5 animate-spin\" /\u003e : \"Commit Audit\"}
                  \u003c/Button\u003e
                \u003c/div\u003e
              \u003c/CardContent\u003e
            \u003c/Card\u003e

            \u003cCard className=\"bg-blue-500/5 border-blue-500/20 border-2 rounded-[2.5rem]\"\u003e
              \u003cCardContent className=\"p-8 flex gap-5\"\u003e
                \u003cAlertCircle className=\"w-6 h-6 text-blue-500 shrink-0\" /\u003e
                \u003cdiv\u003e
                  \u003cdiv className=\"text-[10px] font-black text-blue-500 uppercase italic tracking-widest\"\u003eProtocol Intelligence\u003c/div\u003e
                  \u003cp className=\"text-[11px] text-blue-500/60 font-bold mt-2 leading-relaxed italic\"\u003e
                    Audit data is buffered locally and reconciled upon commit. Mismatches will trigger automated variance logs.
                  \u003c/p\u003e
                \u003c/div\u003e
              \u003c/CardContent\u003e
            \u003c/Card\u003e
          \u003c/div\u003e
        \u003c/div\u003e
      )}

      \u003cUnknownBarcodeDialog
        isOpen={!!unknownBarcode}
        onClose={() =\u003e setUnknownBarcode(null)}
        barcode={unknownBarcode || \"\"}
        onReportAnomaly={handleReportAnomaly}
        onCreateNew={handleCreateNewItem}
        categoryOptions={categories}
      /\u003e

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
        locationName={locations.find(l =\u003e l.id === selectedLocation)?.name || \"Main Hub\"}
        auditorName={user ? `${user.first_name} ${user.last_name}` : \"System Auditor\"}
      /\u003e
    \u003c/div\u003e
  );
}
