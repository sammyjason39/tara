/**
 * Manage Connector Modal
 *
 * Configure a channel connector (API gateway, sync settings).
 * Requirements: 8.1, 8.6, 16.1
 */

import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ModuleModal } from "@/components/shared/ModuleModal";
import { useModuleMutation } from "@/hooks/useModuleQuery";
import { manageConnectorSchema, type ManageConnectorInput } from "../schemas";
import { useToast } from "@/hooks/use-toast";

interface ManageConnectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  channelId?: string;
}

export function ManageConnectorModal({ isOpen, onClose, channelId = "" }: ManageConnectorModalProps) {
  const { toast } = useToast();

  const mutation = useModuleMutation<ManageConnectorInput, unknown>(
    "/v1/retail/channels/connector",
    "PUT",
    ["/v1/retail/channels"]
  );

  const handleSubmit = async (data: ManageConnectorInput) => {
    await mutation.mutateAsync(data);
    toast({ title: "Connector configured", description: "Channel connector settings updated." });
    onClose();
  };

  return (
    <ModuleModal
      schema={manageConnectorSchema}
      defaultValues={{
        channelId,
        connector: "",
        gatewayUrl: "",
        clientId: "",
        clientSecret: "",
        syncFrequency: "hourly",
      }}
      onSubmit={handleSubmit}
      onCancel={onClose}
      title="Manage Connector"
      description="Configure channel API connector and sync settings."
      isOpen={isOpen}
    >
      {(form) => (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="connector"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Connector Type</FormLabel>
                <FormControl><Input placeholder="e.g. shopify_v2, tokopedia_api" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="gatewayUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Gateway URL</FormLabel>
                <FormControl><Input placeholder="https://api.marketplace.com/v1" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="clientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client ID</FormLabel>
                  <FormControl><Input placeholder="API client ID" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="clientSecret"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client Secret</FormLabel>
                  <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
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
                    <SelectItem value="manual">Manual</SelectItem>
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
