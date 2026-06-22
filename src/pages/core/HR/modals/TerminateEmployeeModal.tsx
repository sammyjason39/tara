import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ModuleModal } from "@/components/shared/ModuleModal";
import { useModuleMutation } from "@/hooks/useModuleQuery";
import { terminateEmployeeSchema, type TerminateEmployeeInput } from "../schemas";
import { useToast } from "@/hooks/use-toast";

interface TerminateEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  onSuccess?: () => void;
}

export function TerminateEmployeeModal({
  isOpen,
  onClose,
  employeeId,
  onSuccess,
}: TerminateEmployeeModalProps) {
  const { toast } = useToast();
  const mutation = useModuleMutation<TerminateEmployeeInput, unknown>(
    `/v1/hr/employees/${employeeId}/terminate`,
    "POST",
    ["/v1/hr/employees"]
  );

  const handleSubmit = async (data: TerminateEmployeeInput) => {
    await mutation.mutateAsync(data);
    toast({ title: "Termination processed", description: "Employment has been terminated." });
    onSuccess?.();
    onClose();
  };

  return (
    <ModuleModal
      schema={terminateEmployeeSchema}
      defaultValues={{
        employeeId,
        reason: "",
        effectiveDate: new Date().toISOString().slice(0, 10),
        finalSettlement: 0,
      }}
      onSubmit={handleSubmit}
      onCancel={onClose}
      title="Terminate Employee"
      isOpen={isOpen}
      description="Process employee termination with final settlement."
    >
      {(form) => (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="effectiveDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Effective Date *</FormLabel>
                <FormControl><Input type="date" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="finalSettlement"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Final Settlement Amount</FormLabel>
                <FormControl><Input type="number" placeholder="0" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="reason"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reason *</FormLabel>
                <FormControl><Textarea placeholder="Reason for termination" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </ModuleModal>
  );
}
