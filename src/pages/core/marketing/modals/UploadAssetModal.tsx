import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ModuleModal } from "@/components/shared/ModuleModal";
import { useModuleMutation } from "@/hooks/useModuleQuery";
import { uploadAssetSchema, type UploadAssetInput } from "../schemas";
import { toast } from "sonner";

interface UploadAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function UploadAssetModal({
  isOpen,
  onClose,
  onSuccess,
}: UploadAssetModalProps) {
  const mutation = useModuleMutation<UploadAssetInput, unknown>(
    "/v1/marketing/assets",
    "POST",
    ["/v1/marketing/assets"]
  );

  const handleSubmit = async (data: UploadAssetInput) => {
    try {
      await mutation.mutateAsync(data);
      toast.success("Asset uploaded", {
        description: `"${data.name}" has been added to the creative library.`,
      });
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error("Failed to upload asset", {
        description: err?.message || "An error occurred. Please try again.",
      });
      throw err;
    }
  };

  return (
    <ModuleModal
      schema={uploadAssetSchema}
      defaultValues={{
        name: "",
        type: "IMAGE",
        description: "",
        tags: "",
      }}
      onSubmit={handleSubmit}
      onCancel={onClose}
      title="Upload Asset"
      isOpen={isOpen}
      description="Add a new creative asset to the marketing library."
    >
      {(form) => (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Asset Name *</FormLabel>
                <FormControl><Input placeholder="e.g. Hero Banner Q4" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="IMAGE">Image</SelectItem>
                    <SelectItem value="VIDEO">Video</SelectItem>
                    <SelectItem value="DOCUMENT">Document</SelectItem>
                    <SelectItem value="TEMPLATE">Template</SelectItem>
                  </SelectContent>
                </Select>
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
                <FormControl><Textarea placeholder="Brief description..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="tags"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tags</FormLabel>
                <FormControl><Input placeholder="hero, banner, q4, enterprise" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </ModuleModal>
  );
}
