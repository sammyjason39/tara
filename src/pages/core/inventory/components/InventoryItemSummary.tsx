/**
 * Functional component replacing the stub element in the Inventory module.
 *
 * Fetches and displays inventory items from the backend showing:
 * - Item name
 * - SKU
 * - Stock quantity
 *
 * Requirement 7.6: Replace the 1 stub element with a functional component
 * that fetches and displays current inventory data from the backend.
 */

import { useSession } from "@/core/security/session";
import { useInventoryItems } from "../hooks/useInventoryQueries";
import { Package, AlertCircle, Loader2, RefreshCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface InventoryItemSummaryProps {
  /** Max number of items to display */
  limit?: number;
}

export function InventoryItemSummary({ limit = 5 }: InventoryItemSummaryProps) {
  const { data, isLoading, isError, error, refetch } = useInventoryItems({
    page: 1,
    limit,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="ml-2 text-xs font-bold text-muted-foreground uppercase tracking-widest">
          Loading inventory...
        </span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span className="text-xs font-bold">
            {(error as any)?.message || "Failed to load inventory data"}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          className="rounded-xl text-xs font-bold"
        >
          <RefreshCcw className="h-3 w-3 mr-1" /> Retry
        </Button>
      </div>
    );
  }

  const items = Array.isArray(data) ? data : [];

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <Package className="h-8 w-8 mb-2 opacity-30" />
        <span className="text-xs font-bold uppercase tracking-widest">
          No inventory items found
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item: any) => (
        <div
          key={item.id}
          className="flex items-center justify-between gap-4 p-3 rounded-xl bg-muted/50 border border-border/50 hover:border-primary/20 transition-colors"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
              <Package className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold truncate">{item.name}</p>
              <p className="text-[10px] font-mono text-muted-foreground uppercase">
                {item.sku}
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className="shrink-0 rounded-lg px-2 py-0.5 text-xs font-black tabular-nums"
          >
            {item.currentStock ?? item.stock_quantity ?? 0} {item.uom || "pcs"}
          </Badge>
        </div>
      ))}
    </div>
  );
}

export default InventoryItemSummary;
