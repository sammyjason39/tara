/**
 * Register CCTV Camera Modal
 *
 * Register a new surveillance camera for branch monitoring.
 * Requirements: 8.1, 16.1
 */

import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ModuleModal } from "@/components/shared/ModuleModal";
import { useModuleMutation } from "@/hooks/useModuleQuery";
import { registerCctvSchema, type RegisterCctvInput, CCTV_PROVIDERS } from "../schemas";
import { useToast } from "@/hooks/use-toast";

interface RegisterCctvModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RegisterCctvModal({ isOpen, onClose }: RegisterCctvModalProps) {
  const { toast } = useToast();

  const mutation = useModuleMutation<RegisterCctvInput, unknown>(
    "/v1/retail/cctv",
    "POST",
    ["/v1/retail/cctv"]
  );

  const handleSubmit = async (data: RegisterCctvInput) => {
    await mutation.mutateAsync(data);
    toast({ title: "Camera registered", description: `"${data.name}" connected.` });
    onClose();
  };

  return (
    <ModuleModal
      schema={registerCctvSchema}
      defaultValues={{
        name: "",
        provider: "hikvision",
        model: "",
        location: "",
        hlsUrl: "",
        rtspUrl: "",
        ipAddress: "",
        port: undefined,
        username: "",
        password: "",
        resolutionMp: undefined,
        hasNightVision: false,
        hasPtz: false,
      }}
      onSubmit={handleSubmit}
      onCancel={onClose}
      title="Register CCTV Camera"
      description="Connect a surveillance camera to the monitoring system."
      isOpen={isOpen}
    >
      {(form) => (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Camera Name</FormLabel>
                  <FormControl><Input placeholder="Front Door Cam" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="provider"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Provider</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CCTV_PROVIDERS.map((p) => (
                        <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="model"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Model</FormLabel>
                  <FormControl><Input placeholder="DS-2CD2143G2-I" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Placement</FormLabel>
                  <FormControl><Input placeholder="Main entrance" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="ipAddress"
            render={({ field }) => (
              <FormItem>
                <FormLabel>IP Address</FormLabel>
                <FormControl><Input placeholder="192.168.1.50" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="hlsUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>HLS Stream URL (optional)</FormLabel>
                <FormControl><Input placeholder="https://stream.example.com/..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </ModuleModal>
  );
}
