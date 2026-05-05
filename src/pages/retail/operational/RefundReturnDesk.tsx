import React, { useState } from "react";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import {
  RotateCcw,
  Search,
  ShieldAlert,
  History,
  CheckCircle,
  XCircle,
  Package,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { retailService } from "@/core/services/retail/retailService";
import { useSession } from "@/core/security/session";
import { useRetail } from "../context/RetailContext";
import { Checkbox } from "@/components/ui/checkbox";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";
import type { RetailOrder, RetailShift } from "@/core/types/retail/retail";

const RefundReturnDesk = () => {
  const session = useSession();
  const { activeStore, activeChannel, activeShift, isLoading: isContextLoading } = useRetail();
  const [ticketId, setTicketId] = useState("");
  const [foundOrder, setFoundOrder] = useState<RetailOrder | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isRefunding, setIsRefunding] = useState(false);
  const navigate = React.useMemo(() => (path: string) => window.location.href = path, []);

  React.useEffect(() => {
    if (!isContextLoading && !activeShift) {
      toast({
        title: "Fiscal Gate Active",
        description: "Please initialize a shift before accessing the desk.",
        variant: "destructive",
      });
      window.location.href = "/m/retail/operational/gateway";
    }
  }, [activeShift, isContextLoading]);

  // Integrated Barcode Scanner Support
  useBarcodeScanner((barcode) => {
    if (barcode && barcode.length >= 4) {
      setTicketId(barcode);
      lookupOrderById(barcode);
    }
  });

  const lookupOrderById = async (id: string) => {
    if (!id) return;
    setIsSearching(true);
    try {
      const orders = await retailService.listOrders(
        session.tenant_id!,
        session,
        { store_id: session.location_id },
      );
      const order = orders.find(
        (o) => o.id === id || o.id.includes(id),
      );

      if (order) {
        setFoundOrder(order);
        setSelectedItems([]);
        toast({
          title: "Order Found",
          description: `Order ${id} retrieved via scanner.`,
        });
      } else {
        toast({
          title: "Search Error",
          description: "Order not found. Please check the ticket ID.",
          variant: "destructive",
        });
        setFoundOrder(null);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Search failed";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleLookup = () => lookupOrderById(ticketId);

  const toggleItem = (itemId: string) => {
    setSelectedItems((prev) =>
      prev.includes(itemId)
        ? (Array.isArray(prev) ? prev : []).filter((id) => id !== itemId)
        : [...prev, itemId],
    );
  };

  const processRefund = async () => {
    if (!foundOrder || selectedItems.length === 0) return;
    setIsRefunding(true);
    try {
      await retailService.processReturn(
        session.tenant_id!,
        session,
        foundOrder.id,
        selectedItems,
        activeShift?.id,
      );

      toast({
        title: "Refund Processed",
        description: `Refund of ${selectedItems.length} items processed for order ${foundOrder.id}`,
      });
      setFoundOrder(null);
      setTicketId("");
      setSelectedItems([]);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Refund failed";
      toast({
        title: "Refund Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsRefunding(false);
    }
  };

  const refundAmount =
    foundOrder?.items
      .filter((item) => selectedItems.includes(item.itemId))
      .reduce((sum, item) => sum + item.totalPrice, 0) || 0;

  return (
    <div className="h-[calc(100vh-64px)] overflow-hidden bg-slate-950 relative flex selection:bg-indigo-500 selection:text-white">
      {/* Background Atmosphere */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-5%] w-[45%] h-[45%] bg-red-500/10 blur-[130px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[35%] h-[35%] bg-indigo-500/10 blur-[120px] rounded-full animate-pulse" />
      </div>

      <div className="flex-1 overflow-hidden relative z-10 flex flex-col p-8 gap-8">
        {/* TACTICAL HEADER */}
        <div className="flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-red-600 flex items-center justify-center text-white shadow-lg shadow-red-600/20">
              <RotateCcw className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white">
                Refund & Return Desk
              </h1>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] ml-1">
                Registry Node: {session.location_id || "LOCAL_HUB"} • v2.4.0
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
             <div className="px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-500" />
                <span className="text-[10px] font-black italic uppercase text-red-500 tracking-widest">
                   Authority: Level 3
                </span>
             </div>
             <Button 
                variant="outline" 
                size="sm" 
                onClick={() => window.location.reload()}
                className="h-10 rounded-xl bg-white/5 border-white/10 text-white hover:bg-white/10 font-black italic uppercase text-[10px] tracking-widest gap-2"
             >
                <RefreshCw className={`w-3.5 h-3.5 ${isSearching ? 'animate-spin' : ''}`} /> Sync Ledger
             </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 flex-1 overflow-hidden">
          <div className="lg:col-span-3 flex flex-col gap-6 overflow-hidden">
            <Card className="bg-white/5 backdrop-blur-3xl border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col flex-1">
              <CardHeader className="p-8 border-b border-white/5 space-y-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1 group">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-500 group-focus-within:text-red-500 transition-colors" />
                    <Input
                      placeholder="SCAN RECEIPT OR ENTER INVOICE ID..."
                      className="h-20 pl-16 bg-white/5 border-2 border-white/10 text-2xl font-black text-white rounded-[1.5rem] focus:border-red-500/50 transition-all placeholder:text-slate-800 italic uppercase tracking-tighter"
                      value={ticketId}
                      onChange={(e) => setTicketId(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                    />
                  </div>
                  <Button
                    className="h-20 px-12 bg-red-600 hover:bg-red-500 text-white font-black italic rounded-[1.5rem] shadow-2xl shadow-red-600/20 transition-all uppercase tracking-widest text-sm"
                    onClick={handleLookup}
                    disabled={isSearching}
                  >
                    {isSearching ? <RefreshCw className="w-6 h-6 animate-spin" /> : "Recover Order"}
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
                {!foundOrder ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-700 gap-6 opacity-30">
                    <div className="w-32 h-32 rounded-[2.5rem] bg-white/5 flex items-center justify-center border-4 border-dashed border-white/10">
                      <RotateCcw className="w-16 h-16" />
                    </div>
                    <div className="text-center">
                      <p className="font-black italic uppercase tracking-[0.4em] text-xs">Awaiting Authentication</p>
                      <p className="text-[10px] font-bold mt-2 uppercase tracking-widest">Connect Scanner or Input ID to Begin</p>
                    </div>
                  </div>
                ) : (
                  <ScrollArea className="flex-1 p-8">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center mb-6">
                         <div className="flex items-center gap-4">
                            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-black uppercase text-emerald-500 tracking-[0.3em] italic">Session Authorized: {foundOrder.id}</span>
                         </div>
                         <Badge className="bg-white/5 text-slate-500 border-white/10 font-black italic px-4 py-1 uppercase text-[9px]">
                            {new Date(foundOrder.createdAt).toLocaleString()}
                         </Badge>
                      </div>

                      {(Array.isArray(foundOrder.items) ? foundOrder.items : []).map((item) => {
                        const isSelected = selectedItems.includes(item.itemId);
                        return (
                          <div
                            key={item.itemId}
                            className={`p-6 rounded-[2rem] border transition-all flex items-center justify-between group cursor-pointer ${
                              isSelected
                                ? "bg-red-500/10 border-red-500/30 shadow-[0_0_40px_rgba(239,68,68,0.1)]"
                                : "bg-white/5 border-white/10 hover:border-white/20"
                            }`}
                            onClick={() => toggleItem(item.itemId)}
                          >
                            <div className="flex gap-6">
                              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-inner ${isSelected ? "bg-red-500/20" : "bg-white/5"}`}>
                                <Package className={`w-8 h-8 ${isSelected ? "text-red-500" : "text-slate-500"}`} />
                              </div>
                              <div className="flex flex-col justify-center">
                                <div className="text-lg font-black text-white italic tracking-tight">
                                  {item.name}
                                </div>
                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                                  ID: {item.itemId} • Qty: {item.quantity}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-12">
                               <div className="text-right">
                                  <div className="text-2xl font-black italic text-white tracking-tighter">
                                     Rp {item.totalPrice.toLocaleString()}
                                  </div>
                                  <div className="text-[9px] font-black uppercase text-slate-500 tracking-widest">
                                     Settled Value
                                  </div>
                               </div>
                               <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${isSelected ? 'bg-red-600 text-white shadow-lg' : 'bg-white/5 text-slate-700'}`}>
                                  {isSelected ? <CheckCircle className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
                               </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
                
                {foundOrder && (
                  <div className="p-10 bg-slate-950 text-white flex justify-between items-center border-t border-white/10 relative overflow-hidden shrink-0">
                    <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-red-600/5 rounded-full blur-3xl" />
                    <div>
                      <div className="text-[10px] font-black text-red-500 uppercase tracking-[0.3em] mb-2 italic">
                        Reversal Total
                      </div>
                      <div className="text-5xl font-black italic tracking-tighter">
                        Rp {refundAmount.toLocaleString()}
                      </div>
                    </div>
                    <Button
                      size="lg"
                      className="bg-red-600 hover:bg-red-500 font-black italic h-20 px-16 rounded-[1.5rem] shadow-2xl shadow-red-600/20 text-xl transition-transform active:scale-95 uppercase tracking-widest"
                      onClick={processRefund}
                      disabled={isRefunding || selectedItems.length === 0}
                    >
                      {isRefunding ? <RefreshCw className="w-8 h-8 animate-spin" /> : "Authorize Return"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col gap-8">
            <Card className="border-none bg-red-600/10 backdrop-blur-3xl shadow-2xl rounded-[2.5rem] overflow-hidden group">
              <CardHeader className="py-6 px-8 border-b border-red-500/20">
                <CardTitle className="flex items-center gap-3 text-red-500 text-[11px] uppercase font-black tracking-[0.3em] leading-none italic">
                  <ShieldAlert className="w-5 h-5" /> Policy Enforcement
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <p className="text-[11px] text-slate-400 font-bold leading-relaxed italic uppercase tracking-widest">
                  Returns exceeding <span className="text-red-500">Rp 1,000,000</span> will trigger a supervisor biometric request and zone lockdown.
                </p>
                <div className="p-4 bg-black/20 rounded-2xl border border-red-500/10 flex items-center gap-4">
                   <AlertCircle className="w-5 h-5 text-red-600" />
                   <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest italic">Vault Lock Active</span>
                </div>
              </CardContent>
            </Card>

            <Card className="flex-1 bg-white/5 backdrop-blur-3xl border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col">
              <CardHeader className="border-b border-white/5 p-8">
                <CardTitle className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] italic">
                  Recent Reversals
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-y-auto custom-scrollbar">
                <div className="p-6 space-y-4">
                  {[
                    { id: "ORD-992", amount: "450,000", time: "12m ago" },
                    { id: "ORD-821", amount: "120,500", time: "1h ago" },
                    { id: "ORD-770", amount: "35,000", time: "3h ago" },
                  ].map((log, i) => (
                    <div key={i} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex justify-between items-center hover:bg-white/5 transition-all">
                       <div className="flex items-center gap-4">
                          <History className="w-4 h-4 text-slate-600" />
                          <div className="text-[10px] font-black text-white italic uppercase tracking-tighter">{log.id}</div>
                       </div>
                       <div className="text-right">
                          <div className="text-[10px] font-black text-red-500 italic">Rp {log.amount}</div>
                          <div className="text-[8px] text-slate-600 font-bold uppercase tracking-tighter">{log.time}</div>
                       </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RefundReturnDesk;
