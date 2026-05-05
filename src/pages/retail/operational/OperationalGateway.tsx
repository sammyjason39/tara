import React from 'react';
import { 
  ShoppingCart, RotateCcw, ScanLine, Truck, Monitor, Lock, Layout,
  Minimize2, Maximize2, Power, Home, Store, UserCircle, Banknote
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRetail } from '../context/RetailContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { RetailModeSwitchControl } from '../components/RetailModeSwitchControl';

interface AppItem {
  id: string;
  title: string;
  desc: string;
  icon: React.ElementType;
  route: string;
  color: string;
  bg: string;
  requireShift?: boolean;
}

const APPS: AppItem[] = [
  { id: "ops-pos", title: "POS Terminal", desc: "Sales Execution", icon: ShoppingCart, route: "/m/retail/operational/pos", color: "text-blue-500", bg: "bg-blue-500/10", requireShift: true },
  { id: "ops-refund", title: "Refund Desk", desc: "Post-Sale Disputes", icon: RotateCcw, route: "/m/retail/operational/refund", color: "text-red-500", bg: "bg-red-500/10", requireShift: true },
  { id: "ops-cash-movement", title: "Cash Movement", desc: "Petty Cash & Out", icon: Banknote, route: "/m/retail/operational/cash-movement", color: "text-amber-500", bg: "bg-amber-500/10", requireShift: true },
  { id: "ops-opname", title: "Stock Opname", desc: "Inventory Audit", icon: ScanLine, route: "/m/retail/operational/opname", color: "text-indigo-500", bg: "bg-indigo-500/10", requireShift: true },
  { id: "ops-receiving", title: "Stock Intake", desc: "Good Receiving", icon: Truck, route: "/m/retail/operational/receiving", color: "text-orange-500", bg: "bg-orange-500/10", requireShift: true },
  { id: "ops-kiosk", title: "Self-Service", desc: "Guest Checkout", icon: Monitor, route: "/m/retail/operational/kiosk", color: "text-purple-500", bg: "bg-purple-500/10", requireShift: true },
  { id: "ops-shift-open", title: "Shift Open", desc: "Start Session", icon: Power, route: "/m/retail/operational/shift-open", color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { id: "ops-shift-close", title: "Shift Close", desc: "End Reconciliation", icon: Lock, route: "/m/retail/operational/shift-close", color: "text-slate-400", bg: "bg-slate-400/10" },
];

const RetailOperationalGateway = () => {
  const navigate = useNavigate();
  const { activeStore, activeShift, setMode } = useRetail();
  const { user, session, logout } = useAuth();
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  const companyName = user?.user_companies?.find(c => c.tenant_id === session?.tenant_id)?.company.name || "Zenvix Corp";

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  const handleExit = () => {
    setMode('management');
    navigate('/m/retail/workspace');
  };

  // Filter apps based on shift status
  const visibleApps = (Array.isArray(APPS) ? APPS : []).filter(app => {
    if (app.id === "ops-shift-open") return !activeShift;
    if (app.id === "ops-shift-close") return !!activeShift;
    if (app.requireShift) return !!activeShift;
    return true;
  });

  return (
    <div className="flex-1 flex flex-col p-6 md:p-12 relative selection:bg-indigo-500/30 overflow-y-auto">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 p-32 opacity-[0.03] pointer-events-none">
        <Layout className="w-[45rem] h-[45rem]" />
      </div>

      <div className="max-w-[1600px] mx-auto w-full flex-1 flex flex-col relative z-10">
        {/* Header Area - Ultra Tactical */}
        <div className="flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-8 mb-12 bg-white/[0.03] p-10 rounded-[3.5rem] border border-white/10 backdrop-blur-3xl shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          
          <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
            <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center shadow-[0_0_50px_rgba(79,70,229,0.4)] transform hover:rotate-12 transition-transform duration-500">
              <Store className="w-10 h-10 text-white" />
            </div>
            <div className="text-center md:text-left">
              <div className="flex items-center gap-4 justify-center md:justify-start mb-2">
                <h1 className="text-5xl font-black text-white italic tracking-tighter uppercase leading-none">
                  {companyName}
                </h1>
                <Badge variant="outline" className="border-indigo-500/30 text-indigo-400 font-black italic uppercase tracking-widest text-[9px] px-3 py-1 bg-indigo-500/5">
                  OP_PLANE_v2.5
                </Badge>
              </div>
              <p className="text-indigo-400 font-black uppercase tracking-[0.4em] text-[11px] italic">
                {activeStore?.name || "Global Operations Hub"} • SECURITY_LEVEL: ALPHA
              </p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10">
             <div className="flex flex-col items-end gap-1 px-8 border-r border-white/10 hidden xl:flex">
                <span className="text-[9px] font-black uppercase text-slate-500 tracking-[0.3em]">Operator Identity</span>
                <span className="text-sm font-black uppercase text-white italic tracking-widest">{user?.first_name} {user?.last_name}</span>
             </div>

             {activeShift ? (
               <div className="flex items-center gap-4 px-6 py-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
                 <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                 <div className="flex flex-col">
                    <span className="text-[8px] font-black uppercase text-emerald-500/60 tracking-widest leading-none mb-1">Shift Active</span>
                    <span className="text-[10px] font-black uppercase text-emerald-400 tracking-tighter italic">{activeShift.id.slice(-12).toUpperCase()}</span>
                 </div>
               </div>
             ) : (
               <div className="flex items-center gap-4 px-6 py-3 bg-rose-500/10 rounded-2xl border border-rose-500/20">
                 <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                 <div className="flex flex-col">
                    <span className="text-[8px] font-black uppercase text-rose-500/60 tracking-widest leading-none mb-1">Terminal Status</span>
                    <span className="text-[10px] font-black uppercase text-rose-400 tracking-tighter italic">LOCKED_MODE</span>
                 </div>
               </div>
             )}
              <div className="flex items-center gap-3">
                 <div className="mr-4 scale-125 origin-right">
                   <RetailModeSwitchControl />
                 </div>

                 <Button 
                   variant="outline" 
                   className="bg-white/5 border-white/10 text-white hover:bg-indigo-600 hover:text-white h-16 w-16 rounded-2xl transition-all hover:scale-110 active:scale-95 shadow-xl group"
                   onClick={() => window.location.href = "/"}
                   title="Go to Core"
                 >
                   <Home className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                 </Button>

                 <Button 
                   variant="outline" 
                   className="bg-white/5 border-white/10 text-white hover:bg-white/10 h-16 w-16 rounded-2xl transition-all hover:scale-110 active:scale-95 shadow-xl"
                   onClick={toggleFullscreen}
                   title="Toggle Fullscreen"
                 >
                   {isFullscreen ? <Minimize2 className="w-6 h-6 text-indigo-400" /> : <Maximize2 className="w-6 h-6 text-indigo-400" />}
                 </Button>
                 
                 <Button 
                   variant="outline"
                   className="bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-600 hover:text-white h-16 px-10 rounded-2xl font-black italic gap-4 tracking-[0.2em] uppercase text-[11px] transition-all shadow-xl hover:scale-105 active:scale-95"
                   onClick={logout}
                 >
                   <Power className="w-5 h-5" />
                   Deactivate
                 </Button>
              </div>
          </div>
        </div>

        {/* App Grid - Premium Tactical Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-10 pb-12">
          {(Array.isArray(visibleApps) ? visibleApps : []).map((app) => (
            <div 
              key={app.id} 
              className="group relative cursor-pointer"
              onClick={() => navigate(app.route)}
            >
              {/* Outer Glow Effect */}
              <div className={`absolute inset-0 ${app.bg} blur-[60px] opacity-0 group-hover:opacity-40 transition-opacity duration-700 rounded-full`} />
              
              <Card className="relative h-56 bg-white/[0.03] border-white/10 hover:border-white/30 transition-all duration-500 overflow-hidden backdrop-blur-3xl rounded-[3rem] shadow-2xl flex flex-col group-hover:-translate-y-3 group-active:scale-95">
                <div className={`absolute top-0 right-0 w-32 h-32 ${app.bg} blur-3xl -mr-16 -mt-16 opacity-20 group-hover:scale-150 transition-transform duration-1000`} />
                
                <CardContent className="p-10 flex flex-col justify-between h-full relative z-10">
                  <div className="flex justify-between items-start">
                    <div className={`w-20 h-20 ${app.bg} rounded-[2rem] flex items-center justify-center ${app.color} group-hover:rotate-[15deg] transition-all duration-500 border border-white/5 shadow-inner`}>
                      <app.icon className="w-10 h-10" />
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-4 group-hover:translate-x-0">
                       <Maximize2 className="w-6 h-6 text-white/20" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="font-black text-white text-3xl uppercase tracking-tighter italic group-hover:text-indigo-400 transition-colors">
                      {app.title}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[9px] text-slate-500 font-black uppercase tracking-[0.3em]">
                        {app.desc}
                      </span>
                      <div className="h-[1px] flex-1 bg-white/5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>

        {/* Footer Audit Trail */}
        <div className="mt-12 py-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 opacity-30 group/footer transition-opacity hover:opacity-100">
          <p className="text-slate-500 font-black italic tracking-[0.4em] text-[9px] uppercase flex items-center gap-4">
             <span className="w-10 h-[1px] bg-white/10" />
             Zenvix_Retail_Authority • GLOBAL_SYNC_V2
          </p>
          <div className="flex items-center gap-8">
             <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 italic">Integrity: VERIFIED</span>
             <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 italic">Latency: 14ms</span>
             <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 italic">Session: ACTIVE</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RetailOperationalGateway;
