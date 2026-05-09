import React from "react";
import { Card } from "@/components/ui/card";

type InventoryStats = {
  totalSKUs: number;
  totalSOH: number;
  totalATS: number;
  critical: number;
  low: number;
};

type Props = {
  stats: InventoryStats;
  /** true while a full-dataset aggregation fetch is in progress */
  isAggregating?: boolean;
};

export const InventoryKpiBar: React.FC<Props> = ({ stats, isAggregating }) => {
  const kpis = [
    {
      label: "Total SKUs",
      val: stats.totalSKUs,
      color: "slate",
      sub: "Active items",
    },
    {
      label: "Stock On Hand",
      val: stats.totalSOH?.toLocaleString() ?? "0",
      color: "blue",
      sub: "All units",
    },
    {
      label: "Available-to-Sell",
      val: stats.totalATS?.toLocaleString() ?? "0",
      color: "emerald",
      sub: "Unreserved",
    },
    {
      label: "Low Stock",
      val: isAggregating ? "…" : (stats.low?.toLocaleString() ?? "0"),
      color: "amber",
      sub: "Below buffer",
    },
    {
      label: "Critical",
      val: isAggregating ? "…" : (stats.critical?.toLocaleString() ?? "0"),
      color: "red",
      sub: "Zero ATS",
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
          <div className="text-2xl font-black italic tracking-tighter text-foreground">
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
