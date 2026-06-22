/**
 * Register E-commerce Branch Modal
 *
 * Create an e-commerce virtual branch in the retail hierarchy.
 * Requirements: 8.1, 8.6, 16.1
 */

import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ModuleModal } from "@/components/shared/ModuleModal";
import { useModuleMutation } from "@/hooks/useModuleQuery";
import { registerEcommerceBranchSchema, type RegisterEcommerceBranchInput } from "../schemas";
import { useToast } from "@/hooks/use-toast";

interface RegisterEcommerceBranchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RegisterEcommerceBranchModal({ isOpen, onClose }: RegisterEcommerceBranchModalProps) {
  const { toast } = useToast();

  const mutation = useModuleMutation<RegisterEcommerceBranchInput, unknown>(
    "/v1/retail/stores/ecommerce",
    "POST",
    ["/v1/retail/stores"]
  );

  const handleSubmit = async (data: RegisterEcommerceBranchInput) => {
    await mutation.mutateAsync(data);
    toast({ title: "E-commerce branch registered", description: `"${data.name}" is now active.` });
    onClose();
  };

  return (
    <ModuleModal
      schema={registerEcommerceBranchSchema}
      defaultValues={{
        name: "",
        code: "",
        locationId: "",
        platform: undefined,
        domain: "",
        inventoryPoolId: "",
        managerId: "",
        channelName: "",
        channelType: "",
        syncFrequency: "hourly",
      }}
      onSubmit={handleSubmit}
      onCancel={onClose}
      title="Register E-commerce Branch"
      description="Add a new e-commerce presence to the store hierarchy."
      isOpen={isOpen}
    >
      {(form) => (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Store Name</FormLabel>
                <FormControl><Input placeholder="Official Tokopedia Store" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="platform"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Platform</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select platform" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {["shopify", "woocommerce", "tokopedia", "shopee", "lazada", "tiktok", "custom"].map((p) => (
                        <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="locationId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location ID</FormLabel>
                  <FormControl><Input placeholder="Location" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="domain"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Domain (optional)</FormLabel>
                <FormControl><Input placeholder="shop.example.com" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="syncFrequency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sync Frequency</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="realtime">Real-time</SelectItem>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
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
