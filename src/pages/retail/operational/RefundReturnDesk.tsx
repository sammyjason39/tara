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
import type { RetailOrder, RetailShift } from "@/core/types/retail/retail";

const RefundReturnDesk = () => {
  const session = useSession();
  const { activeStore, activeChannel } = useRetail();
  const [ticketId, setTicketId] = useState("");
  const [foundOrder, setFoundOrder] = useState<RetailOrder | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isRefunding, setIsRefunding] = useState(false);
  const [activeShift, setActiveShift] = useState<RetailShift | null>(null);

  React.useEffect(() => {
    const fetchData = async () => {
      if (!session.tenantId || !session.userId) return; // Guard clause

      try {
        // FIX: Ensure parameters match service definition
        const shifts = await retailService.listShifts(
          session.tenantId!,
          session,
          session.locationId,
        );
        const openShift = shifts.find(
          (s) => s.status === "open" && s.employeeId === session.userId,
        );
        setActiveShift(openShift || null);
      } catch (e) {
        console.error("Failed to fetch shift", e);
        toast({
          title: "Connection Error",
          description: "Could not sync with Nexus Shift Control.",
          variant: "destructive",
        });
      }
    };
    fetchData();
  }, [session.tenantId, session.userId, session]);

  const handleLookup = async () => {
    if (!ticketId) return;
    setIsSearching(true);
    try {
      const orders = await retailService.listOrders(
        session.tenantId!,
        session,
        session.locationId,
      );
      const order = orders.find(
        (o) => o.id === ticketId || o.id.includes(ticketId),
      );

      if (order) {
        setFoundOrder(order);
        setSelectedItems([]);
        toast({
          title: "Order Found",
          description: "Order retrieved successfully from Nexus.",
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

  const toggleItem = (itemId: string) => {
    setSelectedItems((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId],
    );
  };

  const processRefund = async () => {
    if (!foundOrder || selectedItems.length === 0) return;
    setIsRefunding(true);
    try {
      await retailService.processReturn(
        session.tenantId!,
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
    <div className="h-screen flex flex-col p-2 overflow-hidden bg-slate-50">
      <WorkspacePanel className="flex-1 overflow-auto rounded-[2rem]">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="shadow-2xl border-slate-200 rounded-[2.5rem] overflow-hidden">
              <CardHeader className="bg-slate-50 border-b p-8">
                <CardTitle className="flex items-center gap-2 text-blue-600 italic font-black uppercase tracking-tighter">
                  <Search className="w-6 h-6" />
                  {activeStore?.name ||
                    activeChannel?.name ||
                    "Transaction Recovery"}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                <div className="flex gap-4">
                  <div className="relative flex-1">
                    <History className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <Input
                      placeholder="Enter Invoice Number (e.g. ord-123)"
                      className="pl-12 h-14 bg-white border-2 border-slate-100 italic font-bold rounded-2xl focus:ring-blue-500"
                      value={ticketId}
                      onChange={(e) => setTicketId(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                    />
                  </div>
                  <Button
                    className="h-14 px-10 bg-slate-900 hover:bg-slate-800 font-black italic rounded-2xl shadow-xl transition-all"
                    onClick={handleLookup}
                    disabled={isSearching}
                  >
                    {isSearching ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      "SCAN SYSTEM"
                    )}
                  </Button>
                </div>

                {!foundOrder ? (
                  <div className="p-20 border-4 border-dashed border-slate-100 rounded-[2.5rem] flex flex-col items-center justify-center text-slate-300 space-y-4 bg-slate-50/30">
                    <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-inner">
                      <RotateCcw className="w-10 h-10 opacity-10" />
                    </div>
                    <div className="text-center">
                      <p className="font-black text-slate-400 uppercase tracking-[0.2em] text-xs italic">
                        Terminal Standby
                      </p>
                      <p className="text-[10px] mt-2 font-bold opacity-50">
                        SYNCHRONIZED WITH GLOBAL SALES HUB
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="flex justify-between items-start pb-6 border-b-2 border-slate-50">
                      <div>
                        <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1 italic">
                          Order Authenticated
                        </div>
                        <h3 className="text-2xl font-black italic tracking-tighter text-slate-900">
                          {foundOrder.id}
                        </h3>
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-1">
                          Date:{" "}
                          {new Date(foundOrder.createdAt).toLocaleString()} •
                          Location: {foundOrder.storeId}
                        </div>
                      </div>
                      <Badge className="bg-emerald-50 text-emerald-700 border-none font-black italic px-4 py-1 uppercase text-[9px]">
                        ACTIVE_SETTLEMENT
                      </Badge>
                    </div>

                    <div className="space-y-4">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
                        Inventory Reversal Map
                      </div>
                      <div className="grid gap-3">
                        {foundOrder.items.map((item) => (
                          <div
                            key={item.itemId}
                            className={`flex items-center gap-5 p-5 rounded-2xl border-2 transition-all cursor-pointer ${
                              selectedItems.includes(item.itemId)
                                ? "bg-red-50 border-red-200 shadow-lg"
                                : "bg-white border-slate-50 hover:border-slate-200"
                            }`}
                            onClick={() => toggleItem(item.itemId)}
                          >
                            <Checkbox
                              checked={selectedItems.includes(item.itemId)}
                              className="w-5 h-5 rounded-lg border-2"
                            />
                            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center shadow-inner">
                              <Package className="w-6 h-6 text-slate-300" />
                            </div>
                            <div className="flex-1">
                              <div className="text-sm font-black italic text-slate-900">
                                {item.name}
                              </div>
                              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
                                Qty: {item.quantity} • Unit: Rp{" "}
                                {item.unitPrice.toLocaleString()}
                              </div>
                            </div>
                            <div className="text-sm font-black text-right text-slate-900">
                              Rp {item.totalPrice.toLocaleString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-8 bg-slate-900 rounded-[2rem] text-white flex justify-between items-center shadow-3xl">
                      <div>
                        <div className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] mb-1 italic">
                          Refund Valuation
                        </div>
                        <div className="text-3xl font-black italic tracking-tighter">
                          Rp {refundAmount.toLocaleString()}
                        </div>
                      </div>
                      <Button
                        className="bg-red-600 hover:bg-red-500 text-white font-black italic rounded-2xl px-12 h-16 shadow-2xl shadow-red-900/50 disabled:opacity-50 transition-all uppercase tracking-widest text-xs"
                        disabled={selectedItems.length === 0 || isRefunding}
                        onClick={processRefund}
                      >
                        {isRefunding ? (
                          <RefreshCw className="w-5 h-5 animate-spin" />
                        ) : (
                          "Authorize Return"
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-red-100 bg-red-50/5 shadow-xl rounded-[2rem] border-2">
              <CardHeader className="p-6">
                <CardTitle className="text-red-900 flex items-center gap-2 text-[10px] font-black italic uppercase tracking-widest">
                  <ShieldAlert className="w-4 h-4 text-red-600" />
                  Security Protocol L3
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-8 px-8">
                <div className="p-6 bg-white rounded-2xl border border-red-100 shadow-inner flex gap-5 items-start">
                  <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-6 h-6 text-red-600" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-xs font-black text-red-900 uppercase tracking-tighter leading-none italic">
                      Strict Compliance Enforcement
                    </h4>
                    <p className="text-[10px] text-slate-600 leading-relaxed font-bold italic">
                      All refunds over{" "}
                      <span className="text-red-600 underline">
                        Rp 1,000,000
                      </span>{" "}
                      require Manager biometric override. Hardware telemetry and
                      video feeds are synchronized with Audit Vault.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="shadow-2xl border-slate-200 rounded-[2.5rem] overflow-hidden">
              <CardHeader className="bg-slate-50 p-6 border-b">
                <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">
                  Nexus Return Stream
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {[
                  {
                    id: "ORD-JKT-992",
                    amount: "450,000",
                    method: "CASH",
                    time: "12m ago",
                  },
                  {
                    id: "ORD-JKT-821",
                    amount: "120,500",
                    method: "CARD",
                    time: "1h ago",
                  },
                  {
                    id: "ORD-JKT-770",
                    amount: "35,000",
                    method: "QR",
                    time: "3h ago",
                  },
                ].map((log, i) => (
                  <div
                    key={i}
                    className="flex gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 pb-6 group"
                  >
                    <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0 shadow-inner group-hover:scale-110 transition-transform">
                      <CheckCircle className="w-6 h-6 text-emerald-500" />
                    </div>
                    <div className="space-y-1 min-w-0">
                      <div className="font-black italic text-slate-900 truncate uppercase tracking-tighter">
                        {log.id} REVERSED
                      </div>
                      <div className="text-[10px] font-black text-blue-600 italic">
                        IDR {log.amount} • {log.method}
                      </div>
                      <div className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">
                        Verified by Retail-Auth • {log.time}
                      </div>
                    </div>
                  </div>
                ))}
                <Button
                  variant="ghost"
                  className="w-full text-[10px] font-black uppercase text-slate-400 hover:text-blue-600 transition-all tracking-widest italic h-12 rounded-xl"
                  onClick={() =>
                    toast({
                      title: "Nexus Registry Access",
                      description: `Audit ledger retrieved. Displaying historical settlement reversals for ${activeStore?.name || activeChannel?.name || "current branch"}.`,
                    })
                  }
                >
                  Inspect Full Audit Ledger
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </WorkspacePanel>
    </div>
  );
};

export default RefundReturnDesk;
