/**
 * Register Device Modal
 *
 * Register a new branch device (POS terminal, scanner, printer, etc.)
 * Requirements: 8.1, 16.1
 */

import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ModuleModal } from "@/components/shared/ModuleModal";
import { useModuleMutation } from "@/hooks/useModuleQuery";
import { registerDeviceSchema, type RegisterDeviceInput, DEVICE_TYPES } from "../schemas";
import { useToast } from "@/hooks/use-toast";

interface RegisterDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeId?: string;
}

export function RegisterDeviceModal({ isOpen, onClose, storeId = "" }: RegisterDeviceModalProps) {
  const { toast } = useToast();

  const mutation = useModuleMutation<RegisterDeviceInput, unknown>(
    "/v1/retail/devices",
    "POST",
    ["/v1/retail/devices"]
  );

  const handleSubmit = async (data: RegisterDeviceInput) => {
    await mutation.mutateAsync(data);
    toast({ title: "Device registered", description: `"${data.name}" added to branch.` });
    onClose();
  };

  return (
    <ModuleModal
      schema={registerDeviceSchema}
      defaultValues={{
        name: "",
        storeId,
        type: "pos_terminal",
        model: "",
        serialNumber: "",
        ipAddress: "",
        macAddress: "",
        notes: "",
      }}
      onSubmit={handleSubmit}
      onCancel={onClose}
      title="Register Device"
      description="Add a device to the branch infrastructure."
      isOpen={isOpen}
    >
      {(form) => (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Device Name</FormLabel>
                <FormControl><Input placeholder="Cashier POS #1" {...field} /></FormControl>
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
                      {DEVICE_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>{t.replace("_", " ").toUpperCase()}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="storeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Store</FormLabel>
                  <FormControl><Input placeholder="Store ID" {...field} /></FormControl>
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
                  <FormControl><Input placeholder="Model name" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="serialNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Serial Number</FormLabel>
                  <FormControl><Input placeholder="S/N" {...field} /></FormControl>
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
                <FormLabel>IP Address (optional)</FormLabel>
                <FormControl><Input placeholder="192.168.1.100" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </ModuleModal>
  );
}
