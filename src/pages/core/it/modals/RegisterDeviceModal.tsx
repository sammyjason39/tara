import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ModuleModal } from "@/components/shared/ModuleModal";
import { useModuleMutation } from "@/hooks/useModuleQuery";
import { registerDeviceSchema, type RegisterDeviceInput } from "../schemas";
import { useToast } from "@/hooks/use-toast";

interface RegisterDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultLocationId?: string;
  existingDevices?: { id: string; deviceName: string; deviceType: string }[];
  onSuccess?: () => void;
}

export function RegisterDeviceModal({
  isOpen,
  onClose,
  defaultLocationId = "",
  existingDevices = [],
  onSuccess,
}: RegisterDeviceModalProps) {
  const { toast } = useToast();

  const mutation = useModuleMutation<RegisterDeviceInput, unknown>(
    "/v1/it-settings/devices",
    "POST",
    ["/v1/it-settings/devices"]
  );

  const handleSubmit = async (data: RegisterDeviceInput) => {
    await mutation.mutateAsync({
      ...data,
      status: "active",
    } as any);
    toast({
      title: "Device registered",
      description: `Infrastructure node "${data.deviceName}" registered successfully.`,
    });
    onSuccess?.();
    onClose();
  };

  const serverDevices = existingDevices.filter((d) => d.deviceType === "server");

  return (
    <ModuleModal
      schema={registerDeviceSchema}
      defaultValues={{
        deviceName: "",
        deviceType: "iot",
        locationId: defaultLocationId,
        parentId: "",
      }}
      onSubmit={handleSubmit}
      onCancel={onClose}
      title="Register Device"
      isOpen={isOpen}
      description="Register a physical or logical IT asset to the centralized inventory matrix."
    >
      {(form) => (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="deviceName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Device Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Workstation-01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="deviceType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Device Type *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="laptop">Workstation</SelectItem>
                      <SelectItem value="mobile">Mobile Node</SelectItem>
                      <SelectItem value="iot">IoT / Edge</SelectItem>
                      <SelectItem value="server">Core Server</SelectItem>
                      <SelectItem value="database">Database Host</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="locationId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location *</FormLabel>
                  <FormControl>
                    <Input placeholder="Location ID" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="parentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Topological Parent</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Core Connection" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      <SelectItem value="ROOT">ROOT / Gateway</SelectItem>
                      {serverDevices.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.deviceName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
