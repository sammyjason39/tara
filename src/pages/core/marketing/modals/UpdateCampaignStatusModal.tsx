import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ModuleModal } from "@/components/shared/ModuleModal";
import { useModuleMutation } from "@/hooks/useModuleQuery";
import { updateCampaignStatusSchema, type UpdateCampaignStatusInput } from "../schemas";
import { toast } from "sonner";

interface UpdateCampaignStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId: string;
  campaignName: string;
  currentStatus: string;
  onSuccess?: () => void;
}

export function UpdateCampaignStatusModal({
  isOpen,
  onClose,
  campaignId,
  campaignName,
  currentStatus,
  onSuccess,
}: UpdateCampaignStatusModalProps) {
  const mutation = useModuleMutation<UpdateCampaignStatusInput, unknown>(
    `/v1/marketing/campaigns/${campaignId}/status`,
    "PUT",
    ["/v1/marketing/campaigns"]
  );

  const handleSubmit = async (data: UpdateCampaignStatusInput) => {
    try {
      await mutation.mutateAsync(data);
      toast.success("Status updated", {
        description: `"${campaignName}" is now ${data.status}.`,
      });
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error("Failed to update status", {
        description: err?.message || "An error occurred. Please try again.",
      });
      throw err;
    }
  };

  return (
    <ModuleModal
      schema={updateCampaignStatusSchema}
      defaultValues={{
        status: currentStatus as any || "DRAFT",
      }}
      onSubmit={handleSubmit}
      onCancel={onClose}
      title="Update Campaign Status"
      isOpen={isOpen}
      description={`Change the status of "${campaignName}".`}
    >
      {(form) => (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New Status *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="PAUSED">Paused</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
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
