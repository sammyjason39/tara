import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  RefreshCw,
  MoreVertical,
  Edit3,
  Truck,
  Trash2,
  Printer,
  FolderTree,
  Image as ImageIcon,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { InventoryItemView } from "./types";

type PaginationProps = {
  page: number;
  totalPages: number;
  totalItems: number;
  currentCount: number;
  onPageChange: (page: number) => void;
};

type TableProps = {
  items: InventoryItemView[];
  isLoading: boolean;
  page: number;
  pageSize: number;
  statusBadge: (status: string) => string;
  onEdit: (item: InventoryItemView) => void;
  onPrint: (item: InventoryItemView) => void;
  onMovement: (type: "transfer_out", item: InventoryItemView) => void;
  onReclassify?: (item: InventoryItemView) => void;
  onComplete?: (item: InventoryItemView) => void;
  onCategoryClick?: (categoryId: string) => void;
  onRowClick?: (item: InventoryItemView) => void;
} & PaginationProps;

const PaginationBar: React.FC<PaginationProps> = ({
  page,
  totalPages,
  totalItems,
  currentCount,
  onPageChange,
}) => {
  const windowPages = Array.from(
    { length: totalPages },
    (_, idx) => idx + 1,
  ).filter((p) => {
    const start = Math.max(1, page - 3);
    const end = Math.min(totalPages, page + 3);
    return p >= start && p <= end;
  });

  return (
    <div className="px-6 py-4 border-t border-border bg-secondary/5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-[10px] font-black italic uppercase tracking-widest text-muted-foreground">
          Page {page} of {totalPages} • Total {totalItems} items
        </span>
        <span className="text-[10px] font-black italic uppercase tracking-widest text-muted-foreground">
          Showing {currentCount} on this page
        </span>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-8"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            ←
          </Button>
          {(Array.isArray(windowPages) ? windowPages : []).map((pNum) => (
            <Button
              key={pNum}
              size="sm"
              variant={pNum === page ? "default" : "outline"}
              className="h-8 w-10"
              onClick={() => onPageChange(pNum)}
            >
              {pNum}
            </Button>
          ))}
          <Button
            size="sm"
            variant="outline"
            className="h-8"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            →
          </Button>
          <div className="flex items-center gap-1 text-[10px] uppercase font-black italic text-muted-foreground">
            Jump:
            <Input
              type="number"
              min={1}
              max={totalPages}
              className="h-8 w-16 text-center text-[11px]"
              defaultValue={page}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const val = Number((e.target as HTMLInputElement).value);
                  if (Number.isInteger(val) && val >= 1 && val <= totalPages) {
                    onPageChange(val);
                  }
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export const InventoryTable: React.FC<TableProps> = ({
  items,
  isLoading,
  page,
  pageSize,
  totalPages,
  totalItems,
  currentCount,
  statusBadge,
  onEdit,
  onPrint,
  onMovement,
  onPageChange,
  onComplete,
  onCategoryClick,
  onRowClick,
}) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            {[
              "Image",
              "SKU",
              "Name / Category",
              "On Hand",
              "Reserved",
              "ATS",
              "Price",
              "Buffer Min",
              "Status",
              "",
            ].map((h, i) => (
              <th
                key={i}
                className="px-6 py-4 text-left text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground italic"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={9} className="px-6 py-16 text-center">
                <div className="flex flex-col items-center gap-2">
                  <RefreshCw className="w-6 h-6 text-primary animate-spin" />
                  <span className="text-[10px] font-black italic uppercase tracking-widest text-muted-foreground">
                    Pulling from Core...
                  </span>
                </div>
              </td>
            </tr>
          ) : (
            (Array.isArray(items) ? items : []).map((item, i) => {
              const number = (page - 1) * pageSize + i + 1;
              return (
                <tr
                  key={item.id}
                  onClick={() => onRowClick?.(item)}
                  className="group border-b border-border last:border-none hover:bg-secondary/5 transition-colors cursor-pointer"
                >
                  <td className="px-6 py-4">
                    <div className="h-10 w-10 rounded-xl overflow-hidden bg-muted dark:bg-muted border border-border dark:border-border flex items-center justify-center">
                      {item.imageUrl ? (
                        <img 
                          src={item.imageUrl} 
                          alt={item.name} 
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.target as any).src = "";
                            (e.target as any).className = "hidden";
                          }}
                        />
                      ) : (
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-[11px] text-muted-foreground font-bold">
                    {item.sku}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-black italic text-sm text-foreground">
                      {item.name}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onCategoryClick?.(item.categoryId);
                      }}
                      className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest hover:text-primary hover:underline transition-colors block text-left"
                    >
                      {item.category}
                    </button>
                  </td>
                  <td className="px-6 py-4 font-black italic text-foreground">
                    {item.onHand}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground font-bold italic text-sm">
                    {item.reserved}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={cn(
                        "font-black italic",
                        item.available <= 0
                          ? "text-destructive"
                          : "text-success",
                      )}
                    >
                      {item.available}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground font-bold italic text-sm">
                    {item.minBuffer}
                  </td>
                  <td className="px-6 py-4 font-black italic text-primary">
                    Rp {(item.price || 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <Badge
                      className={cn(
                        "border-none font-black italic text-[9px] uppercase tracking-widest",
                        statusBadge(item.status),
                      )}
                    >
                      {item.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => e.stopPropagation()}
                          className="h-8 w-8 rounded-xl text-muted-foreground/60 hover:text-muted-foreground"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="w-48 rounded-2xl p-2 border-none shadow-2xl"
                      >
                        <DropdownMenuItem
                          className="rounded-xl gap-2 font-black italic text-xs py-3"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(item);
                          }}
                        >
                          <Edit3 className="w-3.5 h-3.5 text-primary" /> Edit
                          Buffer
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="rounded-xl gap-2 font-black italic text-xs py-3"
                          onClick={(e) => {
                            e.stopPropagation();
                            onPrint(item);
                          }}
                        >
                          <Printer className="w-3.5 h-3.5 text-muted-foreground" />{" "}
                          Print Barcode
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="rounded-xl gap-2 font-black italic text-xs py-3"
                          onClick={(e) => {
                            e.stopPropagation();
                            onMovement("transfer_out", item);
                          }}
                        >
                          <Truck className="w-3.5 h-3.5 text-primary" />{" "}
                          Transfer Out
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="rounded-xl gap-2 font-black italic text-xs py-3"
                          onClick={(e) => {
                            e.stopPropagation();
                            onReclassify?.(item);
                          }}
                        >
                          <FolderTree className="w-3.5 h-3.5 text-warning" />{" "}
                          Change Category
                        </DropdownMenuItem>
                        {item.category?.toLowerCase() === "anomaly" && onComplete && (
                          <DropdownMenuItem
                            className="rounded-xl gap-2 font-black italic text-xs py-3"
                            onClick={(e) => {
                              e.stopPropagation();
                              onComplete(item);
                            }}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-success" />{" "}
                            Complete Item
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="rounded-xl gap-2 font-black italic text-xs py-3 text-destructive focus:bg-destructive"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Request Write-off
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
      <PaginationBar
        page={page}
        totalPages={totalPages}
        totalItems={totalItems}
        currentCount={currentCount}
        onPageChange={onPageChange}
      />
    </div>
  );
};
