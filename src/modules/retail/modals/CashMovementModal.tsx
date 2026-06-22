/**
 * Cash Movement Modal
 *
 * Record cash deposits, withdrawals, or petty cash.
 * Requirements: 8.1, 16.1
 */

import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ModuleModal } from "@/components/shared/ModuleModal";
import { useModuleMutation } from "@/hooks/useModuleQuery";
import { cashMovementSchema, type CashMovementInput } from "../schemas";
import { useToast } from "@/hooks/use-toast";

interface CashMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  shiftId?: string;
}

export function CashMovementModal({ isOpen, onClose, shiftId = "" }: CashMovementModalProps) {
  const { toast } = useToast();

  const mutation = useModuleMutation<CashMovementInput, unknown>(
    "/v1/retail/cash-movements",
    "POST",
    ["/v1/retail/cash-movements", "/v1/retail/shifts"]
  );

  const handleSubmit = async (data: CashMovementInput) => {
    await mutation.mutateAsync(data);
    toast({ title: "Cash movement recorded", description: `${data.type} of ${data.amount} logged.` });
    onClose();
  };

  return (
    <ModuleModal
      schema={cashMovementSchema}
      defaultValues={{ type: "deposit", amount: 0, reason: "", shiftId }}
      onSubmit={handleSubmit}
      onCancel={onClose}
      title="Record Cash Movement"
      description="Log a cash deposit, withdrawal, or petty cash."
      isOpen={isOpen}
    >
      {(form) => (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Movement Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="deposit">Deposit</SelectItem>
                    <SelectItem value="withdrawal">Withdrawal</SelectItem>
                    <SelectItem value="petty_cash">Petty Cash</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount</FormLabel>
                <FormControl><Input type="number" min={0} step="0.01" {...field} /></FormControl>
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
                <FormControl><Textarea placeholder="Reason for movement" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </ModuleModal>
  );
}
