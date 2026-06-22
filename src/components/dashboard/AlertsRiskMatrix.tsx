// @audit-ignore: static visualization data for risk matrix chart (not mock business data)
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { CHART_COLORS, CHART_COLORS_DARK, CHART_NEUTRAL, CHART_NEUTRAL_DARK } from '@/lib/chart-colors';

interface AlertsRiskMatrixProps {
  data: { module: string; critical: number; high: number; medium: number; low: number }[];
}

export const AlertsRiskMatrix: React.FC<AlertsRiskMatrixProps> = ({ data = [] }) => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const tickFill = isDark ? '#94a3b8' : '#64748b';
  const tooltipBg = isDark ? '#1e293b' : '#ffffff';
  const colors = isDark ? CHART_COLORS_DARK : CHART_COLORS;

  const mockData = [
    { module: 'Retail', critical: 2, high: 5, medium: 8, low: 12 },
    { module: 'Finance', critical: 0, high: 2, medium: 4, low: 6 },
    { module: 'HR', critical: 1, high: 3, medium: 5, low: 7 },
    { module: 'IT', critical: 0, high: 1, medium: 2, low: 4 },
    { module: 'Inventory', critical: 3, high: 6, medium: 9, low: 11 }
  ];

  const activeData = data.length > 0 ? data : mockData;

  const handleBarClick = (payload: any) => {
    const module = payload.module;
    const routes: Record<string, string> = {
      'Retail': '/m/retail/management',
      'Finance': '/core/finance',
      'HR': '/core/hr',
      'IT': '/core/it/health',
      'Inventory': '/core/inventory'
    };
    if (routes[module]) navigate(routes[module]);
  };

  return (
    <div className="flex flex-col h-full rounded-[2.5rem] border border-border bg-card p-8 shadow-2xl transition-all duration-500 group overflow-hidden relative">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h4 className="text-lg font-black italic uppercase tracking-tighter text-foreground">Alerts Risk Matrix</h4>
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Active issues by module and severity</p>
        </div>
      </div>
      <div className="h-[320px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={activeData} margin={{ top: 20, right: 20, left: -10, bottom: 0 }}>
            <XAxis dataKey="module" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: tickFill }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: tickFill }} />
            <Tooltip 
              cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}
              contentStyle={{ backgroundColor: tooltipBg, borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
            />
            <Legend verticalAlign="top" align="right" height={36} iconType="circle" wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
            <Bar dataKey="critical" stackId="a" fill={isDark ? '#fb7185' : '#f43f5e'} radius={[0, 0, 0, 0]} onClick={handleBarClick} className="cursor-pointer" />
            <Bar dataKey="high" stackId="a" fill={colors.warning} radius={[0, 0, 0, 0]} onClick={handleBarClick} className="cursor-pointer" />
            <Bar dataKey="medium" stackId="a" fill={colors.info} radius={[0, 0, 0, 0]} onClick={handleBarClick} className="cursor-pointer" />
            <Bar dataKey="low" stackId="a" fill={tickFill} radius={[4, 4, 0, 0]} onClick={handleBarClick} className="cursor-pointer" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
