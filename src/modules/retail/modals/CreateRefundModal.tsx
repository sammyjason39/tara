/**
 * Create Refund Modal
 *
 * Process a return/refund for a POS transaction.
 * Requirements: 8.1, 16.1
 */

import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ModuleModal } from "@/components/shared/ModuleModal";
import { useModuleMutation } from "@/hooks/useModuleQuery";
import { createRefundSchema, type CreateRefundInput } from "../schemas";
import { useToast } from "@/hooks/use-toast";

interface CreateRefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionId?: string;
}

export function CreateRefundModal({ isOpen, onClose, transactionId = "" }: CreateRefundModalProps) {
  const { toast } = useToast();

  const mutation = useModuleMutation<CreateRefundInput, unknown>(
    "/v1/retail/refunds",
    "POST",
    ["/v1/retail/refunds", "/v1/retail/pos/transactions"]
  );

  const handleSubmit = async (data: CreateRefundInput) => {
    await mutation.mutateAsync(data);
    toast({ title: "Refund processed", description: "Refund has been recorded." });
    onClose();
  };

  return (
    <ModuleModal
      schema={createRefundSchema}
      defaultValues={{
        transactionId,
        reason: "",
        items: [{ itemId: "", quantity: 1 }],
        refundMethod: "original_payment",
      }}
      onSubmit={handleSubmit}
      onCancel={onClose}
      title="Process Refund"
      description="Record a return and issue refund."
      isOpen={isOpen}
    >
      {(form) => (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="transactionId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Transaction Reference</FormLabel>
                <FormControl><Input placeholder="Original transaction ID" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="reason"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reason for Refund</FormLabel>
                <FormControl><Textarea placeholder="Describe the reason..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="refundMethod"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Refund Method</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="original_payment">Original Payment Method</SelectItem>
                    <SelectItem value="store_credit">Store Credit</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </ModuleModal>
  );
}
