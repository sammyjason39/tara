/**
 * Create Pricing Rule Modal
 *
 * Manages pricing rules with product/category targeting and date ranges.
 * Requirements: 8.1, 8.5, 16.1
 */

import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ModuleModal } from "@/components/shared/ModuleModal";
import { useModuleMutation } from "@/hooks/useModuleQuery";
import { createPricingRuleSchema, type CreatePricingRuleInput } from "../schemas";
import { useToast } from "@/hooks/use-toast";

interface CreatePricingRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreatePricingRuleModal({ isOpen, onClose }: CreatePricingRuleModalProps) {
  const { toast } = useToast();

  const mutation = useModuleMutation<CreatePricingRuleInput, unknown>(
    "/v1/retail/pricing-rules",
    "POST",
    ["/v1/retail/pricing-rules"]
  );

  const handleSubmit = async (data: CreatePricingRuleInput) => {
    await mutation.mutateAsync(data);
    toast({ title: "Pricing rule created", description: `Rule "${data.name}" saved.` });
    onClose();
  };

  return (
    <ModuleModal
      schema={createPricingRuleSchema}
      defaultValues={{
        name: "",
        productId: "",
        categoryId: "",
        discountType: "percentage",
        discountValue: 0,
        startDate: "",
        endDate: "",
        priority: 0,
        isActive: true,
      }}
      onSubmit={handleSubmit}
      onCancel={onClose}
      title="Create Pricing Rule"
      description="Define a pricing rule for a product or category."
      isOpen={isOpen}
    >
      {(form) => (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rule Name</FormLabel>
                <FormControl><Input placeholder="e.g. Weekend Sale 10%" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="productId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product ID (optional)</FormLabel>
                  <FormControl><Input placeholder="Target product" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category ID (optional)</FormLabel>
                  <FormControl><Input placeholder="Target category" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="discountType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Discount Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="fixed">Fixed Amount</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="discountValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Discount Value</FormLabel>
                  <FormControl><Input type="number" min={0} max={100} step="0.01" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Date</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End Date</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
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
