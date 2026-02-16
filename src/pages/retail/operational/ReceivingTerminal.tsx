import React, { useState, useEffect } from "react";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { Truck, ScanBarcode, ClipboardCheck, AlertTriangle, Package2, ArrowRight, RefreshCw, CheckCircle2, History, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { retailService } from "@/core/services/retail/retailService";
import { useSession } from "@/core/security/session";

interface ShipmentItem {
  itemId: string;
  name: string;
  expected: number;
  received: number;
}

interface Shipment {
  id: string;
  vendor: string;
  items: ShipmentItem[];
  priority: "HIGH" | "NORMAL";
  status: "pending" | "receiving" | "completed";
}

const ReceivingTerminal = () => {
  const session = useSession();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [activeShipment, setActiveShipment] = useState<Shipment | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeShift, setActiveShift] = useState<any | null>(null);

  useEffect(() => {
    try {
      const shifts = retailService.listShifts(session.tenantId!);
      const openShift = shifts.find(s => s.status === "open" && s.employeeId === session.userId);
      setActiveShift(openShift || null);
    } catch (e) {
      console.error("Failed to fetch shift", e);
    }
  }, [session.tenantId, session.userId]);

  useEffect(() => {
    // Mock fetching POs
    const mockPOs: Shipment[] = [
      { 
        id: "PO-ZVX-991", 
        vendor: "Central Distribution", 
        priority: "HIGH", 
        status: "pending",
        items: [
          { itemId: "p1", name: "Premium Arabica 250g", expected: 50, received: 0 },
          { itemId: "p2", name: "Dark Roast 250g", expected: 25, received: 0 },
        ]
      },
      { 
        id: "PO-LBC-442", 
        vendor: "Local Beverage Co.", 
        priority: "NORMAL", 
        status: "pending",
        items: [
          { itemId: "p3", name: "Iced Latte Cans", expected: 100, received: 0 },
        ]
      }
    ];
    setShipments(mockPOs);
    setIsLoading(false);
  }, []);

  const startIntake = (shipment: Shipment) => {
    setActiveShipment({ ...shipment, status: "receiving" });
  };

  const updateReceived = (itemId: string, delta: number) => {
    if (!activeShipment) return;
    const newItems = activeShipment.items.map(item => 
      item.itemId === itemId ? { ...item, received: Math.max(0, item.received + delta) } : item
    );
    setActiveShipment({ ...activeShipment, items: newItems });
  };

  const completeIntake = async () => {
    if (!activeShipment) return;
    setIsProcessing(true);
    try {
      await retailService.receiveGoods(
        session.tenantId!,
        session,
        "store-1", // Mock storeId
        activeShipment.id, // shipmentId
        activeShipment.items.map(i => ({ itemId: i.itemId, received: i.received })),
        activeShift?.id
      );
      
      const variances = activeShipment.items.filter(i => i.received !== i.expected);
      if (variances.length > 0) {
        toast({
          title: "Intake with Variance",
          description: `Shipment ${activeShipment.id} synchronized with ${variances.length} discrepancies.`,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Intake Successful",
          description: `Shipment ${activeShipment.id} matched perfectly. Inventory updated.`,
        });
      }

      setShipments(prev => prev.map(s => s.id === activeShipment.id ? { ...activeShipment, status: "completed" } : s));
      setActiveShipment(null);
    } catch (error: any) {
      toast({ title: "Nexus Sync Failed", description: error.message || "Unknown error", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="h-screen flex flex-col p-2 overflow-hidden bg-slate-50">
      <WorkspacePanel className="flex-1 overflow-auto rounded-[2rem]">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-6">
            {!activeShipment ? (
              <Card className="shadow-2xl border-slate-200 rounded-[2rem] overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50/80 p-8">
                  <CardTitle className="text-xl flex items-center gap-3 font-black italic text-slate-800 tracking-tighter uppercase">
                    <Truck className="w-7 h-7 text-blue-600" />
                    Inbound Delivery Queue
                  </CardTitle>
                  <Button 
                    variant="outline" 
                    className="gap-2 font-black italic border-slate-300 rounded-xl px-6 h-12 shadow-sm hover:bg-blue-50 hover:text-blue-600 transition-all"
                    onClick={() => {
                      const first = shipments.find(s => s.status === 'pending');
                      if (first) {
                        startIntake(first);
                        toast({ title: "Slip Recognized", description: `Loading Manifest: ${first.id}` });
                      } else {
                        toast({ title: "Scan Error", description: "No pending shipments found in the logistics node." });
                      }
                    }}
                  >
                    <ScanBarcode className="w-5 h-5" /> SCAN DELIVERY SLIP
                  </Button>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="space-y-4">
                    {isLoading ? (
                      <div className="py-20 text-center text-slate-400 font-black italic uppercase animate-pulse">Scanning Logistics Nexus...</div>
                    ) : shipments.filter(s => s.status !== "completed").map((shipment) => (
                      <div key={shipment.id} className="p-6 rounded-[1.5rem] border-2 border-slate-50 flex items-center justify-between hover:border-blue-200 hover:shadow-2xl transition-all cursor-pointer group bg-white">
                        <div className="flex gap-5">
                          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-300 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner">
                            <Package2 className="w-8 h-8" />
                          </div>
                          <div>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Manifest ID</div>
                            <div className="text-xl font-black italic text-slate-900 leading-tight tracking-tighter">{shipment.id}</div>
                            <div className="text-[10px] text-blue-600 font-bold uppercase tracking-tighter mt-1">{shipment.vendor}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-10">
                          <div className="text-right">
                            <div className="text-lg font-black text-slate-900 italic">{shipment.items.reduce((a, b) => a + b.expected, 0)} SKUs</div>
                            <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{shipment.status === 'pending' ? 'UNPROCESSED' : 'RECEIVING'}</div>
                          </div>
                          <Badge className={shipment.priority === 'HIGH' ? 'bg-red-50 text-red-600 border-none font-black italic text-[9px] px-3' : 'bg-slate-100 text-slate-500 border-none font-black italic text-[9px] px-3'}>
                            {shipment.priority} PRIORITY
                          </Badge>
                          <Button 
                            className="bg-slate-900 hover:bg-slate-800 font-black italic rounded-xl px-8 h-12 shadow-xl"
                            onClick={() => startIntake(shipment)}
                          >
                            OPEN INTAKE
                          </Button>
                        </div>
                      </div>
                    ))}

                    {!isLoading && shipments.filter(s => s.status !== "completed").length === 0 && (
                      <div className="py-20 flex flex-col items-center justify-center text-slate-300">
                        <ClipboardCheck className="w-20 h-20 mb-4 opacity-5" />
                        <p className="font-black italic uppercase tracking-[0.3em] text-xs">Dock Cleaned • Manifests Complete</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-700">
                <Card className="shadow-3xl border-blue-200 overflow-hidden rounded-[2.5rem]">
                  <CardHeader className="bg-slate-900 text-white flex flex-row items-center justify-between p-8 border-b border-white/5">
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <Truck className="w-8 h-8" />
                      </div>
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 italic">Live Intake Protocol</div>
                        <CardTitle className="text-3xl font-black italic tracking-tighter">{activeShipment.id}</CardTitle>
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-tighter">{activeShipment.vendor}</div>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      className="text-white hover:bg-white/10 p-3 rounded-xl"
                      onClick={() => setActiveShipment(null)}
                    >
                      <X className="w-7 h-7" />
                    </Button>
                  </CardHeader>
                  <CardContent className="p-0 bg-white">
                    <ScrollArea className="max-h-[600px]">
                      <div className="p-8 space-y-4">
                        {activeShipment.items.map((item) => {
                          const hasVariance = item.received !== item.expected;
                          return (
                            <div key={item.itemId} className={`p-6 rounded-2xl border-2 transition-all flex items-center justify-between group ${
                              hasVariance && item.received > 0 ? 'bg-red-50/50 border-red-100 shadow-md' : 'bg-white border-slate-50 hover:border-slate-200'
                            }`}>
                              <div className="flex gap-5">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${hasVariance && item.received > 0 ? 'bg-red-100' : 'bg-slate-50'}`}>
                                  <Package2 className={`w-7 h-7 ${hasVariance && item.received > 0 ? 'text-red-600' : 'text-slate-300'}`} />
                                </div>
                                <div className="min-w-0 flex flex-col justify-center">
                                  <div className="text-base font-black text-slate-900 italic leading-none">{item.name}</div>
                                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-2">SKU: {item.itemId}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-16">
                                <div className="text-center">
                                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Manifested</div>
                                  <div className="text-xl font-black italic text-slate-500">{item.expected}</div>
                                </div>
                                <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border-2 border-slate-100 shadow-inner">
                                  <Button 
                                    className="h-10 w-10 p-0 bg-white hover:bg-slate-100 text-slate-400 border border-slate-200 shadow-sm rounded-xl font-black"
                                    onClick={() => updateReceived(item.itemId, -1)}
                                  >
                                    -
                                  </Button>
                                  <div className="w-16 text-center text-2xl font-black italic tracking-tighter text-slate-900">{item.received}</div>
                                  <Button 
                                    className="h-10 w-10 p-0 bg-white hover:bg-slate-100 text-slate-400 border border-slate-200 shadow-sm rounded-xl font-black"
                                    onClick={() => updateReceived(item.itemId, 1)}
                                  >
                                    +
                                  </Button>
                                </div>
                                <div className="w-24 flex justify-end">
                                  {hasVariance && item.received > 0 && (
                                    <Badge className="bg-red-600 text-white border-none text-[9px] font-black italic px-3 py-1 animate-in zoom-in-50 duration-300 shadow-lg shadow-red-500/20">
                                      {item.received - item.expected > 0 ? `+${item.received - item.expected}` : item.received - item.expected} DELTA
                                    </Badge>
                                  )}
                                  {!hasVariance && item.received > 0 && (
                                    <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center border-2 border-emerald-100 animate-in zoom-in-50 duration-300">
                                      <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                    <div className="p-10 bg-slate-900 text-white flex justify-between items-center rounded-t-[3rem] shadow-4xl relative overflow-hidden">
                      <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-blue-600/5 rounded-full blur-3xl" />
                      <div>
                        <div className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mb-2 italic">Consignment Aggregation</div>
                        <div className="text-4xl font-black italic tracking-tighter">
                          {activeShipment.items.reduce((a, b) => a + b.received, 0)} <span className="text-lg text-slate-500 not-italic">/ {activeShipment.items.reduce((a, b) => a + b.expected, 0)} UNITS</span>
                        </div>
                      </div>
                      <Button 
                        size="lg" 
                        className="bg-blue-600 hover:bg-blue-500 font-black italic h-20 px-14 rounded-2xl shadow-3xl shadow-blue-500/20 text-lg transition-transform active:scale-95 uppercase tracking-widest"
                        onClick={completeIntake}
                        disabled={isProcessing}
                      >
                        {isProcessing ? <RefreshCw className="w-8 h-8 animate-spin" /> : "COMMIT TO STOCK"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <Card className="border-red-100 bg-red-50/20 shadow-xl rounded-[2rem] border-2 overflow-hidden">
              <CardHeader className="py-6 px-8 border-b border-red-100 bg-white/50">
                <CardTitle className="flex items-center gap-3 text-red-900 text-[11px] uppercase font-black tracking-[0.2em] leading-none italic">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  Variance Watch
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <p className="text-[11px] text-red-800 font-bold leading-relaxed italic">
                  Critical Alert: <strong>3 SKU mismatches</strong> detected in morning transit. 
                  Shipment <span className="underline">PO-X282</span> requires immediate supervisor sign-off.
                </p>
                <Button className="w-full text-[10px] font-black italic uppercase h-12 bg-red-600 text-white hover:bg-red-700 transition-all rounded-xl shadow-lg shadow-red-200">
                  FLAG INTAKE ERRORS
                </Button>
              </CardContent>
            </Card>

            <Card className="shadow-2xl border-slate-100 rounded-[2rem] bg-white overflow-hidden">
              <CardHeader className="border-b bg-slate-50/50 p-6">
                <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic">Process Velocity</CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                <div>
                  <div className="flex justify-between items-end mb-3">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Efficiency Index</span>
                    <span className="text-2xl font-black italic text-slate-900">92%</span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner border border-slate-50">
                    <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 w-[92%] transition-all duration-1500" />
                  </div>
                </div>
                <div className="space-y-4 pt-2">
                   <div className="flex items-center gap-4">
                      <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]" />
                      <span className="text-[10px] font-black uppercase text-slate-500 tracking-tighter italic">Ledger Sync: REALTIME</span>
                   </div>
                   <div className="flex items-center gap-4">
                      <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]" />
                      <span className="text-[10px] font-black uppercase text-slate-500 tracking-tighter italic">Inventory Node: JKT-BACK</span>
                   </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </WorkspacePanel>
    </div>
  );
};

export default ReceivingTerminal;
