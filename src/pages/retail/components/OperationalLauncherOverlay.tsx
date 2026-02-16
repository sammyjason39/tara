import React from 'react';
import { 
  ShoppingCart, RotateCcw, ScanLine, Truck, Monitor, Lock, X 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRetail } from '../context/RetailContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RetailModeSwitchControl } from './RetailModeSwitchControl';

interface LauncherApp {
  id: string;
  title: string;
  desc: string;
  icon: React.ElementType;
  route: string;
  color: string;
  bg: string;
}

const APPS: LauncherApp[] = [
  { id: "ops-pos", title: "POS Terminal", desc: "Sales Execution", icon: ShoppingCart, route: "/m/retail/operational/pos", color: "text-blue-600", bg: "bg-blue-600/10" },
  { id: "ops-refund", title: "Refund Desk", desc: "Post-Sale Disputes", icon: RotateCcw, route: "/m/retail/operational/refund", color: "text-red-600", bg: "bg-red-600/10" },
  { id: "ops-opname", title: "Stock Opname", desc: "Inventory Audit", icon: ScanLine, route: "/m/retail/operational/opname", color: "text-indigo-600", bg: "bg-indigo-600/10" },
  { id: "ops-receiving", title: "Stock Intake", desc: "Good Receiving", icon: Truck, route: "/m/retail/operational/receiving", color: "text-orange-600", bg: "bg-orange-600/10" },
  { id: "ops-kiosk", title: "Self-Service", desc: "Guest Checkout", icon: Monitor, route: "/m/retail/operational/kiosk", color: "text-purple-600", bg: "bg-purple-600/10" },
  { id: "ops-shift-close", title: "Shift Close", desc: "EndOfDay Reconciliation", icon: Lock, route: "/m/retail/operational/shift-close", color: "text-slate-900", bg: "bg-slate-200" },
];

export const OperationalLauncherOverlay: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { activeShift } = useRetail();
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-xl animate-in fade-in zoom-in duration-200 flex flex-col p-12">
      <div className="flex justify-between items-center mb-12">
        <div>
          <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase">Nexus App Launcher</h2>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mt-2">
            Operational Plane • Shift: {activeShift?.id || "NO_ACTIVE_SHIFT"}
          </p>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-white hover:bg-white/10 w-16 h-16 rounded-2xl"
          onClick={onClose}
        >
          <X className="w-8 h-8" />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto w-full flex-1 items-center overflow-auto">
        {APPS.map((app) => (
          <Card 
            key={app.id} 
            className="group hover:scale-105 active:scale-95 transition-all cursor-pointer bg-slate-900 border-slate-800 hover:border-blue-500/50 hover:shadow-[0_0_40px_rgba(59,130,246,0.2)] overflow-hidden h-40 flex items-center"
            onClick={() => {
              navigate(app.route);
              onClose();
            }}
          >
            <CardContent className="p-8 flex items-center gap-6 w-full">
              <div className={`w-20 h-20 ${app.bg} rounded-3xl flex items-center justify-center ${app.color} group-hover:rotate-6 transition-transform`}>
                <app.icon className="w-10 h-10" />
              </div>
              <div>
                <div className="font-black text-white text-2xl uppercase tracking-tighter italic group-hover:text-blue-400 transition-colors">
                  {app.title}
                </div>
                <div className="text-sm text-slate-500 font-bold uppercase tracking-widest mt-1">
                  {app.desc}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-12 text-center flex-shrink-0 space-y-4">
        <div className="flex justify-center">
          <RetailModeSwitchControl />
        </div>
        <p className="text-slate-600 font-black italic tracking-widest text-[10px] uppercase">
          Device Awareness Enforced • Secure Execution Environment
        </p>
      </div>
    </div>
  );
};
