import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ModuleModal } from "@/components/shared/ModuleModal";
import { useModuleMutation } from "@/hooks/useModuleQuery";
import { assignTrainingSchema, type AssignTrainingInput } from "../schemas";
import { useToast } from "@/hooks/use-toast";

interface AssignTrainingModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees?: { id: string; fullName: string }[];
  programs?: { id: string; name: string }[];
  defaultEmployeeId?: string;
  onSuccess?: () => void;
}

export function AssignTrainingModal({
  isOpen,
  onClose,
  employees = [],
  programs = [],
  defaultEmployeeId = "",
  onSuccess,
}: AssignTrainingModalProps) {
  const { toast } = useToast();
  const mutation = useModuleMutation<AssignTrainingInput, unknown>(
    "/v1/hr/training/assignments",
    "POST",
    ["/v1/hr/training/assignments"]
  );

  const handleSubmit = async (data: AssignTrainingInput) => {
    await mutation.mutateAsync(data);
    toast({ title: "Training assigned", description: "Training program has been assigned." });
    onSuccess?.();
    onClose();
  };

  return (
    <ModuleModal
      schema={assignTrainingSchema}
      defaultValues={{
        employeeId: defaultEmployeeId,
        programId: "",
        notes: "",
      }}
      onSubmit={handleSubmit}
      onCancel={onClose}
      title="Assign Training"
      isOpen={isOpen}
      description="Assign a training program to an employee."
    >
      {(form) => (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="employeeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Employee *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>{emp.fullName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="programId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Training Program *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Select program" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {programs.map((prog) => (
                      <SelectItem key={prog.id} value={prog.id}>{prog.name}</SelectItem>
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
                <FormLabel>Notes</FormLabel>
                <FormControl><Textarea placeholder="Optional notes" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </ModuleModal>
  );
}
