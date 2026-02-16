import React from 'react';
import { 
  ShieldCheck, ChevronRight, Store, Globe 
} from 'lucide-react';
import { useRetail } from '../context/RetailContext';
import { useSession } from '@/core/security/session';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { RetailModeSwitchControl } from './RetailModeSwitchControl';

export const RetailGlobalAdminBar = () => {
  const { activeStore, mode } = useRetail();
  const session = useSession();

  return (
    <div className="bg-slate-900 text-white h-10 px-4 flex items-center justify-between text-[10px] font-black uppercase tracking-widest border-b border-white/10 z-[60]">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 text-blue-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          Nexus Superadmin control
        </div>
        <Separator orientation="vertical" className="h-4 bg-white/20" />
        <div className="flex items-center gap-2">
          <span className="text-slate-500">Tenant:</span>
          <span className="text-white">{session.tenantId}</span>
          <ChevronRight className="w-3 h-3 text-slate-600" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-500">Store:</span>
          <Store className="w-3 h-3 text-indigo-400" />
          <span className="text-white">{activeStore?.name || "Global Scope"}</span>
          <Button variant="ghost" size="sm" className="h-6 px-2 hover:bg-white/10 text-[9px] font-black italic">
            [ Change ]
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
           <span className="text-slate-500">Mode:</span>
           <span className={mode === 'management' ? "text-blue-400" : "text-indigo-400"}>
             {mode} plane
           </span>
        </div>
        <Separator orientation="vertical" className="h-4 bg-white/20" />
        <div className="flex items-center gap-2 bg-white/5 px-2 py-0.5 rounded-md border border-white/10">
          <Globe className="w-3 h-3 text-green-500" />
          Authority: Operational
        </div>
      </div>
    </div>
  );
};
