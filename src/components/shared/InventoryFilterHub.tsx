import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, SlidersHorizontal, ChevronDown, ChevronUp } from "lucide-react";
import {
  Select as UISelect,
  SelectContent as UISelectContent,
  SelectItem as UISelectItem,
  SelectTrigger as UISelectTrigger,
  SelectValue as UISelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input as UIInput } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export interface InventoryFilterHubProps {
  search: string;
  onSearchChange: (val: string) => void;
  category: string;
  onCategoryChange: (val: string) => void;
  categories: { id: string; name: string }[];
  type?: string;
  onTypeChange?: (val: string) => void;
  status?: string;
  onStatusChange?: (val: string) => void;
  /** @deprecated Location is now driven by the global header selector. Pass nothing. */
  location?: string;
  /** @deprecated Location is now driven by the global header selector. Pass nothing. */
  onLocationChange?: (val: string) => void;
  /** @deprecated Location is now driven by the global header selector. Pass nothing. */
  locations?: { id: string; name: string }[];
  moduleTag?: string;
  onModuleTagChange?: (val: string) => void;
  locationLabel?: string;
  minPrice?: number;
  maxPrice?: number;
  onPriceRangeChange?: (min?: number, max?: number) => void;
  /** Slot for the + Add Item button (and other right-aligned actions) */
  advancedActions?: React.ReactNode;
  sortBy?: string;
  onSortChange?: (val: string) => void;
}

const SORT_OPTIONS = [
  { value: "name-asc", label: "Name (A-Z)" },
  { value: "name-desc", label: "Name (Z-A)" },
  { value: "quantity-desc", label: "Highest Quantity" },
  { value: "quantity-asc", label: "Lowest Quantity" },
  { value: "price-desc", label: "Highest Price" },
  { value: "price-asc", label: "Lowest Price" },
];

export const InventoryFilterHub: React.FC<InventoryFilterHubProps> = ({
  search,
  onSearchChange,
  category,
  onCategoryChange,
  categories,
  type,
  onTypeChange,
  status,
  onStatusChange,
  minPrice,
  maxPrice,
  onPriceRangeChange,
  advancedActions,
  sortBy = "name-asc",
  onSortChange,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const activeFilterCount = [
    category !== "all" && category !== "",
    type && type !== "all",
    status && status !== "all",
    minPrice !== undefined || maxPrice !== undefined,
    sortBy && sortBy !== "name-asc",
  ].filter(Boolean).length;

  return (
    <div className="w-full space-y-4">
      {/* ── Top Row: Search │ Filter & Sort │ Actions ── */}
      <div className="flex flex-col md:flex-row items-stretch gap-3">

        {/* Quick Search */}
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
          <UIInput
            className="pl-12 h-14 bg-slate-900/40 backdrop-blur-md border-white/10 shadow-xl rounded-2xl font-bold italic placeholder:text-slate-600 focus:ring-2 focus:ring-indigo-500/20 transition-all text-white"
            placeholder="Quick search SKU, item name..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        {/* Filter & Sort Toggle */}
        <Button
          variant={isExpanded ? "default" : "outline"}
          onClick={() => setIsExpanded(!isExpanded)}
          className={`h-14 px-6 rounded-2xl gap-3 font-black italic text-xs uppercase tracking-widest transition-all whitespace-nowrap ${
            isExpanded
              ? "bg-white text-slate-950"
              : "bg-slate-900/40 backdrop-blur-md border-white/10 text-slate-400 hover:bg-slate-800"
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filter &amp; Sort
          {activeFilterCount > 0 && (
            <Badge className="bg-indigo-500 text-white ml-1 h-5 min-w-[20px] justify-center px-1">
              {activeFilterCount}
            </Badge>
          )}
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>

        {/* Right-aligned slot: + Add Item etc. */}
        {advancedActions}
      </div>

      {/* ── Expandable Filter Panel ── */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 p-8 rounded-[2.5rem] bg-slate-900/30 backdrop-blur-2xl border border-white/5 shadow-2xl mt-2">

              {/* Category */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-2">Category</label>
                <UISelect value={category || "all"} onValueChange={onCategoryChange}>
                  <UISelectTrigger className="h-12 rounded-xl bg-slate-950/50 border-white/5 shadow-sm font-bold italic text-xs text-white">
                    <UISelectValue placeholder="All Categories" />
                  </UISelectTrigger>
                  <UISelectContent className="rounded-xl bg-slate-900 border-white/10 text-white">
                    <UISelectItem value="all">All Categories</UISelectItem>
                    {categories
                      .filter((c) => c.id !== "all")
                      .map((c) => (
                        <UISelectItem key={c.id} value={c.id}>{c.name}</UISelectItem>
                      ))}
                  </UISelectContent>
                </UISelect>
              </div>

              {/* Sort By */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-2">Sort By</label>
                <UISelect value={sortBy} onValueChange={onSortChange ?? (() => {})}>
                  <UISelectTrigger className="h-12 rounded-xl bg-slate-950/50 border-white/5 shadow-sm font-bold italic text-xs text-white">
                    <UISelectValue placeholder="Sort By" />
                  </UISelectTrigger>
                  <UISelectContent className="rounded-xl bg-slate-900 border-white/10 text-white">
                    {SORT_OPTIONS.map((opt) => (
                      <UISelectItem key={opt.value} value={opt.value} className="font-bold italic">
                        {opt.label}
                      </UISelectItem>
                    ))}
                  </UISelectContent>
                </UISelect>
              </div>

              {/* Status */}
              {onStatusChange && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-2">Item Status</label>
                  <UISelect value={status || "all"} onValueChange={onStatusChange}>
                    <UISelectTrigger className="h-12 rounded-xl bg-slate-950/50 border-white/5 shadow-sm font-bold italic text-xs text-white">
                      <UISelectValue placeholder="All Status" />
                    </UISelectTrigger>
                    <UISelectContent className="rounded-xl bg-slate-900 border-white/10 text-white">
                      <UISelectItem value="all">All Status</UISelectItem>
                      <UISelectItem value="active">Active</UISelectItem>
                      <UISelectItem value="REPAIR">Repair</UISelectItem>
                      <UISelectItem value="REJECT">Reject</UISelectItem>
                      <UISelectItem value="DISCONTINUED">Discontinued</UISelectItem>
                      <UISelectItem value="DRAFT">Draft</UISelectItem>
                      <UISelectItem value="INACTIVE">Inactive</UISelectItem>
                      <UISelectItem value="low">Stock: Low</UISelectItem>
                      <UISelectItem value="critical">Stock: Critical</UISelectItem>
                    </UISelectContent>
                  </UISelect>
                </div>
              )}

              {/* Price Range */}
              {onPriceRangeChange && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-2">Price Range</label>
                  <div className="flex items-center gap-2 h-12 rounded-xl bg-slate-950/50 border border-white/5 shadow-sm px-4">
                    <UIInput
                      type="number"
                      placeholder="Min"
                      className="h-7 border-none bg-transparent font-bold italic text-xs p-0 focus-visible:ring-0 text-white placeholder:text-slate-700"
                      value={minPrice ?? ""}
                      onChange={(e) =>
                        onPriceRangeChange(
                          e.target.value ? parseFloat(e.target.value) : undefined,
                          maxPrice
                        )
                      }
                    />
                    <span className="text-slate-700">/</span>
                    <UIInput
                      type="number"
                      placeholder="Max"
                      className="h-7 border-none bg-transparent font-bold italic text-xs p-0 focus-visible:ring-0 text-right text-white placeholder:text-slate-700"
                      value={maxPrice ?? ""}
                      onChange={(e) =>
                        onPriceRangeChange(
                          minPrice,
                          e.target.value ? parseFloat(e.target.value) : undefined
                        )
                      }
                    />
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
