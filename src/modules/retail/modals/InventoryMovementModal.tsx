/**
 * Inventory Movement Modal
 *
 * Record stock transfers between locations.
 * Requirements: 8.1, 16.1
 */

import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ModuleModal } from "@/components/shared/ModuleModal";
import { useModuleMutation } from "@/hooks/useModuleQuery";
import { inventoryMovementSchema, type InventoryMovementInput } from "../schemas";
import { useToast } from "@/hooks/use-toast";

interface InventoryMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InventoryMovementModal({ isOpen, onClose }: InventoryMovementModalProps) {
  const { toast } = useToast();

  const mutation = useModuleMutation<InventoryMovementInput, unknown>(
    "/v1/retail/inventory/movements",
    "POST",
    ["/v1/retail/inventory"]
  );

  const handleSubmit = async (data: InventoryMovementInput) => {
    await mutation.mutateAsync(data);
    toast({ title: "Movement recorded", description: "Stock transfer logged." });
    onClose();
  };

  return (
    <ModuleModal
      schema={inventoryMovementSchema}
      defaultValues={{ productId: "", fromLocationId: "", toLocationId: "", quantity: 1, reason: "" }}
      onSubmit={handleSubmit}
      onCancel={onClose}
      title="Record Stock Movement"
      description="Transfer stock between locations."
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
                <FormControl><Input placeholder="Product ID or SKU" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="fromLocationId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>From Location</FormLabel>
                  <FormControl><Input placeholder="Source" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="toLocationId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>To Location</FormLabel>
                  <FormControl><Input placeholder="Destination" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quantity</FormLabel>
                <FormControl><Input type="number" min={1} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="reason"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reason (optional)</FormLabel>
                <FormControl><Input placeholder="Transfer reason" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </ModuleModal>
  );
}
