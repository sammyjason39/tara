/**
 * Close Shift Modal
 *
 * Allows an operator to close their shift with cash reconciliation.
 * Requirements: 8.1, 8.4, 16.1
 */

import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ModuleModal } from "@/components/shared/ModuleModal";
import { useModuleMutation } from "@/hooks/useModuleQuery";
import { closeShiftSchema, type CloseShiftInput } from "../schemas";
import { useToast } from "@/hooks/use-toast";

interface CloseShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  shiftId: string;
}

export function CloseShiftModal({ isOpen, onClose, shiftId }: CloseShiftModalProps) {
  const { toast } = useToast();

  const mutation = useModuleMutation<CloseShiftInput, unknown>(
    `/v1/retail/shifts/${shiftId}/close`,
    "POST",
    ["/v1/retail/shifts"]
  );

  const handleSubmit = async (data: CloseShiftInput) => {
    await mutation.mutateAsync(data);
    toast({ title: "Shift closed", description: "Shift closed and cash reconciled." });
    onClose();
  };

  return (
    <ModuleModal
      schema={closeShiftSchema}
      defaultValues={{ closingCash: 0, countedCash: undefined, variance: undefined, notes: "", closingNote: "" }}
      onSubmit={handleSubmit}
      onCancel={onClose}
      title="Close Shift"
      description="Declare closing cash and close the current shift."
      isOpen={isOpen}
    >
      {(form) => (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="closingCash"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Closing Cash Amount</FormLabel>
                <FormControl><Input type="number" min={0} step="0.01" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="countedCash"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Counted Cash (optional)</FormLabel>
                <FormControl><Input type="number" min={0} step="0.01" {...field} /></FormControl>
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
                <FormControl><Textarea placeholder="End-of-shift notes..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </ModuleModal>
  );
}
