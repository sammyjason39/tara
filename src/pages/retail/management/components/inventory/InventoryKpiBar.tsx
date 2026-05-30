import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Layers, AlertTriangle, Archive, BarChart3, TrendingUp } from "lucide-react";

type InventoryStats = {
  totalSKUs: number;
  totalSOH: number;
  totalATS: number;
  critical: number;
  low: number;
  totalValue?: number;
  totalCapitalValue?: number;
  currency?: string;
};

type Props = {
  stats: InventoryStats;
  isAggregating?: boolean;
};

export const InventoryKpiBar: React.FC<Props> = ({ stats, isAggregating }) => {
  const formatValue = (val: number | undefined) => {
    if (val === undefined || val === null) return "0";
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
  };

  const formatCurrency = (val: number | undefined) => {
    if (val === undefined || val === null) return "0";
    const currency = stats.currency || "USD";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="space-y-6">
      {/* Top Row: Core Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Branch SKUs */}
        <Card className="border border-slate-100 dark:border-white/5 shadow-xl bg-white dark:bg-slate-900/40 backdrop-blur-md rounded-[2rem] overflow-hidden hover:-translate-y-1 hover:shadow-2xl hover:shadow-indigo-500/5 transition-all duration-300 group">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Branch SKUs</CardTitle>
            <Layers className="h-4 w-4 text-primary opacity-50" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tracking-tighter text-slate-800 dark:text-white">{formatValue(stats.totalSKUs)}</div>
            <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-widest italic">Active models</p>
          </CardContent>
        </Card>

        {/* Card 2: Branch On Hand */}
        <Card className="border border-slate-100 dark:border-white/5 shadow-xl bg-white dark:bg-slate-900/40 backdrop-blur-md rounded-[2rem] overflow-hidden hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-500/5 transition-all duration-300 group">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Branch On Hand</CardTitle>
            <Package className="h-4 w-4 text-emerald-500 opacity-50" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tracking-tighter text-emerald-600 dark:text-emerald-400">{isAggregating ? "..." : formatValue(stats.totalSOH)}</div>
            <p className="text-[10px] font-bold text-emerald-500 mt-1 uppercase tracking-widest italic">Total physical units</p>
          </CardContent>
        </Card>

        {/* Card 3: Out of Stock */}
        <Card className="border border-slate-100 dark:border-white/5 shadow-xl bg-white dark:bg-slate-900/40 backdrop-blur-md rounded-[2rem] overflow-hidden hover:-translate-y-1 hover:shadow-2xl hover:shadow-rose-500/5 transition-all duration-300 group">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Out of Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-rose-500 opacity-50" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tracking-tighter text-rose-600 dark:text-rose-400">{isAggregating ? "..." : formatValue(stats.critical)}</div>
            <p className="text-[10px] font-bold text-rose-500 mt-1 uppercase tracking-widest italic">Critical Shortage</p>
          </CardContent>
        </Card>

        {/* Card 4: Low Stock */}
        <Card className="border border-slate-100 dark:border-white/5 shadow-xl bg-white dark:bg-slate-900/40 backdrop-blur-md rounded-[2rem] overflow-hidden hover:-translate-y-1 hover:shadow-2xl hover:shadow-amber-500/5 transition-all duration-300 group">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Low Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500 opacity-50" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tracking-tighter text-amber-600 dark:text-amber-400">{isAggregating ? "..." : formatValue(stats.low)}</div>
            <p className="text-[10px] font-bold text-amber-500 mt-1 uppercase tracking-widest italic">Below buffer threshold</p>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Large Valuations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 5: Branch Valuation (capital) */}
        <Card className="border border-indigo-500/20 shadow-2xl bg-white dark:bg-slate-900/40 backdrop-blur-md rounded-[2rem] overflow-hidden hover:-translate-y-1 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-300 bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent relative group">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-6 px-8">
            <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-indigo-400">Branch Valuation (Capital)</CardTitle>
            <BarChart3 className="h-5 w-5 text-indigo-500 opacity-60 group-hover:scale-110 transition-transform duration-300" />
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <div className="text-3xl sm:text-4xl lg:text-4xl xl:text-5xl font-black tracking-tighter text-indigo-600 dark:text-indigo-400 break-words whitespace-normal leading-tight">
              {isAggregating ? "..." : formatCurrency(stats.totalCapitalValue)}
            </div>
            <p className="text-xs font-bold text-indigo-500 mt-2 uppercase tracking-widest italic">Capital / Supplier Price Cost</p>
          </CardContent>
        </Card>

        {/* Card 6: Branch Valuation (selling price) */}
        <Card className="border border-purple-500/20 shadow-2xl bg-white dark:bg-slate-900/40 backdrop-blur-md rounded-[2rem] overflow-hidden hover:-translate-y-1 hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-300 bg-gradient-to-br from-purple-500/5 via-transparent to-transparent relative group">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-6 px-8">
            <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-purple-400">Branch Valuation (Selling Price)</CardTitle>
            <TrendingUp className="h-5 w-5 text-purple-500 opacity-60 group-hover:scale-110 transition-transform duration-300" />
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <div className="text-3xl sm:text-4xl lg:text-4xl xl:text-5xl font-black tracking-tighter text-purple-600 dark:text-purple-400 break-words whitespace-normal leading-tight">
              {isAggregating ? "..." : formatCurrency(stats.totalValue)}
            </div>
            <p className="text-xs font-bold text-purple-500 mt-2 uppercase tracking-widest italic">Total Customer Retail Value</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
