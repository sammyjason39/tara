import React from 'react';
import { WorkspacePanel } from '@/core/ui/WorkspacePanel';
import { Badge } from '@/components/ui/badge';
import { Clock, User, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface WorkflowItem {
  id: string;
  type: string;
  title: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  assignee?: string;
  timeElapsed: string;
}

interface WorkflowPipelineProps {
  data: WorkflowItem[];
}

export const WorkflowPipeline: React.FC<WorkflowPipelineProps> = ({ data = [] }) => {
  const navigate = useNavigate();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-amber-100 text-amber-700';
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-700';
      case 'COMPLETED': return 'bg-emerald-100 text-emerald-700';
      default: return 'bg-rose-100 text-rose-700';
    }
  };

  return (
    <WorkspacePanel 
      title="Operational Pipeline" 
      description="Active multi-step business processes"
      variant="glass"
      action={
        <button 
          onClick={() => navigate('/core/workflow-inbox')}
          className="flex items-center gap-1 text-[10px] font-black uppercase text-indigo-600 hover:underline"
        >
          View Inbox <ArrowRight className="h-3 w-3" />
        </button>
      }
    >
      <div className="space-y-3">
        {data.length > 0 ? (
          data.map((item, i) => (
            <div key={i} className="flex items-center gap-4 rounded-2xl border border-slate-50 bg-white/50 p-3 transition-all hover:bg-white hover:shadow-sm">
              <div className={cn("h-10 w-1 rounded-full", item.status === 'PENDING' ? 'bg-amber-400' : 'bg-blue-400')} />
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-tight text-slate-400">{item.type}</span>
                  <Badge variant="outline" className={cn("h-5 rounded-full px-2 text-[9px] font-black border-none", getStatusColor(item.status))}>
                    {item.status}
                  </Badge>
                </div>
                <p className="text-xs font-bold text-slate-900">{item.title}</p>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400">
                    <Clock className="h-2.5 w-2.5" /> {item.timeElapsed} elapsed
                  </div>
                  {item.assignee && (
                    <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400">
                      <User className="h-2.5 w-2.5" /> {item.assignee}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-12 gap-3 opacity-30">
             <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-slate-400" />
             </div>
             <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">No active processes</p>
          </div>
        )}
      </div>
    </WorkspacePanel>
  );
};
