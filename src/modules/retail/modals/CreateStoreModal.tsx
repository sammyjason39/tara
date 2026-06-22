/**
 * Create Store Modal
 *
 * Register a new physical branch or store.
 * Requirements: 8.1, 16.1
 */

import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ModuleModal } from "@/components/shared/ModuleModal";
import { useModuleMutation } from "@/hooks/useModuleQuery";
import { createStoreSchema, type CreateStoreInput, STORE_TYPES } from "../schemas";
import { useToast } from "@/hooks/use-toast";

interface CreateStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateStoreModal({ isOpen, onClose }: CreateStoreModalProps) {
  const { toast } = useToast();

  const mutation = useModuleMutation<CreateStoreInput, unknown>(
    "/v1/retail/stores",
    "POST",
    ["/v1/retail/stores"]
  );

  const handleSubmit = async (data: CreateStoreInput) => {
    await mutation.mutateAsync(data);
    toast({ title: "Store registered", description: `"${data.name}" has been created.` });
    onClose();
  };

  return (
    <ModuleModal
      schema={createStoreSchema}
      defaultValues={{
        name: "",
        code: "",
        locationId: "",
        type: "flagship",
        address: "",
        phone: "",
        email: "",
        timezone: "",
        currency: "",
        managerId: "",
      }}
      onSubmit={handleSubmit}
      onCancel={onClose}
      title="Register New Store"
      description="Create a new physical branch in the retail network."
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
                  <FormLabel>Store Name</FormLabel>
                  <FormControl><Input placeholder="Main Branch Jakarta" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Store Code</FormLabel>
                  <FormControl><Input placeholder="JKT-01" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Store Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {STORE_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
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
                  <FormControl><Input placeholder="Location identifier" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Address (optional)</FormLabel>
                <FormControl><Input placeholder="Full address" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl><Input placeholder="+62 21 555 0100" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl><Input placeholder="store@example.com" {...field} /></FormControl>
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
