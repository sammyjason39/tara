/**
 * Register Sensor Modal
 *
 * Register a new branch sensor (temperature, humidity, motion, etc.)
 * Requirements: 8.1, 16.1
 */

import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ModuleModal } from "@/components/shared/ModuleModal";
import { useModuleMutation } from "@/hooks/useModuleQuery";
import { registerSensorSchema, type RegisterSensorInput, SENSOR_TYPES } from "../schemas";
import { useToast } from "@/hooks/use-toast";

interface RegisterSensorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RegisterSensorModal({ isOpen, onClose }: RegisterSensorModalProps) {
  const { toast } = useToast();

  const mutation = useModuleMutation<RegisterSensorInput, unknown>(
    "/v1/retail/sensors",
    "POST",
    ["/v1/retail/sensors"]
  );

  const handleSubmit = async (data: RegisterSensorInput) => {
    await mutation.mutateAsync(data);
    toast({ title: "Sensor registered", description: `"${data.name}" added.` });
    onClose();
  };

  return (
    <ModuleModal
      schema={registerSensorSchema}
      defaultValues={{
        name: "",
        type: "temperature",
        model: "",
        serialNumber: "",
        unit: "",
        minThreshold: undefined,
        maxThreshold: undefined,
        location: "",
      }}
      onSubmit={handleSubmit}
      onCancel={onClose}
      title="Register Sensor"
      description="Add a sensor to the branch monitoring network."
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
                  <FormLabel>Sensor Name</FormLabel>
                  <FormControl><Input placeholder="Cold Room Sensor" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
                      {SENSOR_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
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
              name="unit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Measurement Unit</FormLabel>
                  <FormControl><Input placeholder="°C, %, ppm" {...field} /></FormControl>
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
                  <FormControl><Input placeholder="Warehouse zone A" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="minThreshold"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Min Threshold</FormLabel>
                  <FormControl><Input type="number" step="0.1" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="maxThreshold"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Threshold</FormLabel>
                  <FormControl><Input type="number" step="0.1" {...field} /></FormControl>
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
