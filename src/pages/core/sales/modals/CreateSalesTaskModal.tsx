import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ModuleModal } from "@/components/shared/ModuleModal";
import { useModuleMutation } from "@/hooks/useModuleQuery";
import { createSalesTaskSchema, type CreateSalesTaskInput } from "../schemas";
import { useToast } from "@/hooks/use-toast";

interface CreateSalesTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultOpportunityId?: string;
  defaultLeadId?: string;
}

export function CreateSalesTaskModal({
  isOpen,
  onClose,
  defaultOpportunityId,
  defaultLeadId,
}: CreateSalesTaskModalProps) {
  const { toast } = useToast();

  const mutation = useModuleMutation<CreateSalesTaskInput, unknown>(
    "/v1/sales/tasks",
    "POST",
    ["/v1/sales/tasks", "/v1/sales/dashboard"]
  );

  const handleSubmit = async (data: CreateSalesTaskInput) => {
    await mutation.mutateAsync(data);
    toast({ title: "Task created", description: `Task "${data.title}" created.` });
    onClose();
  };

  return (
    <ModuleModal
      schema={createSalesTaskSchema}
      defaultValues={{
        opportunityId: defaultOpportunityId || "",
        leadId: defaultLeadId || "",
        title: "",
        description: "",
        dueDate: "",
        priority: "MEDIUM",
      }}
      onSubmit={handleSubmit}
      onCancel={onClose}
      title="Create Sales Task"
      description="Create a follow-up task linked to a lead or opportunity."
      isOpen={isOpen}
    >
      {(form) => (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl><Input placeholder="Follow up with prospect..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description (optional)</FormLabel>
                <FormControl>
                  <Textarea placeholder="Task details..." className="min-h-[60px]" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Due Date</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
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
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select priority" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
      )}
    </ModuleModal>
  );
}
