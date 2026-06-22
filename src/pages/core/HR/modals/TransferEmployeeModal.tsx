import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ModuleModal } from "@/components/shared/ModuleModal";
import { useModuleMutation } from "@/hooks/useModuleQuery";
import { transferEmployeeSchema, type TransferEmployeeInput } from "../schemas";
import { useToast } from "@/hooks/use-toast";

interface TransferEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  departments: { id: string; name: string }[];
  locations?: { id: string; name: string }[];
  onSuccess?: () => void;
}

export function TransferEmployeeModal({
  isOpen,
  onClose,
  employeeId,
  departments,
  locations = [],
  onSuccess,
}: TransferEmployeeModalProps) {
  const { toast } = useToast();
  const mutation = useModuleMutation<TransferEmployeeInput, unknown>(
    `/v1/hr/employees/${employeeId}/transfer`,
    "POST",
    ["/v1/hr/employees"]
  );

  const handleSubmit = async (data: TransferEmployeeInput) => {
    await mutation.mutateAsync(data);
    toast({ title: "Transfer initiated", description: "Employee transfer has been processed." });
    onSuccess?.();
    onClose();
  };

  return (
    <ModuleModal
      schema={transferEmployeeSchema}
      defaultValues={{
        employeeId,
        targetDepartment: "",
        targetLocation: "",
        reason: "",
        effectiveDate: new Date().toISOString().slice(0, 10),
      }}
      onSubmit={handleSubmit}
      onCancel={onClose}
      title="Transfer Employee"
      isOpen={isOpen}
      description="Transfer an employee to a different department or location."
    >
      {(form) => (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="targetDepartment"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Target Department *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="targetLocation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Target Location</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="">No change</SelectItem>
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                <FormControl><Textarea placeholder="Reason for transfer" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </ModuleModal>
  );
}
