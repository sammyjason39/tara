import React from "react";
import { Trash2, Printer, Barcode, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { generateSkuFromCategory, generateBarcode } from "./NewItemFormHelpers";

// --- Types ---

export interface NewItemLine {
  tempId: string;
  name: string;
  sku: string;
  barcode: string;
  categoryId: string;
  price: number;
  qty: number;
  unit?: string;
  description?: string;
  type?: "ITEM" | "SERVICE" | "RAW_MATERIAL";
  status?: "active" | "draft";
}

// --- Helpers moved to NewItemFormHelpers.ts ---

// --- Props ---

interface NewItemFormRowProps {
  line: NewItemLine;
  categoryOptions: { id: string; name: string }[];
  onChange: (id: string, changes: Partial<NewItemLine>) => void;
  onRemove: (id: string) => void;
  onPrint?: (line: NewItemLine) => void;
  showQty?: boolean;
  showExtended?: boolean;
}

// --- Component ---

export const NewItemFormRow: React.FC<NewItemFormRowProps> = ({
  line,
  categoryOptions,
  onChange,
  onRemove,
  onPrint,
  showQty = true,
  showExtended = false,
}) => {
  return (
    <div className="rounded-[1.5rem] border border-slate-100 bg-white p-6 shadow-sm hover:shadow-md transition-all space-y-4">
      {/* Row header */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black italic uppercase tracking-widest text-indigo-600">
          New Item
        </span>
        <div className="flex items-center gap-2">
          {onPrint && (
            <Button
              size="sm"
              variant="ghost"
              title="Print Barcode"
              className="h-8 w-8 p-0 rounded-lg hover:bg-indigo-50 hover:text-indigo-700"
              onClick={() => onPrint(line)}
              disabled={!line.name || !line.sku}
            >
              <Printer className="w-4 h-4" />
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            title="Remove Item"
            className="h-8 w-8 p-0 rounded-lg hover:bg-red-50 hover:text-red-500"
            onClick={() => onRemove(line.tempId)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* 1. Product Name */}
        <div
          className={cn(
            "space-y-1.5",
            showExtended ? "md:col-span-8" : "md:col-span-12",
          )}
        >
          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Product Name *
          </Label>
          <Input
            placeholder="e.g. Arabica Coffee 250g"
            value={line.name}
            onChange={(e) => onChange(line.tempId, { name: e.target.value })}
            className="h-11 rounded-xl font-bold bg-slate-50/50 border-slate-100 text-sm focus:bg-white transition-all shadow-inner"
          />
        </div>

        {/* 2. Category, Price, Qty/Unit */}
        <div className="md:col-span-12 grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="space-y-1.5 sm:col-span-1">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Category *
            </Label>
            <Select
              value={line.categoryId}
              onValueChange={(v) => {
                const catName =
                  categoryOptions.find((c) => c.id === v)?.name ?? "";
                const sku = generateSkuFromCategory(catName);
                onChange(line.tempId, {
                  categoryId: v,
                  sku,
                  barcode: generateBarcode(sku),
                });
              }}
            >
              <SelectTrigger className="h-11 rounded-xl font-bold bg-slate-50/50 border-slate-100 text-sm">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent className="rounded-xl font-bold italic">
                {categoryOptions
                  .filter((c) => c.id !== "all")
                  .map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 sm:col-span-1">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Base Price
            </Label>
            <Input
              type="number"
              min="0"
              placeholder="0.00"
              value={line.price || ""}
              onChange={(e) =>
                onChange(line.tempId, {
                  price: parseFloat(e.target.value) || 0,
                })
              }
              className="h-11 rounded-xl font-bold bg-slate-50/50 border-slate-100 text-sm focus:bg-white transition-all shadow-inner"
            />
          </div>

          {showQty && (
            <div className="space-y-1.5 sm:col-span-1">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Quantity *
              </Label>
              <Input
                type="number"
                min="1"
                value={line.qty}
                onChange={(e) =>
                  onChange(line.tempId, {
                    qty: Math.max(1, parseInt(e.target.value) || 1),
                  })
                }
                className="h-11 rounded-xl font-bold bg-slate-50/50 border-slate-100 text-sm text-center text-indigo-600 focus:bg-white transition-all shadow-inner"
              />
            </div>
          )}

          {showExtended && (
            <div className="space-y-1.5 sm:col-span-1">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Unit (UoM)
              </Label>
              <Input
                placeholder="pcs"
                value={line.unit}
                onChange={(e) =>
                  onChange(line.tempId, { unit: e.target.value })
                }
                className="h-11 rounded-xl font-bold bg-slate-50/50 border-slate-100 text-sm focus:bg-white transition-all shadow-inner"
              />
            </div>
          )}
        </div>

        {/* 3. SKU & Barcode */}
        <div className="md:col-span-12 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Barcode className="w-3.5 h-3.5" /> SKU
              </div>
              {line.categoryId && (
                <span className="text-[9px] text-emerald-500 italic font-black">
                  AUTO-GENERATED
                </span>
              )}
            </Label>
            <div className="relative group/sku">
              <Input
                placeholder={
                  line.categoryId
                    ? line.sku || "Auto from category"
                    : "Select category first"
                }
                value={line.sku}
                readOnly={!line.categoryId}
                onChange={(e) =>
                  onChange(line.tempId, {
                    sku: e.target.value,
                    barcode: generateBarcode(e.target.value),
                  })
                }
                className={cn(
                  "h-11 rounded-xl font-mono font-bold border-slate-100 text-xs pr-10",
                  line.categoryId
                    ? "bg-slate-50/50 focus:bg-white"
                    : "bg-slate-100 text-slate-400 cursor-not-allowed",
                )}
              />
              {line.categoryId && (
                <button
                  onClick={() => {
                    const catName =
                      categoryOptions.find((c) => c.id === line.categoryId)
                        ?.name ?? "";
                    const sku = generateSkuFromCategory(catName);
                    onChange(line.tempId, {
                      sku,
                      barcode: generateBarcode(sku),
                    });
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-indigo-600 transition-colors"
                  title="Regenerate SKU"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center justify-between">
              <div>Barcode</div>
              {line.sku && (
                <span className="text-[9px] text-emerald-500 italic font-black">
                  SYNCED WITH SKU
                </span>
              )}
            </Label>
            <Input
              placeholder={line.sku ? "Auto from SKU" : "—"}
              value={line.barcode}
              onChange={(e) =>
                onChange(line.tempId, { barcode: e.target.value })
              }
              className="h-11 rounded-xl font-mono font-bold bg-slate-50/50 border-slate-100 text-xs focus:bg-white transition-all shadow-inner"
            />
          </div>
        </div>

        {/* 4. Extended fields (Description, Type) */}
        {showExtended && (
          <div className="md:col-span-12 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Description
              </Label>
              <textarea
                value={line.description}
                onChange={(e) =>
                  onChange(line.tempId, { description: e.target.value })
                }
                placeholder="Item details, specifications, etc..."
                className="w-full min-h-[80px] rounded-xl font-bold bg-slate-50/50 border border-slate-100 p-4 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-inner resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Item Type
                </Label>
                <Select
                  value={line.type || "ITEM"}
                  onValueChange={(v: "ITEM" | "SERVICE" | "RAW_MATERIAL") =>
                    onChange(line.tempId, { type: v })
                  }
                >
                  <SelectTrigger className="h-11 rounded-xl font-bold bg-slate-50/50 border-slate-100 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl font-bold italic">
                    <SelectItem value="ITEM">ITEM</SelectItem>
                    <SelectItem value="SERVICE">SERVICE</SelectItem>
                    <SelectItem value="RAW_MATERIAL">RAW MATERIAL</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Default Status
                </Label>
                <Select
                  value={line.status || "active"}
                  onValueChange={(v: "active" | "draft") =>
                    onChange(line.tempId, { status: v })
                  }
                >
                  <SelectTrigger className="h-11 rounded-xl font-bold bg-slate-50/50 border-slate-100 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl font-bold italic">
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="draft">
                      Draft (Needs Approval)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
