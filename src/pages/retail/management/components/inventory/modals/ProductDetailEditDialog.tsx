import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InventoryItemView } from "../types";
import { RetailProduct } from "@/core/types/retail/retail";
import { cn } from "@/lib/utils";

interface ProductFormData {
  name: string;
  sku: string;
  barcode: string;
  category_id: string;
  base_price: string | number;
  unit: string;
  type: string;
  description: string;
  stock_on_hand: string;
  reserved: string;
}

interface Props {
  item: InventoryItemView | null;
  open: boolean;
  onClose: () => void;
  categories: { id: string; name: string }[];
  onSubmit: (productId: string, data: Partial<RetailProduct>) => Promise<void>;
  isLoading?: boolean;
}

export const ProductDetailEditDialog: React.FC<Props> = ({
  item,
  open,
  onClose,
  categories,
  onSubmit,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<ProductFormData>({
    name: "",
    sku: "",
    barcode: "",
    category_id: "",
    base_price: "",
    unit: "",
    type: "",
    description: "",
    stock_on_hand: "0",
    reserved: "0",
  });

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name || "",
        sku: item.sku || "",
        barcode: item.barcode || "",
        category_id: item.categoryId || "",
        base_price: item.price || "",
        unit: item.unit || "",
        type: item.type || "ITEM",
        description: item.description || "",
        stock_on_hand: item.onHand?.toString() || "0",
        reserved: item.reserved?.toString() || "0",
      });
    }
  }, [item]);

  if (!item) return null;

  const handleChange = (field: keyof ProductFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    // Convert base_price back to number
    const payload = {
      ...formData,
      base_price: Number(formData.base_price),
      stock_on_hand: Number(formData.stock_on_hand),
      reserved: Number(formData.reserved),
    };
    await onSubmit(item.id, payload);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="max-w-2xl rounded-2xl p-8 border-none shadow-2xl bg-white/95 backdrop-blur-xl max-h-[90vh] flex
    flex-col overflow-hidden"
      >
        <DialogHeader className="px-8 pt-8 pb-4 border-b bg-white/90 backdrop-blur-xl shrink-0">
          <div className="flex items-center gap-4 mb-2">
            <div className="h-12 w-12 rounded-2xl bg-primary/5 flex items-center justify-center">
              <span className="text-xl font-black italic text-primary">P</span>
            </div>
            <div>
              <DialogTitle className="text-2xl font-black italic tracking-tight text-foreground">
                Edit Product
              </DialogTitle>
              <DialogDescription className="font-bold italic text-xs uppercase tracking-widest text-muted-foreground">
                Master Data Configuration • {item.sku}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="grid grid-cols-2 gap-6 py-2">
            {/* Row 1: Name & SKU */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">
                Product Name
              </Label>
              <Input
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className="h-12 rounded-2xl font-bold bg-secondary/5 border-none focus-visible:ring-2 focus-visible:ring-blue-500/20 transition-all px-5"
                placeholder="e.g. Leather Jacket"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">
                SKU Code
              </Label>
              <Input
                value={formData.sku}
                onChange={(e) => handleChange("sku", e.target.value)}
                className="h-12 rounded-2xl font-bold bg-secondary/5 border-none focus-visible:ring-2 focus-visible:ring-blue-500/20 transition-all px-5 font-mono uppercase"
              />
            </div>

            {/* Row 2: Category & Type */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">
                Category
              </Label>
              <Select
                value={formData.category_id}
                onValueChange={(val) => handleChange("category_id", val)}
              >
                <SelectTrigger className="h-12 rounded-2xl font-bold bg-secondary/5 border-none px-5">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-none shadow-2xl p-2">
                  {(Array.isArray(categories) ? categories : []).map((cat) => (
                    <SelectItem
                      key={cat.id}
                      value={cat.id}
                      className="rounded-xl font-bold italic py-3"
                    >
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">
                Item Type
              </Label>
              <Select
                value={formData.type}
                onValueChange={(val) => handleChange("type", val)}
              >
                <SelectTrigger className="h-12 rounded-2xl font-bold bg-secondary/5 border-none px-5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-none shadow-2xl p-2">
                  <SelectItem
                    value="ITEM"
                    className="rounded-xl font-bold italic py-3"
                  >
                    ITEM
                  </SelectItem>
                  <SelectItem
                    value="SERVICE"
                    className="rounded-xl font-bold italic py-3"
                  >
                    SERVICE
                  </SelectItem>
                  <SelectItem
                    value="RAW_MATERIAL"
                    className="rounded-xl font-bold italic py-3"
                  >
                    RAW MATERIAL
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Row 3: Base Price & Unit */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">
                Base Price
              </Label>
              <div className="relative">
                <Input
                  type="number"
                  value={formData.base_price}
                  onChange={(e) => handleChange("base_price", e.target.value)}
                  className="h-12 rounded-2xl font-black italic bg-secondary/5 border-none pl-12 pr-5 focus-visible:ring-2 focus-visible:ring-blue-500/20 transition-all"
                />
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-[10px] font-black italic text-muted-foreground">
                  Rp
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">
                Unit (UoM)
              </Label>
              <Input
                value={formData.unit}
                onChange={(e) => handleChange("unit", e.target.value)}
                className="h-12 rounded-2xl font-bold bg-secondary/5 border-none px-5"
                placeholder="e.g. Pcs, Kg, Box"
              />
            </div>

            {/* Row 4: Stock Levels */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">
                Stock on Hand (SOH)
              </Label>
              <Input
                type="number"
                value={formData.stock_on_hand}
                onChange={(e) => handleChange("stock_on_hand", e.target.value)}
                className="h-12 rounded-2xl font-bold bg-secondary/5 border-none focus-visible:ring-2 focus-visible:ring-blue-500/20 transition-all px-5"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">
                Reserved / ATS
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={formData.reserved}
                  onChange={(e) => handleChange("reserved", e.target.value)}
                  className="h-12 rounded-2xl font-bold bg-secondary/5 border-none focus-visible:ring-2 focus-visible:ring-amber-500/20 transition-all px-5 min-w-0"
                  placeholder="Reserved"
                />
                <div
                  className={cn(
                    "h-12 flex items-center justify-center shrink-0 px-4 rounded-2xl font-black text-sm",
                    Number(formData.stock_on_hand) - Number(formData.reserved) >
                      0
                      ? "bg-success text-success"
                      : "bg-destructive text-destructive",
                  )}
                  title="Available to Sell"
                >
                  ATS{" "}
                  {Number(formData.stock_on_hand) - Number(formData.reserved)}
                </div>
              </div>
            </div>

            {/* Row 5: Description */}
            <div className="col-span-2 space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">
                Description
              </Label>
              <Textarea
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                className="min-h-[100px] rounded-2xl font-bold bg-secondary/5 border-none focus-visible:ring-2 focus-visible:ring-blue-500/20 transition-all p-5 resize-none leading-relaxed"
                placeholder="Detailed product description, variants mapping, or web sync notes..."
              />
            </div>
          </div>
        </div>

        <DialogFooter className="px-8 py-6 border-t bg-white/90 backdrop-blur-xl shrink-0 gap-3 sm:justify-start">
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !formData.name || !formData.sku}
            className="flex-1 h-14 rounded-2xl bg-secondary hover:bg-secondary/60 text-foreground font-black italic shadow-xl shadow-slate-900/10 transition-all hover:-translate-y-0.5"
          >
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
            className="h-14 px-8 rounded-2xl font-black italic bg-white border-2 border-border hover:bg-secondary/5 transition-all"
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
