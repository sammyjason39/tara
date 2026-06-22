import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ModuleModal } from "@/components/shared/ModuleModal";
import { useModuleMutation } from "@/hooks/useModuleQuery";
import { createWorkflowSchema, type CreateWorkflowInput } from "../schemas";
import { toast } from "sonner";

interface CreateWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateWorkflowModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateWorkflowModalProps) {
  const mutation = useModuleMutation<CreateWorkflowInput, unknown>(
    "/v1/marketing/workflows",
    "POST",
    ["/v1/marketing/workflows"]
  );

  const handleSubmit = async (data: CreateWorkflowInput) => {
    try {
      await mutation.mutateAsync(data);
      toast.success("Workflow created", {
        description: `"${data.name}" automation rule is ready.`,
      });
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error("Failed to create workflow", {
        description: err?.message || "An error occurred. Please try again.",
      });
      throw err;
    }
  };

  return (
    <ModuleModal
      schema={createWorkflowSchema}
      defaultValues={{
        name: "",
        trigger: "NEW_LEAD",
        steps: [{ channel: "EMAIL", waitHours: 24, messageTemplate: "" }],
      }}
      onSubmit={handleSubmit}
      onCancel={onClose}
      title="Create Nurture Workflow"
      isOpen={isOpen}
      description="Define an event-driven automation rule for lead nurturing."
    >
      {(form) => (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Workflow Name *</FormLabel>
                <FormControl><Input placeholder="e.g. Welcome Drip Sequence" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="trigger"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Trigger Event *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Select trigger" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="NEW_LEAD">New Lead Captured</SelectItem>
                    <SelectItem value="SCORE_BELOW_THRESHOLD">Score Below Threshold</SelectItem>
                    <SelectItem value="REENGAGEMENT">Re-engagement</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="border rounded-lg p-4 space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Initial Step</p>
            <FormField
              control={form.control}
              name="steps.0.channel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Channel *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="EMAIL">Email</SelectItem>
                      <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                      <SelectItem value="RETARGETING">Retargeting</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="steps.0.waitHours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Wait Hours</FormLabel>
                  <FormControl><Input type="number" min={0} placeholder="24" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="steps.0.messageTemplate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message Template *</FormLabel>
                  <FormControl><Input placeholder="e.g. Welcome to our platform!" {...field} /></FormControl>
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
