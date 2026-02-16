import React from 'react';
import { 
  ShoppingCart, RotateCcw, ScanLine, Truck, Monitor, Lock, Layout,
  Minimize2, Maximize2, Power
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRetail } from '../context/RetailContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface AppItem {
  id: string;
  title: string;
  desc: string;
  icon: React.ElementType;
  route: string;
  color: string;
  bg: string;
}

const APPS: AppItem[] = [
  { id: "ops-pos", title: "POS Terminal", desc: "Sales Execution", icon: ShoppingCart, route: "/m/retail/operational/pos", color: "text-blue-600", bg: "bg-blue-600/10" },
  { id: "ops-refund", title: "Refund Desk", desc: "Post-Sale Disputes", icon: RotateCcw, route: "/m/retail/operational/refund", color: "text-red-600", bg: "bg-red-600/10" },
  { id: "ops-opname", title: "Stock Opname", desc: "Inventory Audit", icon: ScanLine, route: "/m/retail/operational/opname", color: "text-indigo-600", bg: "bg-indigo-600/10" },
  { id: "ops-receiving", title: "Stock Intake", desc: "Good Receiving", icon: Truck, route: "/m/retail/operational/receiving", color: "text-orange-600", bg: "bg-orange-600/10" },
  { id: "ops-kiosk", title: "Self-Service", desc: "Guest Checkout", icon: Monitor, route: "/m/retail/operational/kiosk", color: "text-purple-600", bg: "bg-purple-600/10" },
  { id: "ops-shift-close", title: "Shift Close", desc: "EndOfDay Reconciliation", icon: Lock, route: "/m/retail/operational/shift-close", color: "text-slate-900", bg: "bg-slate-200" },
];

const RetailOperationalGateway = () => {
  const navigate = useNavigate();
  const { activeStore, activeShift, setMode } = useRetail();
  const [isFullscreen, setIsFullscreen] = React.useState(false);

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

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col p-4 md:p-8 relative overflow-hidden selection:bg-indigo-500/30">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 p-32 opacity-[0.02] pointer-events-none">
        <Layout className="w-[40rem] h-[40rem]" />
      </div>

      <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col relative z-10">
        {/* Header Area */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/40">
                <Monitor className="w-7 h-7 text-white" />
              </div>
              <h1 className="text-5xl font-black text-white italic tracking-tighter uppercase">Operational Plane</h1>
            </div>
            <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-sm">
              Terminal Selection • {activeStore?.name || "GLOBAL_SCOPE"} • Shift: {activeShift?.id || "NO_ACTIVE_SHIFT"}
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              className="bg-white/5 border-white/10 text-white hover:bg-white/10 h-14 px-6 rounded-2xl font-black italic gap-3 tracking-widest text-[10px] uppercase"
              onClick={toggleFullscreen}
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5 text-indigo-400" /> : <Maximize2 className="w-5 h-5 text-indigo-400" />}
              {isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            </Button>
            
            <Button 
              variant="outline"
              className="bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white h-14 px-8 rounded-2xl font-black italic gap-3 tracking-widest uppercase text-xs transition-all shadow-lg shadow-red-500/5"
              onClick={handleExit}
            >
              <Power className="w-5 h-5" />
              Exit to Management
            </Button>
          </div>
        </div>

        {/* App Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 flex-1 items-center">
          {APPS.map((app) => (
            <Card 
              key={app.id} 
              className="group hover:scale-[1.03] active:scale-95 transition-all cursor-pointer bg-slate-900/50 border-slate-800 hover:border-indigo-500/50 hover:shadow-[0_0_60px_rgba(99,102,241,0.1)] overflow-hidden h-48 flex items-center backdrop-blur-sm"
              onClick={() => navigate(app.route)}
            >
              <CardContent className="p-10 flex items-center gap-8 w-full">
                <div className={`w-24 h-24 ${app.bg} rounded-[2rem] flex items-center justify-center ${app.color} group-hover:rotate-6 transition-transform shadow-inner`}>
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
             <span className="w-12 h-[1px] bg-slate-800" />
             Zenvix Retail Authority • Secure Operational Shell v2.1
             <span className="w-12 h-[1px] bg-slate-800" />
          </p>
        </div>
      </div>
    </div>
  );
};

export default RetailOperationalGateway;
