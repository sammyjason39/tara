/**
 * Create Channel Modal
 *
 * Manages sales channel creation (physical/online marketplace).
 * Requirements: 8.1, 8.6, 16.1
 */

import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ModuleModal } from "@/components/shared/ModuleModal";
import { useModuleMutation } from "@/hooks/useModuleQuery";
import { createChannelSchema, type CreateChannelInput, CHANNEL_TYPES } from "../schemas";
import { useToast } from "@/hooks/use-toast";

interface CreateChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateChannelModal({ isOpen, onClose }: CreateChannelModalProps) {
  const { toast } = useToast();

  const mutation = useModuleMutation<CreateChannelInput, unknown>(
    "/v1/retail/channels",
    "POST",
    ["/v1/retail/channels"]
  );

  const handleSubmit = async (data: CreateChannelInput) => {
    await mutation.mutateAsync(data);
    toast({ title: "Channel created", description: `Channel "${data.name}" registered.` });
    onClose();
  };

  return (
    <ModuleModal
      schema={createChannelSchema}
      defaultValues={{
        name: "",
        type: "DIRECT",
        status: "active",
        syncFrequency: "hourly",
        connector: "",
        gatewayUrl: "",
        clientId: "",
        clientSecret: "",
      }}
      onSubmit={handleSubmit}
      onCancel={onClose}
      title="Create Sales Channel"
      description="Register a new sales channel for the store."
      isOpen={isOpen}
    >
      {(form) => (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Channel Name</FormLabel>
                <FormControl><Input placeholder="e.g. Tokopedia Official Store" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CHANNEL_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                      <SelectItem value="manual">Manual</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="connector"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Connector (optional)</FormLabel>
                <FormControl><Input placeholder="Connector type" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="gatewayUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Gateway URL (optional)</FormLabel>
                <FormControl><Input placeholder="https://api.example.com/..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </ModuleModal>
  );
}
