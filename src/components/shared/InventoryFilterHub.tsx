import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, SlidersHorizontal, ChevronDown, ChevronUp, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  location?: string;
  onLocationChange?: (val: string) => void;
  locations?: { id: string; name: string }[];
  moduleTag?: string;
  onModuleTagChange?: (val: string) => void;
  locationLabel?: string;
  minPrice?: number;
  maxPrice?: number;
  onPriceRangeChange?: (min?: number, max?: number) => void;
  advancedActions?: React.ReactNode;
}

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
  location,
  onLocationChange,
  locations,
  locationLabel = "Location",
  moduleTag,
  onModuleTagChange,
  minPrice,
  maxPrice,
  onPriceRangeChange,
  advancedActions,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const activeFilterCount = [
    category !== "all" && category !== "",
    type && type !== "all",
    status && status !== "all",
    location && location !== "all" && location !== "",
    moduleTag && moduleTag !== "",
    (minPrice !== undefined || maxPrice !== undefined)
  ].filter(Boolean).length;

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col md:flex-row items-stretch gap-4">
        {/* Main Search Bar */}
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
          <Input
            className="pl-12 h-14 bg-slate-900/40 backdrop-blur-md border-white/10 shadow-xl rounded-2xl font-bold italic placeholder:text-slate-600 focus:ring-2 focus:ring-indigo-500/20 transition-all text-white"
            placeholder="Quick search SKU, item name..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        {/* Advanced Filters Toggle */}
        <Button
          variant={isExpanded ? "default" : "outline"}
          onClick={() => setIsExpanded(!isExpanded)}
          className={`h-14 px-6 rounded-2xl gap-3 font-black italic text-xs uppercase tracking-widest transition-all flex-1 md:flex-none ${
            isExpanded ? "bg-white text-slate-950" : "bg-slate-900/40 backdrop-blur-md border-white/10 text-slate-400 hover:bg-slate-800"
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filter & Sort
          {activeFilterCount > 0 && (
            <Badge className="bg-indigo-500 text-white ml-1 h-5 min-w-[20px] justify-center px-1">
              {activeFilterCount}
            </Badge>
          )}
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>

        {advancedActions}
      </div>

      {/* Advanced Filter Panel */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 p-8 rounded-[2.5rem] bg-slate-900/30 backdrop-blur-2xl border border-white/5 shadow-2xl mt-2">
              {/* Category Filter (Moved Inside) */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-2">Category</label>
                <Select value={category || "all"} onValueChange={onCategoryChange}>
                  <SelectTrigger className="h-12 rounded-xl bg-slate-950/50 border-white/5 shadow-sm font-bold italic text-xs text-white">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl bg-slate-900 border-white/10 text-white">
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              {onStatusChange && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-2">Item Status</label>
                  <Select value={status || "all"} onValueChange={onStatusChange}>
                    <SelectTrigger className="h-12 rounded-xl bg-slate-950/50 border-white/5 shadow-sm font-bold italic text-xs text-white">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl bg-slate-900 border-white/10 text-white">
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">ACTIVE</SelectItem>
                      <SelectItem value="REPAIR">REPAIR</SelectItem>
                      <SelectItem value="REJECT">REJECT</SelectItem>
                      <SelectItem value="DISCONTINUED">DISCONTINUED</SelectItem>
                      <SelectItem value="DRAFT">DRAFT</SelectItem>
                      <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                      <SelectItem value="low">STOCK: LOW</SelectItem>
                      <SelectItem value="critical">STOCK: CRITICAL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Advanced Sorting */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-2">Sort By</label>
                <Select 
                  value={type || "created_at-desc"} 
                  onValueChange={onTypeChange}
                >
                  <SelectTrigger className="h-12 rounded-xl bg-slate-950/50 border-white/5 shadow-sm font-bold italic text-xs text-white">
                    <SelectValue placeholder="Newest First" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl bg-slate-900 border-white/10 text-white">
                    <SelectItem value="created_at-desc">Newest First</SelectItem>
                    <SelectItem value="created_at-asc">Oldest First</SelectItem>
                    <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                    <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                    <SelectItem value="quantity-desc">Quantity (High-Low)</SelectItem>
                    <SelectItem value="quantity-asc">Quantity (Low-High)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Location Filter */}
              {onLocationChange && locations && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-2">{locationLabel}</label>
                  <Select value={location || "all"} onValueChange={onLocationChange}>
                    <SelectTrigger className="h-12 rounded-xl bg-slate-950/50 border-white/5 shadow-sm font-bold italic text-xs text-white">
                      <SelectValue placeholder={`All ${locationLabel}s`} />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl bg-slate-900 border-white/10 text-white">
                      <SelectItem value="all">All {locationLabel}s</SelectItem>
                      {locations.map(loc => (
                        <SelectItem key={loc.id} value={loc.id} className="font-bold italic">{loc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Module Tag Filter */}
              {onModuleTagChange && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-2">Context Tag</label>
                  <Input 
                    placeholder="e.g. RETAIL"
                    className="h-12 rounded-xl bg-slate-950/50 border-white/5 shadow-sm font-bold italic text-xs text-white placeholder:text-slate-700"
                    value={moduleTag || ""}
                    onChange={(e) => onModuleTagChange(e.target.value)}
                  />
                </div>
              )}

              {/* Price Range Filter */}
              {onPriceRangeChange && (
                <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-2">Price Range</label>
                  <div className="flex items-center gap-2 h-12 rounded-xl bg-slate-950/50 border-white/5 shadow-sm px-4">
                    <Input 
                      type="number"
                      placeholder="Min"
                      className="h-7 border-none bg-transparent font-bold italic text-xs p-0 focus-visible:ring-0 text-white placeholder:text-slate-700"
                      value={minPrice ?? ""}
                      onChange={(e) => onPriceRangeChange(e.target.value ? parseFloat(e.target.value) : undefined, maxPrice)}
                    />
                    <span className="text-slate-700">/</span>
                    <Input 
                      type="number"
                      placeholder="Max"
                      className="h-7 border-none bg-transparent font-bold italic text-xs p-0 focus-visible:ring-0 text-right text-white placeholder:text-slate-700"
                      value={maxPrice ?? ""}
                      onChange={(e) => onPriceRangeChange(minPrice, e.target.value ? parseFloat(e.target.value) : undefined)}
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
