import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ModuleModal } from "@/components/shared/ModuleModal";
import { useModuleMutation } from "@/hooks/useModuleQuery";
import { createWorkflowRequestSchema, type CreateWorkflowRequestInput } from "../schemas";
import { useToast } from "@/hooks/use-toast";

interface CreateWorkflowRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultEntityId?: string;
  departments?: { id: string; name: string }[];
  onSuccess?: () => void;
}

export function CreateWorkflowRequestModal({
  isOpen,
  onClose,
  defaultEntityId = "",
  departments = [],
  onSuccess,
}: CreateWorkflowRequestModalProps) {
  const { toast } = useToast();
  const mutation = useModuleMutation<CreateWorkflowRequestInput, unknown>(
    "/v1/hr/workflows",
    "POST",
    ["/v1/hr/workflows"]
  );

  const handleSubmit = async (data: CreateWorkflowRequestInput) => {
    await mutation.mutateAsync(data);
    toast({ title: "Workflow request created", description: "Request has been submitted to FlowGate." });
    onSuccess?.();
    onClose();
  };

  return (
    <ModuleModal
      schema={createWorkflowRequestSchema}
      defaultValues={{
        entityType: "PERFORMANCE",
        entityId: defaultEntityId,
        destinationDept: "",
        notes: "",
      }}
      onSubmit={handleSubmit}
      onCancel={onClose}
      title="Create Workflow Request"
      isOpen={isOpen}
      description="Initiate a new workflow request through FlowGate."
    >
      {(form) => (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="entityType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Workflow Type *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="PERFORMANCE">Performance</SelectItem>
                    <SelectItem value="PAYROLL">Payroll</SelectItem>
                    <SelectItem value="CONTRACT">Contract</SelectItem>
                    <SelectItem value="TRAINING">Training</SelectItem>
                    <SelectItem value="PERSONNEL_ESCALATION">Personnel Escalation</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="entityId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Entity ID *</FormLabel>
                <FormControl><Input placeholder="Entity identifier" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="destinationDept"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Destination Department *</FormLabel>
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
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl><Textarea placeholder="Additional notes" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </ModuleModal>
  );
}
