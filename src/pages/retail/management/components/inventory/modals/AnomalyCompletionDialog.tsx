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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InventoryItemView } from "../types";

export interface CompletionFormData {
  name: string;
  category_id: string;
  base_price: string | number;
}

export interface CompletionSubmitPayload extends Partial<CompletionFormData> {
  is_anomaly?: boolean;
}

export interface AnomalyCompletionDialogProps {
  item: InventoryItemView | null;
  open: boolean;
  onClose: () => void;
  categories: { id: string; name: string }[];
  onSubmit: (itemId: string, data: CompletionSubmitPayload) => Promise<void>;
  isLoading?: boolean;
}

/**
 * Determines whether the anomaly flag should be cleared based on category change.
 * Returns true if category was Anomaly and is now changed to a different category.
 */
export function shouldClearAnomalyFlag(
  item: InventoryItemView | null,
  newCategoryId: string,
  previousCategoryId: string,
): boolean {
  if (!item) return false;
  const isCurrentlyAnomaly = item.category?.toLowerCase() === "anomaly";
  const categoryChanged = newCategoryId !== previousCategoryId;
  return isCurrentlyAnomaly && categoryChanged;
}

/**
 * Builds the payload for the completion API call.
 * If category changes away from Anomaly, includes is_anomaly: false.
 */
export function buildCompletionPayload(
  formData: CompletionFormData,
  item: InventoryItemView | null,
  previousCategoryId: string,
): CompletionSubmitPayload {
  const payload: CompletionSubmitPayload = { ...formData };

  if (shouldClearAnomalyFlag(item, formData.category_id, previousCategoryId)) {
    payload.is_anomaly = false;
  }

  return payload;
}

export const AnomalyCompletionDialog: React.FC<AnomalyCompletionDialogProps> = ({
  item,
  open,
  onClose,
  categories,
  onSubmit,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<CompletionFormData>({
    name: "",
    category_id: "",
    base_price: "",
  });

  const [previousCategory, setPreviousCategory] = useState<string>("");

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name || "",
        category_id: item.categoryId || "",
        base_price: item.price || "",
      });
      setPreviousCategory(item.categoryId || "");
    }
  }, [item]);

  const handleChange = (field: keyof CompletionFormData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!item) return;

    const payload = buildCompletionPayload(formData, item, previousCategory);
    await onSubmit(item.id, payload);
    onClose();
  };

  const isAnomalyCategory = item?.category?.toLowerCase() === "anomaly";
  const willClearAnomaly = shouldClearAnomalyFlag(item, formData.category_id, previousCategory);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="max-w-2xl rounded-2xl p-8 border-none shadow-2xl bg-white/95 backdrop-blur-xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        <DialogHeader className="px-8 pt-8 pb-4 border-b bg-white/90 backdrop-blur-xl shrink-0">
          <div className="flex items-center gap-4 mb-2">
            <div className="h-12 w-12 rounded-2xl bg-primary/5 flex items-center justify-center">
              <span className="text-xl font-black italic text-primary">C</span>
            </div>
            <div>
              <DialogTitle className="text-2xl font-black italic tracking-tight text-foreground">
                Complete Anomaly Item
              </DialogTitle>
              <DialogDescription className="font-bold italic text-xs uppercase tracking-widest text-muted-foreground">
                Update incomplete item details • {item?.sku || "Unknown SKU"}
              </DialogDescription>
            </div>
          </div>
          {isAnomalyCategory && (
            <div className="flex items-center gap-2 text-xs text-warning font-bold bg-warning px-3 py-1.5 rounded-xl mt-2">
              <span className="w-2 h-2 rounded-full bg-warning animate-pulse"></span>
              {willClearAnomaly
                ? "Category changed — anomaly flag will be cleared on save."
                : "This item is in Anomaly category. Changing category will clear the anomaly flag."}
            </div>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="grid grid-cols-2 gap-6 py-2">
            {/* Row 1: Name */}
            <div className="col-span-2 space-y-2">
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

            {/* Row 2: Category */}
            <div className="col-span-2 space-y-2">
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
              {isAnomalyCategory && (
                <p className="text-[10px] text-muted-foreground font-bold">
                  Changing from Anomaly category will remove this item from anomaly review.
                </p>
              )}
            </div>

            {/* Row 3: Price */}
            <div className="col-span-2 space-y-2">
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
          </div>
        </div>

        <DialogFooter className="px-8 py-6 border-t bg-white/90 backdrop-blur-xl shrink-0 gap-3 sm:justify-start">
          <Button
            onClick={handleSubmit}
            disabled={
              isLoading ||
              !formData.name ||
              !formData.category_id ||
              !formData.base_price
            }
            className="flex-1 h-14 rounded-2xl bg-primary text-primary-foreground font-black italic shadow-xl shadow-slate-900/10 transition-all hover:-translate-y-0.5 hover:bg-primary/90"
          >
            {isLoading ? "Completing..." : "Complete Item"}
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
