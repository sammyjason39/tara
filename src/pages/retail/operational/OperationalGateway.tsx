import React from 'react';
import { 
  ShoppingCart, RotateCcw, ScanLine, Truck, Monitor, Lock, Layout,
  Minimize2, Maximize2, Power, Home, Store, UserCircle, Banknote
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRetail } from '../context/RetailContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

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
  { id: "ops-pos", title: "POS Terminal", desc: "Sales Execution", icon: ShoppingCart, route: "/m/retail/operational/pos", color: "text-blue-600", bg: "bg-blue-600/10", requireShift: true },
  { id: "ops-refund", title: "Refund Desk", desc: "Post-Sale Disputes", icon: RotateCcw, route: "/m/retail/operational/refund", color: "text-red-600", bg: "bg-red-600/10", requireShift: true },
  { id: "ops-opname", title: "Stock Opname", desc: "Inventory Audit", icon: ScanLine, route: "/m/retail/operational/opname", color: "text-indigo-600", bg: "bg-indigo-600/10", requireShift: true },
  { id: "ops-receiving", title: "Stock Intake", desc: "Good Receiving", icon: Truck, route: "/m/retail/operational/receiving", color: "text-orange-600", bg: "bg-orange-600/10", requireShift: true },
  { id: "ops-kiosk", title: "Self-Service", desc: "Guest Checkout", icon: Monitor, route: "/m/retail/operational/kiosk", color: "text-purple-600", bg: "bg-purple-600/10", requireShift: true },
  { id: "ops-cash-out", title: "Cash Movement", desc: "Petty Cash & Out", icon: Banknote, route: "/m/retail/operational/cash-movement", color: "text-amber-600", bg: "bg-amber-600/10", requireShift: true },
  { id: "ops-shift-open", title: "Shift Open", desc: "Start Session", icon: Power, route: "/m/retail/operational/shift-open", color: "text-emerald-600", bg: "bg-emerald-600/10" },
  { id: "ops-shift-close", title: "Shift Close", desc: "End Reconciliation", icon: Lock, route: "/m/retail/operational/shift-close", color: "text-slate-400", bg: "bg-slate-400/10" },
];

const RetailOperationalGateway = () => {
  const navigate = useNavigate();
  const { activeStore, activeShift, setMode } = useRetail();
  const { user, session } = useAuth();
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
    // For other apps, if they require a shift, only show if shift is open
    if (app.requireShift) return !!activeShift;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col p-4 md:p-8 relative overflow-hidden selection:bg-indigo-500/30">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 p-32 opacity-[0.02] pointer-events-none">
        <Layout className="w-[40rem] h-[40rem]" />
      </div>

      <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col relative z-10">
        {/* Header Area */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8 bg-white/5 p-8 rounded-[2.5rem] border border-white/10 backdrop-blur-xl">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-600/40">
                <Store className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase leading-none mb-1">
                  {companyName}
                </h1>
                <p className="text-indigo-400 font-bold uppercase tracking-[0.3em] text-[10px]">
                  {activeStore?.name || "Global Operations Hub"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6">
               <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/50 rounded-xl border border-white/5">
                 <UserCircle className="w-4 h-4 text-slate-500" />
                 <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{user?.first_name} {user?.last_name}</span>
               </div>
               
               {activeShift ? (
                 <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                   <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                   <span className="text-[10px] font-black uppercase text-emerald-500 tracking-widest italic">Shift Active: {activeShift.id.slice(-8).toUpperCase()}</span>
                 </div>
               ) : (
                 <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-500/10 rounded-xl border border-rose-500/20">
                   <div className="w-2 h-2 rounded-full bg-rose-500" />
                   <span className="text-[10px] font-black uppercase text-rose-500 tracking-widest italic">Terminal Locked</span>
                 </div>
               )}
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              className="bg-white/5 border-white/10 text-white hover:bg-white/10 h-14 w-14 rounded-2xl shadow-lg"
              onClick={() => window.location.href = "/"}
              title="Return to Core Home"
            >
              <Home className="w-5 h-5 text-indigo-400" />
            </Button>

            <Button 
              variant="outline" 
              className="bg-white/5 border-white/10 text-white hover:bg-white/10 h-14 px-6 rounded-2xl font-black italic gap-3 tracking-widest text-[10px] uppercase"
              onClick={toggleFullscreen}
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5 text-indigo-400" /> : <Maximize2 className="w-5 h-5 text-indigo-400" />}
            </Button>
            
            <Button 
              variant="outline"
              className="bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white h-14 px-8 rounded-2xl font-black italic gap-3 tracking-widest uppercase text-xs transition-all shadow-lg shadow-red-500/5"
              onClick={handleExit}
            >
              <Power className="w-5 h-5" />
              Exit Plane
            </Button>
          </div>
        </div>

        {/* App Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 flex-1 items-center py-12">
          {(Array.isArray(visibleApps) ? visibleApps : []).map((app) => (
            <Card 
              key={app.id} 
              className="group hover:scale-[1.03] active:scale-95 transition-all cursor-pointer bg-white/5 border-white/10 hover:border-indigo-500/50 hover:shadow-[0_40px_100px_-20px_rgba(99,102,241,0.15)] overflow-hidden h-48 flex items-center backdrop-blur-xl rounded-[2.5rem]"
              onClick={() => navigate(app.route)}
            >
              <CardContent className="p-10 flex items-center gap-8 w-full">
                <div className={`w-24 h-24 ${app.bg} rounded-[2rem] flex items-center justify-center ${app.color} group-hover:rotate-6 transition-transform shadow-inner border border-white/5`}>
                  <app.icon className="w-12 h-12" />
                </div>
                <div className="space-y-2">
                  <div className="font-black text-white text-3xl uppercase tracking-tighter italic group-hover:text-indigo-400 transition-colors">
                    {app.title}
                  </div>
                  <div className="text-sm text-slate-500 font-bold uppercase tracking-widest leading-none">
                    {app.desc}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-16 text-center border-t border-white/5 pt-8">
          <p className="text-slate-700 font-black italic tracking-[0.3em] text-[10px] uppercase flex items-center justify-center gap-4">
             <span className="w-12 h-[1px] bg-slate-900" />
             Zenvix_Retail_Authority • Operational Plane 2.5
             <span className="w-12 h-[1px] bg-slate-900" />
          </p>
        </div>
      </div>
    </div>
  );
};

export default RetailOperationalGateway;
