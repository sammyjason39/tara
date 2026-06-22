import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ModuleModal } from "@/components/shared/ModuleModal";
import { useModuleMutation } from "@/hooks/useModuleQuery";
import { createDepartmentSchema, type CreateDepartmentInput } from "../schemas";
import { useToast } from "@/hooks/use-toast";

interface CreateDepartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  departments?: { id: string; name: string }[];
  employees?: { id: string; fullName: string }[];
  onSuccess?: () => void;
}

export function CreateDepartmentModal({
  isOpen,
  onClose,
  departments = [],
  employees = [],
  onSuccess,
}: CreateDepartmentModalProps) {
  const { toast } = useToast();
  const mutation = useModuleMutation<CreateDepartmentInput, unknown>(
    "/v1/hr/departments",
    "POST",
    ["/v1/hr/departments"]
  );

  const handleSubmit = async (data: CreateDepartmentInput) => {
    await mutation.mutateAsync(data);
    toast({ title: "Department created", description: `${data.name} has been added.` });
    onSuccess?.();
    onClose();
  };

  return (
    <ModuleModal
      schema={createDepartmentSchema}
      defaultValues={{
        name: "",
        code: "",
        description: "",
        parentId: "",
        headId: "",
        status: "active",
      }}
      onSubmit={handleSubmit}
      onCancel={onClose}
      title="Create Department"
      isOpen={isOpen}
      description="Add a new department to the organizational structure."
    >
      {(form) => (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Department Name *</FormLabel>
                <FormControl><Input placeholder="e.g. Engineering" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Code *</FormLabel>
                <FormControl><Input placeholder="e.g. ENG" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl><Textarea placeholder="Department description" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="parentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Parent Department</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
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
              name="headId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Department Head</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>{emp.fullName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
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
