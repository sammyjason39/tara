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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      <Card className="border-none shadow-xl shadow-slate-200/50 dark:shadow-none bg-white dark:bg-slate-900/50 rounded-[2.5rem] overflow-hidden group">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Branch SKUs</CardTitle>
          <Layers className="h-4 w-4 text-primary opacity-50" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-black tracking-tighter">{formatValue(stats.totalSKUs)}</div>
          <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-widest italic">Active models</p>
        </CardContent>
      </Card>

      <Card className="border-none shadow-xl shadow-slate-200/50 dark:shadow-none bg-white dark:bg-slate-900/50 rounded-[2.5rem] overflow-hidden group">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Branch On Hand</CardTitle>
          <Package className="h-4 w-4 text-primary opacity-50" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-black tracking-tighter">{isAggregating ? "..." : formatValue(stats.totalSOH)}</div>
          <p className="text-[10px] font-bold text-emerald-500 mt-1 uppercase tracking-widest italic">Total physical units</p>
        </CardContent>
      </Card>

      <Card className="border-none shadow-xl shadow-slate-200/50 dark:shadow-none bg-white dark:bg-slate-900/50 rounded-[2.5rem] overflow-hidden group">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Branch ATS</CardTitle>
          <TrendingUp className="h-4 w-4 text-emerald-500 opacity-50" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-black tracking-tighter text-emerald-600">{isAggregating ? "..." : formatValue(stats.totalATS)}</div>
          <p className="text-[10px] font-bold text-emerald-500 mt-1 uppercase tracking-widest italic">Available to sell</p>
        </CardContent>
      </Card>

      <Card className="border-none shadow-xl shadow-slate-200/50 dark:shadow-none bg-white dark:bg-slate-900/50 rounded-[2.5rem] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Low Stock</CardTitle>
          <AlertTriangle className="h-4 w-4 text-amber-500 opacity-50" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-black tracking-tighter text-amber-600">{isAggregating ? "..." : formatValue(stats.low)}</div>
          <p className="text-[10px] font-bold text-amber-500 mt-1 uppercase tracking-widest italic">Below buffer threshold</p>
        </CardContent>
      </Card>

      <Card className="border-none shadow-xl shadow-slate-200/50 dark:shadow-none bg-white dark:bg-slate-900/50 rounded-[2.5rem] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Branch Valuation</CardTitle>
          <BarChart3 className="h-4 w-4 text-purple-500 opacity-50" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-black tracking-tighter text-purple-600">
            {isAggregating ? "..." : formatCurrency(stats.totalValue)}
          </div>
          <p className="text-[10px] font-bold text-purple-500 mt-1 uppercase tracking-widest italic">Inventory Asset Value</p>
        </CardContent>
      </Card>
    </div>
  );
};
