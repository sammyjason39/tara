import type React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface FilterBarProps {
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  filters?: React.ReactNode;
  onReset?: () => void;
  actions?: React.ReactNode;
  showDateRange?: boolean;
}

export function FilterBar({
  searchPlaceholder = "Search...",
  searchValue,
  onSearchChange,
  filters,
  onReset,
  actions,
  showDateRange = false,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3">
      <div className="flex flex-1 flex-wrap items-center gap-3">
        <div className="min-w-[200px] max-w-[320px] flex-1">
          <Input
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(event) => onSearchChange?.(event.target.value)}
          />
        </div>
        {showDateRange ? (
          <Input
            placeholder="Date range"
            className="max-w-[200px]"
            disabled
          />
        ) : null}
        {filters}
        {onReset ? (
          <Button variant="ghost" size="sm" onClick={onReset}>
            Reset
          </Button>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export default FilterBar;
