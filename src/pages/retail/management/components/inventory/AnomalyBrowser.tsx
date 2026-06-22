import React, { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Search,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { InventoryItemView } from "./types";

export interface AnomalyBrowserProps {
  /** All items fetched from the backend (already filtered by is_anomaly: true) */
  items: InventoryItemView[];
  /** Whether data is currently loading */
  isLoading: boolean;
  /** Callback to trigger edit/completion dialog for an anomaly item */
  onComplete: (item: InventoryItemView) => void;
  /** Callback to refresh the anomaly items list */
  onRefresh?: () => void;
}

/**
 * Determines whether an item is incomplete based on missing required fields.
 * Returns an object with field-level completeness information.
 */
export function getIncompleteFields(item: InventoryItemView): {
  isIncomplete: boolean;
  missingFields: string[];
} {
  const missingFields: string[] = [];

  if (!item.name || item.name.startsWith("Unregistered Item")) {
    missingFields.push("Name");
  }
  if (
    !item.categoryId ||
    item.category?.toLowerCase() === "anomaly"
  ) {
    missingFields.push("Category");
  }
  if (!item.price || item.price === 0) {
    missingFields.push("Price");
  }

  return {
    isIncomplete: missingFields.length > 0,
    missingFields,
  };
}

/**
 * AnomalyBrowser component
 *
 * Lists items where `is_anomaly: true`, shows incomplete status indicators,
 * and provides actions to edit and complete item details.
 *
 * Requirements: 2.3, 2.5
 */
export const AnomalyBrowser: React.FC<AnomalyBrowserProps> = ({
  items,
  isLoading,
  onComplete,
  onRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "incomplete" | "ready">(
    "all",
  );

  const filteredItems = useMemo(() => {
    return (Array.isArray(items) ? items : []).filter((item) => {
      // Search filter
      const matchesSearch =
        !searchQuery ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.barcode &&
          item.barcode.toLowerCase().includes(searchQuery.toLowerCase()));

      // Status filter
      if (filterMode === "incomplete") {
        const { isIncomplete } = getIncompleteFields(item);
        return matchesSearch && isIncomplete;
      }
      if (filterMode === "ready") {
        const { isIncomplete } = getIncompleteFields(item);
        return matchesSearch && !isIncomplete;
      }

      return matchesSearch;
    });
  }, [items, searchQuery, filterMode]);

  const incompleteCount = useMemo(() => {
    return (Array.isArray(items) ? items : []).filter(
      (item) => getIncompleteFields(item).isIncomplete,
    ).length;
  }, [items]);

  const readyCount = useMemo(() => {
    return (Array.isArray(items) ? items : []).filter(
      (item) => !getIncompleteFields(item).isIncomplete,
    ).length;
  }, [items]);

  return (
    <div className="space-y-6" data-testid="anomaly-browser">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-warning/10 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-warning" />
          </div>
          <div>
            <h3 className="text-lg font-black italic tracking-tight text-foreground">
              Anomaly Items
            </h3>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {items.length} items awaiting review •{" "}
              {incompleteCount} incomplete
            </p>
          </div>
        </div>
        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
            className="rounded-xl gap-2 font-bold italic text-xs"
          >
            <RefreshCw
              className={cn("w-3.5 h-3.5", isLoading && "animate-spin")}
            />
            Refresh
          </Button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
          <Input
            className="pl-10 h-10 bg-secondary/5 border-none rounded-xl font-bold italic placeholder:text-muted-foreground/60"
            placeholder="Search by SKU, name, or barcode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="anomaly-search-input"
          />
        </div>
        <div className="flex items-center gap-1 bg-secondary/5 rounded-xl p-1">
          <Button
            size="sm"
            variant={filterMode === "all" ? "default" : "ghost"}
            className="h-8 rounded-lg font-black italic text-[10px] uppercase tracking-widest px-3"
            onClick={() => setFilterMode("all")}
            data-testid="filter-all"
          >
            All ({items.length})
          </Button>
          <Button
            size="sm"
            variant={filterMode === "incomplete" ? "default" : "ghost"}
            className="h-8 rounded-lg font-black italic text-[10px] uppercase tracking-widest px-3"
            onClick={() => setFilterMode("incomplete")}
            data-testid="filter-incomplete"
          >
            Incomplete ({incompleteCount})
          </Button>
          <Button
            size="sm"
            variant={filterMode === "ready" ? "default" : "ghost"}
            className="h-8 rounded-lg font-black italic text-[10px] uppercase tracking-widest px-3"
            onClick={() => setFilterMode("ready")}
            data-testid="filter-ready"
          >
            Ready ({readyCount})
          </Button>
        </div>
      </div>

      {/* Items List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <RefreshCw className="w-6 h-6 text-primary animate-spin" />
          <span className="text-[10px] font-black italic uppercase tracking-widest text-muted-foreground">
            Loading anomaly items...
          </span>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-secondary/10 flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7 text-muted-foreground/40" />
          </div>
          <h4 className="text-sm font-black italic text-foreground">
            {items.length === 0
              ? "No Anomaly Items"
              : "No items match your filter"}
          </h4>
          <p className="text-xs text-muted-foreground font-medium max-w-xs">
            {items.length === 0
              ? "All items have been reviewed and completed."
              : "Try adjusting your search or filter criteria."}
          </p>
        </div>
      ) : (
        <div className="space-y-3" data-testid="anomaly-items-list">
          {filteredItems.map((item) => {
            const { isIncomplete, missingFields } = getIncompleteFields(item);
            return (
              <AnomalyItemCard
                key={item.id}
                item={item}
                isIncomplete={isIncomplete}
                missingFields={missingFields}
                onComplete={onComplete}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

interface AnomalyItemCardProps {
  item: InventoryItemView;
  isIncomplete: boolean;
  missingFields: string[];
  onComplete: (item: InventoryItemView) => void;
}

const AnomalyItemCard: React.FC<AnomalyItemCardProps> = ({
  item,
  isIncomplete,
  missingFields,
  onComplete,
}) => {
  return (
    <Card
      className={cn(
        "rounded-2xl border p-4 transition-all hover:shadow-md",
        isIncomplete
          ? "border-warning/20 bg-warning/5 dark:border-warning/30 dark:bg-warning/5"
          : "border-success/20 bg-success/5 dark:border-success/30 dark:bg-success/5",
      )}
      data-testid={`anomaly-item-${item.id}`}
    >
      <div className="flex items-center justify-between gap-4">
        {/* Item Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[11px] text-muted-foreground font-bold">
              {item.sku}
            </span>
            {isIncomplete ? (
              <Badge
                className="bg-warning/10 text-warning dark:bg-warning/20 dark:text-warning border-none font-black italic text-[9px] uppercase tracking-widest"
                data-testid={`status-incomplete-${item.id}`}
              >
                <AlertTriangle className="w-3 h-3 mr-1" />
                Incomplete
              </Badge>
            ) : (
              <Badge
                className="bg-success/10 text-success dark:bg-success/20 dark:text-success border-none font-black italic text-[9px] uppercase tracking-widest"
                data-testid={`status-ready-${item.id}`}
              >
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Ready
              </Badge>
            )}
          </div>
          <h4 className="font-black italic text-sm text-foreground truncate">
            {item.name}
          </h4>
          {isIncomplete && missingFields.length > 0 && (
            <p className="text-[10px] text-warning dark:text-warning font-bold mt-1">
              Missing: {missingFields.join(", ")}
            </p>
          )}
          {item.barcode && (
            <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
              Barcode: {item.barcode}
            </p>
          )}
        </div>

        {/* Price Display */}
        <div className="text-right shrink-0">
          {item.price ? (
            <span className="font-black italic text-sm text-primary">
              Rp {item.price.toLocaleString()}
            </span>
          ) : (
            <span className="text-[10px] font-bold italic text-muted-foreground">
              No price set
            </span>
          )}
        </div>

        {/* Action */}
        <Button
          size="sm"
          onClick={() => onComplete(item)}
          className={cn(
            "rounded-xl font-black italic text-[10px] uppercase tracking-widest gap-1.5 shrink-0",
            isIncomplete
              ? "bg-warning hover:bg-warning/80 text-warning-foreground"
              : "bg-success hover:bg-success/80 text-success-foreground",
          )}
          data-testid={`complete-btn-${item.id}`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          {isIncomplete ? "Complete" : "Edit"}
        </Button>
      </div>
    </Card>
  );
};
