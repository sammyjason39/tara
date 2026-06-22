import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ModuleModal } from "@/components/shared/ModuleModal";
import { useModuleMutation } from "@/hooks/useModuleQuery";
import { hardwareRequestSchema, type HardwareRequestInput } from "../schemas";
import { useToast } from "@/hooks/use-toast";

interface HardwareRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  catalogItemId: string;
  itemName: string;
  defaultLocationId?: string;
  onSuccess?: () => void;
}

export function HardwareRequestModal({
  isOpen,
  onClose,
  catalogItemId,
  itemName,
  defaultLocationId = "MAIN_WH",
  onSuccess,
}: HardwareRequestModalProps) {
  const { toast } = useToast();

  const mutation = useModuleMutation<HardwareRequestInput, unknown>(
    "/v1/it-settings/provisioning/requests",
    "POST",
    ["/v1/it-settings/provisioning/requests"]
  );

  const handleSubmit = async (data: HardwareRequestInput) => {
    await mutation.mutateAsync(data);
    toast({
      title: "Hardware request submitted",
      description: `Request for "${itemName}" has been submitted for processing.`,
    });
    onSuccess?.();
    onClose();
  };

  return (
    <ModuleModal
      schema={hardwareRequestSchema}
      defaultValues={{
        catalogItemId,
        notes: "",
        locationId: defaultLocationId,
      }}
      onSubmit={handleSubmit}
      onCancel={onClose}
      title="Confirm Hardware Request"
      isOpen={isOpen}
      description={`Requesting "${itemName}" for branch orchestration. This will trigger inventory check and potential procurement.`}
    >
      {(form) => (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="catalogItemId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Catalog Item</FormLabel>
                <FormControl>
                  <Input {...field} disabled className="bg-muted" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="locationId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Target Location *</FormLabel>
                <FormControl>
                  <Input placeholder="Warehouse or location ID" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Request Notes</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Add specific deployment instructions or notes..."
                    className="min-h-[100px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </ModuleModal>
  );
}
