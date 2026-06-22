import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ModuleModal } from "@/components/shared/ModuleModal";
import { useModuleMutation } from "@/hooks/useModuleQuery";
import { promoteEmployeeSchema, type PromoteEmployeeInput } from "../schemas";
import { useToast } from "@/hooks/use-toast";

interface PromoteEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  currentRole?: string;
  currentSalary?: number;
  onSuccess?: () => void;
}

export function PromoteEmployeeModal({
  isOpen,
  onClose,
  employeeId,
  currentRole = "",
  currentSalary = 0,
  onSuccess,
}: PromoteEmployeeModalProps) {
  const { toast } = useToast();
  const mutation = useModuleMutation<PromoteEmployeeInput, unknown>(
    `/v1/hr/employees/${employeeId}/promote`,
    "POST",
    ["/v1/hr/employees"]
  );

  const handleSubmit = async (data: PromoteEmployeeInput) => {
    await mutation.mutateAsync(data);
    toast({ title: "Promotion processed", description: `Employee promoted to ${data.newRole}.` });
    onSuccess?.();
    onClose();
  };

  return (
    <ModuleModal
      schema={promoteEmployeeSchema}
      defaultValues={{
        employeeId,
        newRole: currentRole,
        newSalary: currentSalary,
        reason: "",
        effectiveDate: new Date().toISOString().slice(0, 10),
      }}
      onSubmit={handleSubmit}
      onCancel={onClose}
      title="Promote Employee"
      isOpen={isOpen}
      description="Promote an employee to a new role with updated compensation."
    >
      {(form) => (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="newRole"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New Role *</FormLabel>
                <FormControl><Input placeholder="New role title" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="newSalary"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New Salary *</FormLabel>
                <FormControl><Input type="number" placeholder="0" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
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
            name="reason"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reason *</FormLabel>
                <FormControl><Textarea placeholder="Reason for promotion" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </ModuleModal>
  );
}
