import React, { useState } from "react";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { 
  PackageCheck, 
  Truck, 
  RotateCcw, 
  Search, 
  Filter, 
  ShoppingBag, 
  Globe, 
  Smartphone, 
  AlertCircle, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  Box, 
  ChevronRight, 
  Printer, 
  MoreVertical,
  Layers,
  Zap,
  Tag
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DataTableShell } from "@/core/tools/DataTableShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { retailService } from "@/core/services/retail/retailService";
import { useSession } from "@/core/security/session";
import { useToast } from "@/hooks/use-toast";
import type { RetailOrder, OrderStatus } from "@/core/types/retail/retail";
import { OrderDetailModal } from "./modals/OrderDetailModal";

const OrderFulfillment = () => {
  const session = useSession();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("PENDING");
  const [orders, setOrders] = useState<RetailOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<RetailOrder | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isFastTrackMode, setIsFastTrackMode] = useState(false);

  React.useEffect(() => {
    try {
      const data = retailService.listOrders(session.tenantId!);
      setOrders(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [session.tenantId]);

  const handleReallocate = (orderId: string) => {
    toast({ title: "Stock Re-allocated", description: `Reserved units for ${orderId} have been prioritized from buffer zone A-4.` });
  };

  const handleBatchPick = () => {
    toast({ title: "Batch Initialized", description: "Route optimization complete. Dispatched to pickers mobile terminals." });
  };

  const handleOrderClick = (order: RetailOrder) => {
    setSelectedOrder(order);
    setIsOrderModalOpen(true);
  };

  const handleStatusChange = (orderId: string, newStatus: OrderStatus) => {
    setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    toast({ title: "Order Updated", description: `Order ${orderId} status changed to ${newStatus}` });
  };

  const toggleFastTrack = () => {
    setIsFastTrackMode(!isFastTrackMode);
    toast({ 
      title: isFastTrackMode ? "Fast-Track Disabled" : "Fast-Track Enabled", 
      description: isFastTrackMode ? "Returning to normal queue processing" : "Priority orders moved to front of queue" 
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Orders & Fulfillment Hub" 
        subtitle="Omni-channel orchestration • Pick/Pack coordination • Delivery logistics"
      />
      
      <WorkspacePanel>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
           <Card className="shadow-lg border-slate-200 hover:border-blue-200 transition-all border-l-4 border-l-blue-600">
             <CardContent className="p-6">
               <div className="flex justify-between items-start mb-4">
                 <div className="bg-blue-50 p-2 rounded-xl text-blue-600">
                   <PackageCheck className="w-5 h-5" />
                 </div>
                 <Badge className="bg-blue-100 text-blue-700 border-none font-black italic text-[9px]">LIVE</Badge>
               </div>
               <div className="text-sm font-black text-slate-400 uppercase tracking-widest mb-1">Queue Depth</div>
               <div className="text-3xl font-black italic text-slate-900 tracking-tighter">18 Orders</div>
               <p className="text-[10px] font-bold text-slate-400 mt-2 italic flex items-center gap-1">
                 <Clock className="w-3 h-3 text-amber-500" /> Avg. TAT: 14m 20s
               </p>
             </CardContent>
           </Card>

           <Card className="shadow-lg border-slate-200 hover:border-indigo-200 transition-all border-l-4 border-l-indigo-600">
             <CardContent className="p-6">
               <div className="flex justify-between items-start mb-4">
                 <div className="bg-indigo-50 p-2 rounded-xl text-indigo-600">
                   <Truck className="w-5 h-5" />
                 </div>
                 <Badge variant="outline" className="border-indigo-200 text-indigo-600 font-black italic text-[9px]">SHIPPING</Badge>
               </div>
               <div className="text-sm font-black text-slate-400 uppercase tracking-widest mb-1">Courier Pickup</div>
               <div className="text-3xl font-black italic text-slate-900 tracking-tighter">8 Awaiting</div>
               <p className="text-[10px] font-bold text-slate-400 mt-2 italic">Next Slot: 14:00 (JNE Express)</p>
             </CardContent>
           </Card>

           <Card className="shadow-lg border-slate-200 hover:border-emerald-200 transition-all border-l-4 border-l-emerald-600">
             <CardContent className="p-6">
               <div className="flex justify-between items-start mb-4">
                 <div className="bg-emerald-50 p-2 rounded-xl text-emerald-600">
                   <CheckCircle2 className="w-5 h-5" />
                 </div>
                 <Badge className="bg-emerald-100 text-emerald-700 border-none font-black italic text-[9px]">COMPLETED</Badge>
               </div>
               <div className="text-sm font-black text-slate-400 uppercase tracking-widest mb-1">Today's Volume</div>
               <div className="text-3xl font-black italic text-slate-900 tracking-tighter">142 Units</div>
               <p className="text-[10px] font-bold text-slate-400 mt-2 italic">98.5% On-Time Fulfillment</p>
             </CardContent>
           </Card>

           <Card className="shadow-lg border-slate-200 hover:border-amber-200 transition-all border-l-4 border-l-amber-600">
             <CardContent className="p-6">
               <div className="flex justify-between items-start mb-4">
                 <div className="bg-amber-50 p-2 rounded-xl text-amber-600">
                   <AlertCircle className="w-5 h-5" />
                 </div>
                 <Badge variant="destructive" className="border-none font-black italic text-[9px]">ATTENTION</Badge>
               </div>
               <div className="text-sm font-black text-slate-400 uppercase tracking-widest mb-1">Bottlenecks</div>
               <div className="text-3xl font-black italic text-slate-900 tracking-tighter">3 Exceptions</div>
               <p className="text-[10px] font-bold text-slate-400 mt-2 italic tracking-tighter uppercase">Address Verification Failed</p>
             </CardContent>
           </Card>
        </div>

        <div className="flex items-center gap-4 mb-8 bg-slate-50 p-4 rounded-3xl border border-slate-200">
           <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                className="pl-12 h-14 bg-white border-slate-200 rounded-2xl text-sm font-bold italic placeholder:text-slate-300 focus-visible:ring-blue-500 shadow-sm" 
                placeholder="Search Order ID, Airway Bill, or Customer Name..."
              />
           </div>
           <Button variant="outline" className="h-14 px-6 rounded-2xl gap-2 font-black italic border-slate-200 hover:bg-slate-100">
              <Filter className="w-4 h-4" /> Filters
           </Button>
           <Button 
              onClick={toggleFastTrack}
              className={`h-14 px-8 rounded-2xl gap-2 font-black italic shadow-xl transition-all ${
                isFastTrackMode 
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white' 
                  : 'bg-amber-600 hover:bg-amber-500 text-white'
              }`}
            >
               <Zap className={`w-5 h-5 ${isFastTrackMode ? 'animate-pulse' : ''}`} /> 
               {isFastTrackMode ? 'Fast-Track ON' : 'Fast-Track Mode'}
            </Button>
           <Button className="h-14 px-8 rounded-2xl gap-2 bg-slate-900 hover:bg-slate-800 font-black italic shadow-xl">
              <Layers className="w-5 h-5" /> Bulk Actions
           </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
           <div className="lg:col-span-3">
              <DataTableShell 
                title="Unified Fulfillment Queue" 
                subtitle="Real-time multi-channel orchestration stream"
              >
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Order Context</th>
                      <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Orchestration Source</th>
                      <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Payload</th>
                      <th className="px-6 py-5 text-center text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Status</th>
                      <th className="px-6 py-5 text-right text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Tat</th>
                      <th className="px-6 py-5"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                     {isLoading ? (
                       <tr>
                         <td colSpan={6} className="px-6 py-20 text-center text-slate-400 font-black italic uppercase text-xs tracking-widest animate-pulse">Syncing Order Queue...</td>
                       </tr>
                     ) : orders.map((order, i) => (
                       <tr 
                         key={i} 
                         onClick={() => handleOrderClick(order)}
                         className="group hover:bg-blue-50/50 transition-colors cursor-pointer"
                       >
                         <td className="px-6 py-5">
                            <div className="flex items-center gap-4">
                               <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black italic text-[10px] shadow-inner ${order.totalAmount > 5000000 ? 'bg-red-50 text-red-500' : 'bg-slate-50 text-slate-400'}`}>
                                  {order.id.slice(-4)}
                               </div>
                               <div>
                                  <div className="text-sm font-black italic tracking-tight text-slate-900">{order.id}</div>
                                  <Badge className="bg-blue-50 text-blue-600 border-none text-[8px] font-black italic uppercase">{order.totalAmount > 5000000 ? "HIGH" : "NORMAL"}</Badge>
                               </div>
                            </div>
                         </td>
                         <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                               <div className="p-2 rounded-lg bg-slate-100 text-slate-500 group-hover:bg-slate-900 group-hover:text-white transition-all">
                                  {order.paymentMethod === 'qr' ? <Globe className="w-4 h-4" /> : order.paymentMethod === 'card' ? <ShoppingBag className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
                               </div>
                               <div>
                                  <div className="text-xs font-bold text-slate-600 italic leading-tight">{order.paymentMethod || "UNSET"}</div>
                                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{order.storeId}</div>
                                </div>
                             </div>
                          </td>
                          <td className="px-6 py-5">
                             <div className="text-xs font-black italic text-slate-900">Rp {order.totalAmount.toLocaleString()}</div>
                             <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{order.items?.length || 0} Items</div>
                          </td>
                          <td className="px-6 py-5 text-center">
                             <Badge className={`${order.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'} border-none font-black italic text-[8px] tracking-widest px-3 py-1 ring-1 ring-inset ${order.status === 'paid' ? 'ring-emerald-200' : 'ring-amber-200'}`}>
                                {order.status}
                             </Badge>
                          </td>
                          <td className="px-6 py-5 text-right font-black italic text-[10px] text-slate-500">
                             {new Date(order.createdAt).toLocaleTimeString()}
                          </td>
                          <td className="px-6 py-5 text-right">
                             <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600" onClick={() => toast({ title: "Printing Label", description: `Manifest generated for ${order.id}` })}><Printer className="w-4 h-4" /></Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-900"><MoreVertical className="w-4 h-4" /></Button>
                             </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </DataTableShell>
           </div>

           <div className="space-y-8">
              <Card className="bg-slate-900 text-white shadow-2xl rounded-3xl overflow-hidden group">
                 <CardHeader className="p-8 pb-4 flex flex-row items-center justify-between">
                    <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 italic">Logistics Pulse</CardTitle>
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
                 </CardHeader>
                 <CardContent className="p-8 pt-0 space-y-6">
                    <div className="space-y-4">
                       <div className="flex justify-between items-end">
                          <div className="text-4xl font-black italic tracking-tighter">92%</div>
                          <div className="text-right">
                             <div className="text-[10px] font-black opacity-40 uppercase">SLA Adherence</div>
                             <Badge className="bg-indigo-600 font-black italic text-[9px]">OPERATIONAL</Badge>
                          </div>
                       </div>
                       <Progress value={92} className="h-2 bg-slate-800" />
                    </div>
                    
                    <Separator className="bg-white/10" />

                    <div className="space-y-4">
                        <div className="text-[10px] font-black uppercase text-slate-500 tracking-widest italic mb-4">Courier Allocation</div>
                        {[
                          { name: "JNE Express", share: 45, status: "ON_TIME" },
                          { name: "GrabExpress", share: 30, status: "BUSY" },
                          { name: "NinjaVan", share: 25, status: "ON_TIME" },
                        ].map((c, i) => (
                           <div key={i} className="flex flex-col gap-2">
                              <div className="flex justify-between text-[10px] font-bold">
                                 <span className="italic">{c.name}</span>
                                 <span className={c.status === 'BUSY' ? 'text-amber-400' : 'text-emerald-400'}>{c.share}%</span>
                              </div>
                              <Progress value={c.share} className="h-1 bg-slate-800" />
                           </div>
                        ))}
                    </div>
                 </CardContent>
              </Card>

              <Card className="shadow-lg border-slate-200 rounded-3xl overflow-hidden">
                 <CardHeader className="p-6">
                    <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Critical Delays</CardTitle>
                 </CardHeader>
                 <CardContent className="p-6 pt-0 space-y-4">
                    <div className="p-5 rounded-2xl bg-red-50 border border-red-100 relative group overflow-hidden">
                       <div className="absolute top-0 right-0 p-3 opacity-10">
                          <AlertCircle className="w-12 h-12" />
                       </div>
                       <div className="text-[10px] font-black text-red-600 uppercase mb-1">Pick Gap Detected</div>
                       <div className="text-xs font-bold leading-relaxed mb-3">Item #SKU-9921 missing from Bin 4-A for Order ORD-9912.</div>
                       <Button 
                        variant="outline" 
                        className="w-full h-10 border-red-200 text-red-700 font-black italic text-[9px] uppercase hover:bg-red-100 rounded-xl transition-all"
                        onClick={() => handleReallocate("ORD-JK-9912")}
                       >
                          RE-ALLOCATE FROM BUFFER
                       </Button>
                    </div>
                 </CardContent>
              </Card>

              <Card className="shadow-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-[2.5rem] overflow-hidden group">
                 <CardContent className="p-8 space-y-4 text-center">
                    <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4">
                       <Zap className="w-8 h-8" />
                    </div>
                    <div className="text-xl font-black italic tracking-tighter">Fast-Track Mode</div>
                    <p className="text-[10px] opacity-70 leading-relaxed font-bold italic">Optimize picking route for the next 2 hours based on priority queue density.</p>
                     <Button 
                      className="w-full bg-white text-blue-600 hover:bg-slate-50 font-black italic h-12 rounded-xl shadow-xl transition-all"
                      onClick={handleBatchPick}
                     >
                       Enable Batch Picking
                     </Button>
                 </CardContent>
              </Card>
           </div>
        </div>
      </WorkspacePanel>

      <OrderDetailModal
        order={selectedOrder}
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
};

export default OrderFulfillment;
