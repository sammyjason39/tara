import React from 'react';
import { Button } from '@/components/ui/button';
import { useRetail } from '../context/RetailContext';
import { useSession } from '@/core/security/session';
import { Roles } from '@/core/security/roles';
import { Layout, MonitorPlay } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

export const RetailModeSwitchControl = () => {
  const { mode, setMode } = useRetail();
  const session = useSession();
  const navigate = useNavigate();

  // Visibility Check: Store Admin, Owner, Superadmin
  const isEligible = [Roles.SUPERADMIN, Roles.OWNER, Roles.COMPANY_ADMIN].includes(session.role as any);

  if (!isEligible) return null;

  const handleSwitch = (newMode: 'management' | 'operational') => {
    setMode(newMode);
    if (newMode === 'operational') {
      navigate('/m/retail/operational/gateway');
    } else {
      navigate('/m/retail/workspace');
    }
  };

  return (
    <div className="flex items-center bg-slate-100 p-1 rounded-xl shadow-inner border border-slate-200">
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-8 px-4 font-black text-[10px] uppercase tracking-widest gap-2 rounded-lg transition-all",
          mode === 'management' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-blue-600"
        )}
        onClick={() => handleSwitch('management')}
      >
        <Layout className="w-3 h-3" />
        Management
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-8 px-4 font-black text-[10px] uppercase tracking-widest gap-2 rounded-lg transition-all",
          mode === 'operational' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-indigo-600"
        )}
        onClick={() => handleSwitch('operational')}
      >
        <MonitorPlay className="w-3 h-3" />
        Operational
      </Button>
    </div>
  );
};
