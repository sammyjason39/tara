/**
 * CourierDispatchDialog — functional replacement for the FutureIntegrationDialog stub.
 *
 * Allows users to dispatch a transfer via courier by entering tracking details.
 * Uses Zod validation and TanStack Query mutation.
 * Requirements: 7.1, 16.1
 */

import { ModuleModal } from "@/components/shared/ModuleModal";
import { courierDispatchSchema, type CourierDispatchInput } from "../schemas";
import { useShipTransfer } from "../hooks/useInventoryQueries";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";

interface CourierDispatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transferId?: string;
  onSuccess?: () => void;
}

export function CourierDispatchDialog({
  open,
  onOpenChange,
  transferId = "",
  onSuccess,
}: CourierDispatchDialogProps) {
  const shipMutation = useShipTransfer();

  const handleSubmit = async (data: CourierDispatchInput) => {
    await shipMutation.mutateAsync({
      transferId: data.transfer_id,
      trackingNumber: data.tracking_number || data.courier_name,
    });
    onSuccess?.();
    onOpenChange(false);
  };

  return (
    <ModuleModal
      schema={courierDispatchSchema}
      defaultValues={{
        transfer_id: transferId,
        courier_name: "",
        tracking_number: "",
        estimated_arrival: "",
        notes: "",
      }}
      onSubmit={handleSubmit}
      onCancel={() => onOpenChange(false)}
      title="Courier Dispatch"
      description="Enter courier and tracking details to dispatch this transfer."
      isOpen={open}
    >
      {(form) => (
        <>
          <FormField
            control={form.control}
            name="transfer_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Transfer ID</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Transfer reference" disabled={!!transferId} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="courier_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Courier Name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="e.g. JNE, FedEx, DHL" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="tracking_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tracking Number</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="e.g. JNE123456789" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="estimated_arrival"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estimated Arrival</FormLabel>
                <FormControl>
                  <Input {...field} type="date" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea {...field} placeholder="Additional dispatch notes..." rows={3} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </>
      )}
    </ModuleModal>
  );
}

export default CourierDispatchDialog;
