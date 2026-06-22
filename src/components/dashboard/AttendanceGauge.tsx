import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';

export const AttendanceGauge: React.FC = () => {
  const navigate = useNavigate();
  const value = 94;
  const data = [
    { value: value },
    { value: 100 - value },
  ];

  const getColor = (val: number) => {
    if (val > 90) return '#10b981';
    if (val > 75) return '#f59e0b';
    return '#f43f5e';
  };

  return (
    <div
      className="rounded-[2.5rem] border border-border bg-card p-6 shadow-xl cursor-pointer transition-all hover:shadow-2xl"
      onClick={() => navigate('/core/hr/scheduling')}
    >
      <div className="mb-2">
        <p className="text-sm font-semibold text-foreground">Today's Attendance</p>
        <p className="text-xs text-muted-foreground">Real-time employee clock-in status</p>
      </div>
      <div className="relative h-[180px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              startAngle={180}
              endAngle={0}
              innerRadius={60}
              outerRadius={80}
              paddingAngle={0}
              dataKey="value"
              stroke="none"
            >
              <Cell fill={getColor(value)} />
              <Cell fill="hsl(var(--border))" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 top-12 flex flex-col items-center justify-center">
          <p className="text-3xl font-black text-foreground">{value}%</p>
          <p className="text-[10px] font-black uppercase text-muted-foreground">Optimal</p>
        </div>
      </div>
      <div className="text-center mt-[-20px]">
        <p className="text-xs font-bold text-muted-foreground">432 / 460 present</p>
      </div>
    </div>
  );
};
