/**
 * Stock Edit Modal
 *
 * Adjust stock levels with reason tracking.
 * Requirements: 8.1, 16.1
 */

import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ModuleModal } from "@/components/shared/ModuleModal";
import { useModuleMutation } from "@/hooks/useModuleQuery";
import { stockEditSchema, type StockEditInput } from "../schemas";
import { useToast } from "@/hooks/use-toast";

interface StockEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId?: string;
  productName?: string;
}

export function StockEditModal({ isOpen, onClose, productId = "", productName = "" }: StockEditModalProps) {
  const { toast } = useToast();

  const mutation = useModuleMutation<StockEditInput, unknown>(
    "/v1/retail/inventory/adjustments",
    "POST",
    ["/v1/retail/inventory", "/v1/retail/products"]
  );

  const handleSubmit = async (data: StockEditInput) => {
    await mutation.mutateAsync(data);
    toast({ title: "Stock adjusted", description: `Quantity updated for ${productName || data.productId}.` });
    onClose();
  };

  return (
    <ModuleModal
      schema={stockEditSchema}
      defaultValues={{ productId, quantity: 0, reason: "" }}
      onSubmit={handleSubmit}
      onCancel={onClose}
      title="Adjust Stock"
      description={productName ? `Adjust stock for "${productName}"` : "Record a stock adjustment."}
      isOpen={isOpen}
    >
      {(form) => (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="productId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Product</FormLabel>
                <FormControl><Input placeholder="Product ID" {...field} disabled={!!productId} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quantity Delta (+ or -)</FormLabel>
                <FormControl><Input type="number" placeholder="e.g. -5 or +10" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="reason"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reason</FormLabel>
                <FormControl><Textarea placeholder="Reason for adjustment (1-500 chars)" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </ModuleModal>
  );
}
