import React, { useMemo, useState, useEffect } from "react";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { BarChart3, TrendingUp, Users, AlertCircle, ShoppingBag, Clock, ShieldCheck, ArrowUpRight, ArrowDownRight, Activity, DollarSign, Smartphone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area 
} from 'recharts';
import { retailService } from "@/core/services/retail/retailService";
import { useSession } from "@/core/security/session";
import type { RetailOrder, RetailStore, POSDevice } from "@/core/types/retail/retail";
import { useToast } from "@/hooks/use-toast";

const SALES_DATA = [
  { time: '08:00', sales: 1200, orders: 15 },
  { time: '10:00', sales: 2400, orders: 28 },
  { time: '12:00', sales: 5200, orders: 52 },
  { time: '14:00', sales: 4800, orders: 45 },
  { time: '16:00', sales: 6100, orders: 60 },
  { time: '18:00', sales: 8400, orders: 85 },
  { time: '20:00', sales: 4200, orders: 40 },
];

const StoreDashboard = () => {
  const session = useSession();
  const { toast } = useToast();
  const [orders, setOrders] = useState<RetailOrder[]>([]);
  const [devices, setDevices] = useState<POSDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = () => {
      try {
        const orderData = retailService.listOrders(session.tenantId);
        const deviceData = retailService.listDevices(session.tenantId);
        setOrders(orderData);
        setDevices(deviceData);
      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [session.tenantId]);

  const stats = useMemo(() => {
    const totalSales = orders.reduce((sum, o) => sum + o.totalAmount, 0);
    const orderCount = orders.length;
    const avgTicket = orderCount > 0 ? totalSales / orderCount : 0;
    const activeDevices = devices.filter(d => d.isActive).length;
    
    return {
      totalSales,
      orderCount,
      avgTicket,
      activeDevices
    };
  }, [orders, devices]);

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Store Command Center" 
        subtitle={`Real-time Operational Vitals • ${session.tenantId} • Session: Active`}
      />
      
      <WorkspacePanel>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card 
            onClick={() => toast({ title: "Sales Analytics", description: "Drilling down into hourly revenue streams..." })}
            className="shadow-lg border-blue-100 bg-white group hover:shadow-blue-200/40 transition-all border-l-4 border-l-blue-600 cursor-pointer"
          >
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-blue-50 p-2 rounded-xl text-blue-600">
                  <DollarSign className="w-5 h-5" />
                </div>
                <Badge className="bg-emerald-50 text-emerald-700 border-none font-black italic">
                  <ArrowUpRight className="w-3 h-3 mr-1" /> 12%
                </Badge>
              </div>
              <div className="text-sm font-black text-slate-400 uppercase tracking-widest mb-1">Gross Sales</div>
              <div className="text-3xl font-black italic text-slate-900 tracking-tighter">
                Rp {(stats.totalSales / 1000000).toFixed(1)}M
              </div>
              <p className="text-[10px] font-bold text-slate-400 mt-2 italic">Total revenue for current period</p>
            </CardContent>
          </Card>
          
          <Card 
            onClick={() => toast({ title: "Transaction Log", description: "Viewing all processed orders for this session..." })}
            className="shadow-lg border-indigo-100 bg-white group hover:shadow-indigo-200/40 transition-all border-l-4 border-l-indigo-600 cursor-pointer"
          >
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-indigo-50 p-2 rounded-xl text-indigo-600">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <Badge className="bg-emerald-50 text-emerald-700 border-none font-black italic">
                  <ArrowUpRight className="w-3 h-3 mr-1" /> 8%
                </Badge>
              </div>
              <div className="text-sm font-black text-slate-400 uppercase tracking-widest mb-1">Transaction Count</div>
              <div className="text-3xl font-black italic text-slate-900 tracking-tighter">{stats.orderCount}</div>
              <p className="text-[10px] font-bold text-slate-400 mt-2 italic">Average Rp {(stats.avgTicket / 1000).toFixed(1)}k / Ticket</p>
            </CardContent>
          </Card>
          
          <Card 
            onClick={() => toast({ title: "Inventory Alerts", description: "Opening critical stock depletion report..." })}
            className="shadow-lg border-amber-100 bg-white group hover:shadow-amber-200/40 transition-all border-l-4 border-l-amber-500 cursor-pointer"
          >
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-amber-50 p-2 rounded-xl text-amber-600">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <Badge className="bg-red-50 text-red-700 border-none font-black italic">
                  URGENT
                </Badge>
              </div>
              <div className="text-sm font-black text-slate-400 uppercase tracking-widest mb-1">Inventory Alerts</div>
              <div className="text-3xl font-black italic text-slate-900 tracking-tighter">3 SKU</div>
              <p className="text-[10px] font-bold text-slate-400 mt-2 italic">Critical depletion in Beverages</p>
            </CardContent>
          </Card>
          
          <Card 
            onClick={() => toast({ title: "System Health", description: "Running diagnostic ping on all terminals..." })}
            className="shadow-lg border-purple-100 bg-white group hover:shadow-purple-200/40 transition-all border-l-4 border-l-purple-600 cursor-pointer"
          >
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-purple-50 p-2 rounded-xl text-purple-600">
                  <Activity className="w-5 h-5" />
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[10px] font-black uppercase text-green-600">Online</span>
                </div>
              </div>
              <div className="text-sm font-black text-slate-400 uppercase tracking-widest mb-1">Terminal Health</div>
              <div className="text-3xl font-black italic text-slate-900 tracking-tighter">{stats.activeDevices} Systems</div>
              <p className="text-[10px] font-bold text-slate-400 mt-2 italic">All POS & Scales Operational</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card className="lg:col-span-2 shadow-xl border-slate-200 overflow-hidden rounded-3xl">
            <CardHeader className="bg-slate-900 text-white flex flex-row items-center justify-between p-6">
              <div>
                <CardTitle className="text-xl font-black italic tracking-tighter">INTRA-DAY SALES PERFORMANCE</CardTitle>
                <div className="text-[10px] font-bold opacity-60 uppercase tracking-widest mt-1">Real-time revenue stream tracking</div>
              </div>
              <div className="flex gap-2">
                 <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 font-bold italic text-xs">Day</Button>
                 <Button variant="ghost" size="sm" className="text-slate-500 hover:bg-white/10 font-bold italic text-xs">Week</Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="h-[300px] w-full">
                 <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={SALES_DATA}>
                       <defs>
                          <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                             <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                             <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                          </linearGradient>
                       </defs>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                       <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 800, fill: '#64748b'}} />
                       <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 800, fill: '#64748b'}} />
                       <Tooltip 
                          contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px', color: '#fff' }}
                          itemStyle={{ fontSize: '12px', fontWeight: '900', fontStyle: 'italic' }}
                       />
                       <Area type="monotone" dataKey="sales" stroke="#2563eb" strokeWidth={4} fillOpacity={1} fill="url(#colorSales)" />
                    </AreaChart>
                 </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          <div className="space-y-6">
             <Card className="bg-slate-900 text-white border-none shadow-2xl relative overflow-hidden group rounded-3xl">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-125 transition-transform">
                   <ShieldCheck className="w-32 h-32" />
                </div>
                <CardHeader>
                   <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 italic">Store Reliability Index</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                   <div className="p-6 rounded-2xl bg-white/5 border border-white/10 shadow-inner">
                      <div className="flex justify-between items-end mb-2">
                        <span className="text-5xl font-black italic tracking-tighter">98.4%</span>
                        <div className="flex flex-col items-end">
                           <Badge className="bg-blue-600 mb-1 font-black italic">PLATINUM</Badge>
                           <span className="text-[10px] text-slate-500 font-bold tracking-tighter uppercase">SCORE</span>
                        </div>
                      </div>
                      <Progress value={98.4} className="h-2 bg-slate-800" />
                   </div>
                   <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-[10px] font-black uppercase text-slate-400">Security Protocols: ARMED</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-[10px] font-black uppercase text-slate-400">Ledger Sync: REALTIME</span>
                      </div>
                   </div>
                </CardContent>
             </Card>

             <Card className="shadow-lg border-amber-100 bg-amber-50/20 border-l-4 border-l-amber-500 rounded-3xl">
                <CardHeader className="py-4">
                  <CardTitle className="text-[10px] font-black uppercase tracking-widest text-amber-900">Immediate Action Required</CardTitle>
                </CardHeader>
                <CardContent className="pb-6 pt-0 space-y-4">
                   <div className="p-4 bg-white/60 rounded-xl border border-amber-200">
                      <div className="flex items-center gap-3 mb-2">
                         <Clock className="w-4 h-4 text-amber-600" />
                         <span className="text-xs font-black italic tracking-tight">Shift SH-9918 Waiting for Lock</span>
                      </div>
                      <p className="text-[10px] text-slate-600 leading-relaxed font-medium italic">Drawer variance Rp 15,200 detected. Manager override or explanation needed.</p>
                      <Button variant="outline" className="w-full mt-3 h-9 text-[10px] font-black uppercase border-amber-300 text-amber-900 hover:bg-amber-100 italic transition-all">Authorize Close</Button>
                   </div>
                </CardContent>
             </Card>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           <Card className="shadow-lg hover:border-blue-200 transition-all rounded-2xl group">
              <CardHeader className="border-b bg-slate-50/50">
                 <CardTitle className="text-sm font-black italic text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" /> Recent Sales
                 </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                 {orders.slice(-3).reverse().map((order) => (
                   <div 
                     key={order.id} 
                     onClick={() => toast({ title: "Order Details", description: `Fetching complete manifest for order ${order.id}...` })}
                     className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-all cursor-pointer"
                   >
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-black italic text-slate-400 border border-slate-200 group-hover:bg-blue-600 group-hover:text-white transition-all">
                            OR
                         </div>
                         <div>
                            <div className="text-xs font-black italic">{order.id}</div>
                            <div className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">Rp {order.totalAmount.toLocaleString()} • {order.paymentMethod || 'pending'}</div>
                         </div>
                      </div>
                      <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none text-[8px] font-black tracking-[0.2em] uppercase">{order.status}</Badge>
                   </div>
                 ))}
                 <Button variant="ghost" className="w-full h-10 text-[10px] font-black uppercase text-blue-600 gap-2 italic hover:bg-blue-50">View All Orders <ArrowUpRight className="w-3 h-3" /></Button>
              </CardContent>
           </Card>

           <Card className="shadow-lg hover:border-indigo-200 transition-all rounded-2xl group">
              <CardHeader className="border-b bg-slate-50/50">
                 <CardTitle className="text-sm font-black italic text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-indigo-600" /> Device Network
                 </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                 {devices.slice(0, 3).map((device) => (
                   <div key={device.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 group-hover:border-indigo-100">
                      <div>
                         <div className="text-xs font-black italic flex items-center gap-2">
                            {device.name}
                            <div className={`w-1.5 h-1.5 rounded-full ${device.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                         </div>
                         <div className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">{device.type} • {device.isActive ? 'ONLINE' : 'OFFLINE'}</div>
                      </div>
                      <Badge className="bg-slate-100 text-slate-600 border-none text-[8px] font-black uppercase">{device.isActive ? 'ACTIVE' : 'INACTIVE'}</Badge>
                   </div>
                 ))}
                 <Button variant="ghost" className="w-full h-10 text-[10px] font-black uppercase text-indigo-600 gap-2 italic hover:bg-indigo-50">Remote Diagnostics <Smartphone className="w-3 h-3" /></Button>
              </CardContent>
           </Card>

           <Card className="bg-indigo-600 text-white border-none shadow-xl rounded-2xl relative overflow-hidden flex flex-col justify-center">
              <div className="absolute -left-10 -bottom-10 opacity-20 transform -rotate-12">
                 <BarChart3 className="w-40 h-40" />
              </div>
              <CardContent className="p-8 relative">
                 <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-4 italic">Next Operational Milestone</div>
                 <h3 className="text-2xl font-black italic tracking-tighter mb-2">Monthly Stock Reconciliation</h3>
                 <p className="text-xs font-medium opacity-90 italic mb-6 leading-relaxed">System audit scheduled for <strong>24th Oct</strong>. Prepare Zone A & B for scanner-handshake protocol.</p>
                 <Button className="bg-white text-indigo-700 hover:bg-blue-50 font-black italic rounded-xl px-8 h-12 shadow-xl shadow-indigo-900/20">Set Reminder</Button>
              </CardContent>
           </Card>
        </div>
      </WorkspacePanel>
    </div>
  );
};

export default StoreDashboard;
