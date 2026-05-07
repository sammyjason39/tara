import React from "react";
import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface InventoryGlassHeaderProps {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  actions?: React.ReactNode;
  stats?: {
    label: string;
    value: string | number;
    trend?: number;
    color?: string;
  }[];
}

export const InventoryGlassHeader: React.FC<InventoryGlassHeaderProps> = ({
  title,
  subtitle,
  icon: Icon,
  actions,
  stats,
}) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative p-10 mb-8 rounded-[3rem] bg-slate-900/40 backdrop-blur-3xl border border-white/10 shadow-2xl overflow-hidden group"
    >
      {/* Background Gradients */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-indigo-500/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 bg-emerald-500/20 rounded-full blur-[120px]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[300px] bg-slate-900/50 rounded-full blur-[150px] opacity-50" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-10">
        {/* Title Section */}
        <div className="flex items-center gap-8">
          <div className="flex h-20 w-20 items-center justify-center rounded-[2rem] bg-gradient-to-br from-slate-800 to-slate-950 shadow-2xl border border-white/5 text-white group-hover:scale-110 transition-transform duration-500">
            <Icon className="w-10 h-10 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-5xl font-black tracking-tighter text-white uppercase italic leading-none drop-shadow-sm">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm font-medium tracking-wide text-slate-400 mt-3 max-w-2xl">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Stats Row */}
        {stats && stats.length > 0 && (
          <div className="flex flex-wrap items-center gap-4 lg:gap-8 bg-slate-950/40 p-6 rounded-[2.5rem] border border-white/5 backdrop-blur-md shadow-inner">
            {stats.map((stat, i) => (
              <div key={i} className="flex flex-col gap-1 px-6 border-r border-white/5 last:border-none">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                  {stat.label}
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black italic text-white">
                    {stat.value}
                  </span>
                  {stat.trend !== undefined && (
                    <span className={`text-[10px] font-bold ${stat.trend >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {stat.trend >= 0 ? "+" : ""}{stat.trend}%
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        {actions && (
          <div className="flex items-center gap-4">
            {actions}
          </div>
        )}
      </div>
    </motion.div>
  );
};
