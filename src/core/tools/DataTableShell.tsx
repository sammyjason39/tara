import type React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DataTableShellProps {
  title?: string;
  subtitle?: string;
  toolbar?: React.ReactNode;
  sortOptions?: Array<{ label: string; value: string }>;
  sortValue?: string;
  onSortChange?: (value: string) => void;
  emptyState?: React.ReactNode;
  className?: string;
  total?: number;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  children: React.ReactNode;
}

export function DataTableShell({
  title,
  subtitle,
  toolbar,
  sortOptions,
  sortValue,
  onSortChange,
  emptyState,
  className,
  total = 0,
  page = 1,
  pageSize = 10,
  onPageChange,
  children,
}: DataTableShellProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);

  return (
    <section className={cn("space-y-4", className)}>
      {(title || subtitle || toolbar) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            {title ? (
              <h2 className="text-base font-semibold tracking-tight text-foreground">
                {title}
              </h2>
            ) : null}
            {subtitle ? (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {sortOptions && sortOptions.length > 0 ? (
              <select
                className="h-9 rounded-md border bg-background px-3 text-sm"
                value={sortValue}
                onChange={(event) => onSortChange?.(event.target.value)}
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : null}
            {toolbar ? <div className="flex items-center gap-2">{toolbar}</div> : null}
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="w-full overflow-auto">
          {total === 0 && emptyState ? emptyState : children}
        </div>
      </div>

      {onPageChange ? (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          <span>
            Showing {start}-{end} of {total}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page <= 1}
            >
              Previous
            </Button>
            <span className="text-xs">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default DataTableShell;
