/**
 * Update Order Status Modal
 *
 * Change order fulfillment status.
 * Requirements: 8.1, 16.1
 */

import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ModuleModal } from "@/components/shared/ModuleModal";
import { useModuleMutation } from "@/hooks/useModuleQuery";
import { updateOrderStatusSchema, type UpdateOrderStatusInput, ORDER_STATUSES } from "../schemas";
import { useToast } from "@/hooks/use-toast";

interface UpdateOrderStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId?: string;
  currentStatus?: string;
}

export function UpdateOrderStatusModal({ isOpen, onClose, orderId = "", currentStatus }: UpdateOrderStatusModalProps) {
  const { toast } = useToast();

  const mutation = useModuleMutation<UpdateOrderStatusInput, unknown>(
    `/v1/retail/orders/${orderId}/status`,
    "PATCH",
    ["/v1/retail/orders"]
  );

  const handleSubmit = async (data: UpdateOrderStatusInput) => {
    await mutation.mutateAsync(data);
    toast({ title: "Order updated", description: `Order status changed to ${data.status}.` });
    onClose();
  };

  return (
    <ModuleModal
      schema={updateOrderStatusSchema}
      defaultValues={{ orderId, status: "processing", notes: "" }}
      onSubmit={handleSubmit}
      onCancel={onClose}
      title="Update Order Status"
      description={currentStatus ? `Current status: ${currentStatus}` : "Change the order fulfillment status."}
      isOpen={isOpen}
    >
      {(form) => (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="orderId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Order ID</FormLabel>
                <FormControl><Input {...field} disabled={!!orderId} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {ORDER_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes (optional)</FormLabel>
                <FormControl><Input placeholder="Reason for status change" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </ModuleModal>
  );
}
