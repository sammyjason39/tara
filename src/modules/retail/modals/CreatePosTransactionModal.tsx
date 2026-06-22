/**
 * POS Transaction Modal
 *
 * Allows cashiers to create a POS transaction with:
 * - Item lookup by SKU or name
 * - Quantity adjustment (1-9999)
 * - Discount entry (percentage or fixed)
 * - Payment method selection (cash or electronic)
 *
 * Requirements: 8.1, 8.2, 16.1
 */

import { useState } from "react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ModuleModal } from "@/components/shared/ModuleModal";
import { useModuleMutation } from "@/hooks/useModuleQuery";
import {
  createPosTransactionSchema,
  type CreatePosTransactionInput,
  type PosLineItemInput,
  calculateLineTotal,
  calculateGrandTotal,
} from "../schemas";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2 } from "lucide-react";

interface CreatePosTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeId?: string;
  terminalId?: string;
  shiftId?: string;
}

export function CreatePosTransactionModal({
  isOpen,
  onClose,
  storeId = "",
  terminalId = "",
  shiftId = "",
}: CreatePosTransactionModalProps) {
  const { toast } = useToast();
  const [lineItems, setLineItems] = useState<PosLineItemInput[]>([
    { itemId: "", sku: "", itemName: "", quantity: 1, unitPrice: 0, discountType: undefined, discountValue: 0 },
  ]);

  const mutation = useModuleMutation<CreatePosTransactionInput, unknown>(
    "/v1/retail/pos/transactions",
    "POST",
    ["/v1/retail/pos/transactions", "/v1/retail/sales/history"]
  );

  const handleSubmit = async (data: CreatePosTransactionInput) => {
    const payload = { ...data, lineItems, storeId, terminalId, shiftId };
    await mutation.mutateAsync(payload);
    toast({ title: "Transaction completed", description: "POS transaction recorded successfully." });
    setLineItems([{ itemId: "", sku: "", itemName: "", quantity: 1, unitPrice: 0, discountType: undefined, discountValue: 0 }]);
    onClose();
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { itemId: "", sku: "", itemName: "", quantity: 1, unitPrice: 0, discountType: undefined, discountValue: 0 }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const updateLineItem = (index: number, field: keyof PosLineItemInput, value: string | number) => {
    const updated = [...lineItems];
    (updated[index] as any)[field] = value;
    setLineItems(updated);
  };

  const grandTotal = calculateGrandTotal(
    lineItems.map((item) => ({
      quantity: item.quantity || 0,
      unitPrice: item.unitPrice || 0,
      discountType: item.discountType,
      discountValue: item.discountValue || 0,
    }))
  );

  return (
    <ModuleModal
      schema={createPosTransactionSchema}
      defaultValues={{
        lineItems: [{ itemId: "", sku: "", itemName: "", quantity: 1, unitPrice: 0, discountType: undefined, discountValue: 0 }],
        paymentMethod: "cash",
        storeId,
        terminalId,
        customerId: "",
        shiftId,
        notes: "",
      }}
      onSubmit={handleSubmit}
      onCancel={() => {
        setLineItems([{ itemId: "", sku: "", itemName: "", quantity: 1, unitPrice: 0, discountType: undefined, discountValue: 0 }]);
        onClose();
      }}
      title="New POS Transaction"
      description="Create a point-of-sale transaction with item lookup, quantity, and discount."
      isOpen={isOpen}
    >
      {(form) => (
        <div className="space-y-4">
          {/* Line Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <FormLabel className="text-sm font-medium">Line Items</FormLabel>
              <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                <Plus className="h-3 w-3 mr-1" /> Add Item
              </Button>
            </div>

            {lineItems.map((item, index) => (
              <div key={index} className="rounded-md border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Item #{index + 1}</span>
                  {lineItems.length > 1 && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeLineItem(index)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">SKU / Item ID</label>
                    <Input
                      placeholder="SKU or ID"
                      value={item.itemId}
                      onChange={(e) => {
                        updateLineItem(index, "itemId", e.target.value);
                        updateLineItem(index, "sku", e.target.value);
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Item Name</label>
                    <Input
                      placeholder="Search by name..."
                      value={item.itemName || ""}
                      onChange={(e) => updateLineItem(index, "itemName", e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Qty (1-9999)</label>
                    <Input
                      type="number"
                      min={1}
                      max={9999}
                      value={item.quantity}
                      onChange={(e) => updateLineItem(index, "quantity", parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Unit Price</label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={item.unitPrice || ""}
                      onChange={(e) => updateLineItem(index, "unitPrice", parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">
                      Line Total
                    </label>
                    <div className="h-9 flex items-center text-sm font-medium px-2 border rounded-md bg-muted">
                      {calculateLineTotal(
                        item.quantity || 0,
                        item.unitPrice || 0,
                        item.discountType,
                        item.discountValue || 0
                      ).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Discount Type</label>
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                      value={item.discountType || ""}
                      onChange={(e) => updateLineItem(index, "discountType", e.target.value as any)}
                    >
                      <option value="">None</option>
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Amount</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">
                      Discount Value {item.discountType === "percentage" ? "(0-100%)" : ""}
                    </label>
                    <Input
                      type="number"
                      min={0}
                      max={item.discountType === "percentage" ? 100 : undefined}
                      step="0.01"
                      value={item.discountValue || ""}
                      onChange={(e) => updateLineItem(index, "discountValue", parseFloat(e.target.value) || 0)}
                      disabled={!item.discountType}
                    />
                  </div>
                </div>
              </div>
            ))}

            {form.formState.errors.lineItems && (
              <p className="text-sm text-destructive">{form.formState.errors.lineItems.message}</p>
            )}
          </div>

          {/* Grand Total */}
          <div className="flex items-center justify-between rounded-md bg-muted px-4 py-2">
            <span className="text-sm font-medium">Grand Total</span>
            <span className="text-lg font-bold">
              {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          {/* Payment Method */}
          <FormField
            control={form.control}
            name="paymentMethod"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Payment Method</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Select payment method" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="electronic">Electronic (Card/QR/Wallet)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Notes */}
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes (optional)</FormLabel>
                <FormControl><Input placeholder="Additional notes..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </ModuleModal>
  );
}
