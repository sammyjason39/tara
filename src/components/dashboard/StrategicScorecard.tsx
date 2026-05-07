import React from 'react';
import { WorkspacePanel } from '@/core/ui/WorkspacePanel';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Clock, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const EnterpriseHealthWidget: React.FC = () => {
  const score = 92;
  const data = [{ value: score }, { value: 100 - score }];

  return (
    <WorkspacePanel 
      title="Enterprise Health" 
      variant="dark" 
      className="border-indigo-500/20 bg-gradient-to-br from-slate-900 to-indigo-950 h-full"
    >
      <div className="flex flex-col items-center justify-center h-full py-2">
        <div className="relative h-28 w-28">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={50}
                startAngle={90}
                endAngle={450}
                dataKey="value"
                stroke="none"
              >
                <Cell fill="#6366f1" />
                <Cell fill="rgba(255,255,255,0.05)" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-black text-white">{score}</span>
            <span className="text-[8px] font-black uppercase text-indigo-400">Score</span>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
           <Activity className="h-3 w-3 text-emerald-400" />
           <span className="text-[9px] font-black uppercase text-emerald-400 tracking-wider">Optimal Status</span>
        </div>
      </div>
    </WorkspacePanel>
  );
};

export const ActionItemsWidget: React.FC = () => {
  const navigate = useNavigate();
  const actions = [
    { title: 'Approve FY26 Budget', time: '2h ago', priority: 'high' },
    { title: 'New Employee Onboarding', time: '4h ago', priority: 'medium' },
    { title: 'Monthly Audit Verification', time: '1d ago', priority: 'low' },
  ];

  return (
    <WorkspacePanel 
      title="Action Items" 
      description="Critical executive tasks"
      variant="glass"
      className="h-full"
    >
      <div className="flex flex-col h-full space-y-4">
        <div className="flex-1 space-y-3">
          {actions.map((action, i) => (
            <div key={i} className="group relative flex items-start gap-3 rounded-2xl border border-slate-50 bg-slate-50/50 p-3 transition-all hover:bg-white hover:shadow-sm">
              <div className={`mt-1 h-2 w-2 rounded-full ${action.priority === 'high' ? 'bg-rose-500' : action.priority === 'medium' ? 'bg-amber-500' : 'bg-blue-500'}`} />
              <div className="flex-1">
                <p className="text-[11px] font-bold text-slate-900">{action.title}</p>
                <div className="mt-1 flex items-center gap-2 text-[9px] font-bold text-slate-400">
                  <Clock className="h-2.5 w-2.5" /> {action.time}
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-full opacity-0 transition-opacity group-hover:opacity-100"
                onClick={() => navigate('/core/workflow-inbox')}
              >
                <CheckCircle2 className="h-4 w-4 text-indigo-600" />
              </Button>
            </div>
          ))}
        </div>
        <Button 
          variant="outline" 
          className="w-full rounded-xl h-10 text-[10px] font-black uppercase tracking-widest border-slate-200 mt-auto"
          onClick={() => navigate('/core/workflow-inbox')}
        >
          View All Tasks
        </Button>
      </div>
    </WorkspacePanel>
  );
};

export const StrategicScorecard: React.FC = () => {
  return (
    <div className="space-y-6">
      <EnterpriseHealthWidget />
      <ActionItemsWidget />
    </div>
  );
};
