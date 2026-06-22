import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ModuleModal } from "@/components/shared/ModuleModal";
import { useModuleMutation } from "@/hooks/useModuleQuery";
import { createFunnelSchema, type CreateFunnelInput } from "../schemas";
import { toast } from "sonner";

interface CreateFunnelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateFunnelModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateFunnelModalProps) {
  const mutation = useModuleMutation<CreateFunnelInput & { steps: any[] }, unknown>(
    "/v1/marketing/funnels",
    "POST",
    ["/v1/marketing/funnels"]
  );

  const handleSubmit = async (data: CreateFunnelInput) => {
    try {
      await mutation.mutateAsync({
        ...data,
        steps: [{ id: `step-${Date.now()}`, name: "Landing Page", type: "landing", conversionRate: 100, order: 1 }],
      });
      toast.success("Funnel created", {
        description: `"${data.name}" pathway is ready for orchestration.`,
      });
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error("Failed to create funnel", {
        description: err?.message || "An error occurred. Please try again.",
      });
      throw err;
    }
  };

  return (
    <ModuleModal
      schema={createFunnelSchema}
      defaultValues={{
        name: "",
        status: "draft",
      }}
      onSubmit={handleSubmit}
      onCancel={onClose}
      title="Create Funnel"
      isOpen={isOpen}
      description="Initialize a new conversion funnel pathway."
    >
      {(form) => (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Funnel Name *</FormLabel>
                <FormControl><Input placeholder="e.g. Product Launch Funnel" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
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
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
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
