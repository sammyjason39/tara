import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ModuleModal } from "@/components/shared/ModuleModal";
import { useModuleMutation } from "@/hooks/useModuleQuery";
import { suspendEmployeeSchema, type SuspendEmployeeInput } from "../schemas";
import { useToast } from "@/hooks/use-toast";

interface SuspendEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  onSuccess?: () => void;
}

export function SuspendEmployeeModal({
  isOpen,
  onClose,
  employeeId,
  onSuccess,
}: SuspendEmployeeModalProps) {
  const { toast } = useToast();
  const mutation = useModuleMutation<SuspendEmployeeInput, unknown>(
    `/v1/hr/employees/${employeeId}/suspend`,
    "POST",
    ["/v1/hr/employees"]
  );

  const handleSubmit = async (data: SuspendEmployeeInput) => {
    await mutation.mutateAsync(data);
    toast({ title: "Suspension processed", description: "Employee has been suspended." });
    onSuccess?.();
    onClose();
  };

  return (
    <ModuleModal
      schema={suspendEmployeeSchema}
      defaultValues={{
        employeeId,
        reason: "",
        startDate: new Date().toISOString().slice(0, 10),
        endDate: "",
      }}
      onSubmit={handleSubmit}
      onCancel={onClose}
      title="Suspend Employee"
      isOpen={isOpen}
      description="Place an employee under temporary suspension."
    >
      {(form) => (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Date *</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End Date</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="reason"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reason *</FormLabel>
                <FormControl><Textarea placeholder="Reason for suspension" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </ModuleModal>
  );
}
