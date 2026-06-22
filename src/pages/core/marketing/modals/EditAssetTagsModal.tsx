import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ModuleModal } from "@/components/shared/ModuleModal";
import { useModuleMutation } from "@/hooks/useModuleQuery";
import { editAssetTagsSchema, type EditAssetTagsInput } from "../schemas";
import { toast } from "sonner";

interface EditAssetTagsModalProps {
  isOpen: boolean;
  onClose: () => void;
  assetId: string;
  assetName: string;
  currentTags?: string;
  onSuccess?: () => void;
}

export function EditAssetTagsModal({
  isOpen,
  onClose,
  assetId,
  assetName,
  currentTags = "",
  onSuccess,
}: EditAssetTagsModalProps) {
  const mutation = useModuleMutation<{ tags: string[] }, unknown>(
    `/v1/marketing/assets/${assetId}`,
    "PUT",
    ["/v1/marketing/assets"]
  );

  const handleSubmit = async (data: EditAssetTagsInput) => {
    try {
      await mutation.mutateAsync({
        tags: data.tags.split(",").map((t) => t.trim()).filter(Boolean),
      });
      toast.success("Tags updated", {
        description: `Tags for "${assetName}" have been updated.`,
      });
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error("Failed to update tags", {
        description: err?.message || "An error occurred. Please try again.",
      });
      throw err;
    }
  };

  return (
    <ModuleModal
      schema={editAssetTagsSchema}
      defaultValues={{ tags: currentTags }}
      onSubmit={handleSubmit}
      onCancel={onClose}
      title="Edit Asset Tags"
      isOpen={isOpen}
      description={`Update semantic tags for "${assetName}".`}
    >
      {(form) => (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="tags"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tags *</FormLabel>
                <FormControl>
                  <Input placeholder="hero, banner, q4, enterprise" {...field} />
                </FormControl>
                <FormMessage />
                <p className="text-xs text-muted-foreground">Separate tags with commas</p>
              </FormItem>
            )}
          />
        </div>
      )}
    </ModuleModal>
  );
}
