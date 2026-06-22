import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ModuleModal } from "@/components/shared/ModuleModal";
import { useModuleMutation } from "@/hooks/useModuleQuery";
import { createPayrollRunSchema, type CreatePayrollRunInput } from "../schemas";
import { useToast } from "@/hooks/use-toast";

interface CreatePayrollRunModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreatePayrollRunModal({
  isOpen,
  onClose,
  onSuccess,
}: CreatePayrollRunModalProps) {
  const { toast } = useToast();
  const mutation = useModuleMutation<CreatePayrollRunInput, unknown>(
    "/v1/hr/payroll/runs",
    "POST",
    ["/v1/hr/payroll/runs"]
  );

  const handleSubmit = async (data: CreatePayrollRunInput) => {
    await mutation.mutateAsync(data);
    toast({ title: "Payroll run created", description: `Payroll run for ${data.periodStart} to ${data.periodEnd} created.` });
    onSuccess?.();
    onClose();
  };

  return (
    <ModuleModal
      schema={createPayrollRunSchema}
      defaultValues={{
        periodStart: new Date().toISOString().slice(0, 10),
        periodEnd: "",
        notes: "",
      }}
      onSubmit={handleSubmit}
      onCancel={onClose}
      title="Create Payroll Run"
      isOpen={isOpen}
      description="Create a new payroll run for a specific period."
    >
      {(form) => (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="periodStart"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Period Start *</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="periodEnd"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Period End *</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl><Textarea placeholder="Optional notes for this payroll run" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </ModuleModal>
  );
}
