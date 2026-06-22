/**
 * Create Customer Modal
 *
 * Register a new retail customer.
 * Requirements: 8.1, 16.1
 */

import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ModuleModal } from "@/components/shared/ModuleModal";
import { useModuleMutation } from "@/hooks/useModuleQuery";
import { createCustomerSchema, type CreateCustomerInput } from "../schemas";
import { useToast } from "@/hooks/use-toast";

interface CreateCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateCustomerModal({ isOpen, onClose }: CreateCustomerModalProps) {
  const { toast } = useToast();

  const mutation = useModuleMutation<CreateCustomerInput, unknown>(
    "/v1/retail/customers",
    "POST",
    ["/v1/retail/customers"]
  );

  const handleSubmit = async (data: CreateCustomerInput) => {
    await mutation.mutateAsync(data);
    toast({ title: "Customer added", description: `"${data.name}" registered.` });
    onClose();
  };

  return (
    <ModuleModal
      schema={createCustomerSchema}
      defaultValues={{ name: "", email: "", phone: "", address: "", tier: "regular" }}
      onSubmit={handleSubmit}
      onCancel={onClose}
      title="Add Customer"
      description="Register a new customer in the system."
      isOpen={isOpen}
    >
      {(form) => (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Customer Name</FormLabel>
                <FormControl><Input placeholder="Full name" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl><Input type="email" placeholder="email@example.com" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl><Input placeholder="+62 812 3456 7890" {...field} /></FormControl>
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
                <FormLabel>Address</FormLabel>
                <FormControl><Input placeholder="Full address" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="tier"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Loyalty Tier</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="regular">Regular</SelectItem>
                    <SelectItem value="silver">Silver</SelectItem>
                    <SelectItem value="gold">Gold</SelectItem>
                    <SelectItem value="platinum">Platinum</SelectItem>
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
