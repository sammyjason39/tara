import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ModuleModal } from "@/components/shared/ModuleModal";
import { useModuleMutation } from "@/hooks/useModuleQuery";
import { createRequisitionSchema, type CreateRequisitionInput } from "../schemas";
import { useToast } from "@/hooks/use-toast";

interface CreateRequisitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  departments?: { id: string; name: string }[];
  defaultDepartmentId?: string;
  onSuccess?: () => void;
}

export function CreateRequisitionModal({
  isOpen,
  onClose,
  departments = [],
  defaultDepartmentId = "",
  onSuccess,
}: CreateRequisitionModalProps) {
  const { toast } = useToast();
  const mutation = useModuleMutation<CreateRequisitionInput, unknown>(
    "/v1/hr/requisitions",
    "POST",
    ["/v1/hr/requisitions"]
  );

  const handleSubmit = async (data: CreateRequisitionInput) => {
    await mutation.mutateAsync(data);
    toast({ title: "Requisition opened", description: `Requisition for "${data.title}" has been created.` });
    onSuccess?.();
    onClose();
  };

  return (
    <ModuleModal
      schema={createRequisitionSchema}
      defaultValues={{
        title: "",
        departmentId: defaultDepartmentId,
        openings: 1,
        description: "",
        priority: "medium",
      }}
      onSubmit={handleSubmit}
      onCancel={onClose}
      title="Open Requisition"
      isOpen={isOpen}
      description="Create a new job requisition for a department."
    >
      {(form) => (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Position Title *</FormLabel>
                <FormControl><Input placeholder="e.g. Operations Analyst" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="departmentId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Department *</FormLabel>
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
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="openings"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Number of Openings *</FormLabel>
                  <FormControl><Input type="number" min={1} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl><Textarea placeholder="Job description and requirements" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </ModuleModal>
  );
}
