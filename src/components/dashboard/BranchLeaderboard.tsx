import React from 'react';
import { WorkspacePanel } from '@/core/ui/WorkspacePanel';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useNavigate } from 'react-router-dom';

interface BranchLeaderboardProps {
  data: { name: string; revenue: number; percentOfTotal?: number }[];
}

export const BranchLeaderboard: React.FC<BranchLeaderboardProps> = ({ data }) => {
  const navigate = useNavigate();

  const total = data.reduce((acc, curr) => acc + curr.revenue, 0);
  const formattedData = data.map(d => ({
    ...d,
    percentOfTotal: (d.revenue / total) * 100
  })).sort((a, b) => b.revenue - a.revenue);

  return (
    <WorkspacePanel 
      title="Branch Revenue Leaderboard" 
      description="Top performing locations by gross revenue"
      variant="glass"
    >
      <div className="h-[300px] w-full">
        {formattedData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={formattedData} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
              <XAxis type="number" hide />
              <YAxis 
                dataKey="name" 
                type="category" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }} 
                width={100}
              />
              <Tooltip 
                cursor={{ fill: 'transparent' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="rounded-xl border bg-white p-3 shadow-xl">
                        <p className="text-[10px] font-black uppercase text-muted-foreground">{data.name}</p>
                        <p className="text-sm font-black text-indigo-600">${(data.revenue / 1000).toFixed(1)}k</p>
                        <p className="text-[10px] font-bold text-slate-400">{data.percentOfTotal.toFixed(1)}% of total</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar 
                dataKey="revenue" 
                radius={[0, 12, 12, 0]} 
                barSize={32}
                onClick={() => navigate('/m/retail/management')}
                className="cursor-pointer"
              >
                {formattedData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={index === 0 ? '#4f46e5' : index === 1 ? '#6366f1' : index === 2 ? '#818cf8' : '#c7d2fe'} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3 opacity-40">
             <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
                <BarChart className="h-6 w-6 text-slate-400" />
             </div>
             <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Regional Data Unavailable</p>
          </div>
        )}
      </div>
      <div className="mt-4 grid grid-cols-4 gap-4 border-t pt-4">
        {formattedData.slice(0, 4).map((d, i) => (
          <div key={i} className="text-center">
            <span className="text-[14px]">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '🎗️'}</span>
            <p className="text-[9px] font-black uppercase text-muted-foreground truncate">{d.name}</p>
          </div>
        ))}
      </div>
    </WorkspacePanel>
  );
};
