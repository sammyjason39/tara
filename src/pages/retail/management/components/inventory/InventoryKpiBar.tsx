import React from "react";
import { Card } from "@/components/ui/card";

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
  /** true while a full-dataset aggregation fetch is in progress */
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

  const kpis = [
    {
      label: "Branch SKUs",
      val: stats.totalSKUs,
      color: "slate",
      sub: "Active items",
    },
    {
      label: "Branch On Hand",
      val: isAggregating ? "…" : formatValue(stats.totalSOH),
      color: "blue",
      sub: "All units",
    },
    {
      label: "Branch ATS",
      val: isAggregating ? "…" : formatValue(stats.totalATS),
      color: "emerald",
      sub: "Unreserved",
    },
    {
      label: "Low Stock",
      val: isAggregating ? "…" : formatValue(stats.low),
      color: "amber",
      sub: "Below buffer",
    },
    {
      label: "Branch Valuation",
      val: isAggregating ? "…" : formatCurrency(stats.totalValue),
      color: "purple",
      sub: "Local Value",
    },
  ] as const;

  return (
    <div className="grid grid-cols-5 gap-4">
      {(Array.isArray(kpis) ? kpis : []).map((k) => (
        <Card
          key={k.label}
          className="rounded-2xl border-none shadow-md bg-white p-4"
        >
          <div
            className={`text-[9px] font-black uppercase tracking-[0.2em] text-${k.color}-500 italic mb-1`}
          >
            {k.label}
          </div>
          <div className="text-2xl font-black italic tracking-tighter text-foreground truncate">
            {k.val}
          </div>
          <div className="text-[9px] text-muted-foreground font-bold uppercase italic">
            {k.sub}
          </div>
        </Card>
      ))}
    </div>
  );
};
