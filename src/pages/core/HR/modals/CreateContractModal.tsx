import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ModuleModal } from "@/components/shared/ModuleModal";
import { useModuleMutation } from "@/hooks/useModuleQuery";
import { createContractSchema, type CreateContractInput } from "../schemas";
import { useToast } from "@/hooks/use-toast";

interface CreateContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees?: { id: string; fullName: string }[];
  defaultEmployeeId?: string;
  onSuccess?: () => void;
}

export function CreateContractModal({
  isOpen,
  onClose,
  employees = [],
  defaultEmployeeId = "",
  onSuccess,
}: CreateContractModalProps) {
  const { toast } = useToast();
  const mutation = useModuleMutation<CreateContractInput, unknown>(
    "/v1/hr/contracts",
    "POST",
    ["/v1/hr/contracts"]
  );

  const handleSubmit = async (data: CreateContractInput) => {
    await mutation.mutateAsync(data);
    toast({ title: "Contract created", description: `Contract "${data.title}" has been created.` });
    onSuccess?.();
    onClose();
  };

  return (
    <ModuleModal
      schema={createContractSchema}
      defaultValues={{
        employeeId: defaultEmployeeId,
        title: "",
        type: "permanent",
        startDate: "",
        endDate: "",
        salary: 0,
        notes: "",
      }}
      onSubmit={handleSubmit}
      onCancel={onClose}
      title="Create Contract"
      isOpen={isOpen}
      description="Create a new employment contract for an employee."
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
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contract Title *</FormLabel>
                <FormControl><Input placeholder="e.g. Full-time Employment Agreement" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contract Type *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="permanent">Permanent</SelectItem>
                    <SelectItem value="fixed_term">Fixed Term</SelectItem>
                    <SelectItem value="probation">Probation</SelectItem>
                    <SelectItem value="freelance">Freelance</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
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
            name="salary"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Salary *</FormLabel>
                <FormControl><Input type="number" placeholder="0" {...field} /></FormControl>
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
                <FormControl><Textarea placeholder="Additional contract details" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </ModuleModal>
  );
}
