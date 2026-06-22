import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ModuleModal } from "@/components/shared/ModuleModal";
import { useModuleMutation } from "@/hooks/useModuleQuery";
import { createOrderSchema, type CreateOrderInput } from "../schemas";
import { useToast } from "@/hooks/use-toast";
import type { SalesOpportunity } from "@/core/types/sales/sales";

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  opportunities: SalesOpportunity[];
}

/**
 * Create Order modal.
 *
 * Converts a won opportunity into a sales order. Closes the opportunity as WON
 * and initializes the fulfillment protocol on the backend.
 */
export function CreateOrderModal({ isOpen, onClose, opportunities }: CreateOrderModalProps) {
  const { toast } = useToast();

  const mutation = useModuleMutation<CreateOrderInput, unknown>(
    "/v1/sales/orders",
    "POST",
    ["/v1/sales/orders", "/v1/sales/opportunities", "/v1/sales/dashboard"]
  );

  const defaultOpp = opportunities.length > 0 ? opportunities[0] : null;

  const handleSubmit = async (data: CreateOrderInput) => {
    await mutation.mutateAsync(data);
    toast({
      title: "Order created",
      description: "Opportunity closed as WON and Sales Order initialized.",
    });
    onClose();
  };

  return (
    <ModuleModal
      schema={createOrderSchema}
      defaultValues={{
        opportunityId: defaultOpp?.id || "",
        quotationId: "",
        customerName: defaultOpp?.accountName || "",
        paymentTerms: "NET_30",
        notes: "",
      }}
      onSubmit={handleSubmit}
      onCancel={onClose}
      title="Create Sales Order"
      description="Convert a won opportunity into a fulfillment order."
      isOpen={isOpen}
    >
      {(form) => (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="opportunityId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Opportunity</FormLabel>
                <Select
                  onValueChange={(val) => {
                    field.onChange(val);
                    const opp = opportunities.find((o) => o.id === val);
                    if (opp) {
                      form.setValue("customerName", opp.accountName);
                    }
                  }}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Select opportunity" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {opportunities.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.accountName} ({o.amount.toLocaleString()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="customerName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Customer Name</FormLabel>
                <FormControl><Input placeholder="Customer company name" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="paymentTerms"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Payment Terms</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Select payment terms" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {["NET_30", "NET_60", "NET_90", "CASH", "COD"].map((t) => (
                      <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl><Input placeholder="Additional notes..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </ModuleModal>
  );
}
