import React from 'react';
import { WorkspacePanel } from '@/core/ui/WorkspacePanel';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, AlertTriangle, Info, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface Alert {
  id: string;
  title: string;
  detail: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  module: string;
  time: string;
  actionUrl?: string;
}

interface OperationalAlertsQueueProps {
  data: Alert[];
}

export const OperationalAlertsQueue: React.FC<OperationalAlertsQueueProps> = ({ data = [] }) => {
  const navigate = useNavigate();

  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return { icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100' };
      case 'HIGH': return { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' };
      case 'MEDIUM': return { icon: Info, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' };
      default: return { icon: Info, color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-100' };
    }
  };

  return (
    <WorkspacePanel 
      title="Operational Alerts Queue" 
      description="Aggregated critical issues requiring intervention"
      variant="glass"
    >
      <ScrollArea className="h-[300px] pr-4">
        <div className="space-y-3">
          {data.length > 0 ? (
            data.map((alert, i) => {
              const config = getSeverityConfig(alert.severity);
              return (
                <div 
                  key={i} 
                  className={cn(
                    "flex items-start gap-4 rounded-2xl border p-4 transition-all hover:shadow-md cursor-pointer",
                    config.bg, config.border
                  )}
                  onClick={() => alert.actionUrl && navigate(alert.actionUrl)}
                >
                  <div className={cn("mt-0.5 rounded-full p-2 bg-white", config.color)}>
                    <config.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-tight text-slate-500">{alert.module}</span>
                      <span className="text-[10px] font-bold text-slate-400">{new Date(alert.time).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-xs font-black text-slate-900">{alert.title}</p>
                    <p className="text-[10px] leading-relaxed text-slate-600">{alert.detail}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 self-center text-slate-300" />
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center h-[260px] gap-3 opacity-30">
               <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center">
                  <Info className="h-6 w-6 text-emerald-500" />
               </div>
               <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Operational Environment Stable<br/>No Critical Alerts</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </WorkspacePanel>
  );
};
