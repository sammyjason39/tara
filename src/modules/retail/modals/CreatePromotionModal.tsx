/**
 * Create Promotion Modal
 *
 * Manages promotions with type-based configuration and date range.
 * Requirements: 8.1, 8.5, 16.1
 */

import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ModuleModal } from "@/components/shared/ModuleModal";
import { useModuleMutation } from "@/hooks/useModuleQuery";
import { createPromotionSchema, type CreatePromotionInput, PROMOTION_TYPES } from "../schemas";
import { useToast } from "@/hooks/use-toast";

interface CreatePromotionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreatePromotionModal({ isOpen, onClose }: CreatePromotionModalProps) {
  const { toast } = useToast();

  const mutation = useModuleMutation<CreatePromotionInput, unknown>(
    "/v1/retail/promotions",
    "POST",
    ["/v1/retail/promotions", "/v1/retail/pricing-rules"]
  );

  const handleSubmit = async (data: CreatePromotionInput) => {
    await mutation.mutateAsync(data);
    toast({ title: "Promotion created", description: `"${data.title}" is now active.` });
    onClose();
  };

  return (
    <ModuleModal
      schema={createPromotionSchema}
      defaultValues={{
        title: "",
        type: "percentage",
        value: 0,
        startDate: "",
        endDate: "",
        target: "all",
        targetIds: [],
        conditions: "",
      }}
      onSubmit={handleSubmit}
      onCancel={onClose}
      title="Create Promotion"
      description="Set up a new promotional offer."
      isOpen={isOpen}
    >
      {(form) => (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Promotion Title</FormLabel>
                <FormControl><Input placeholder="e.g. Black Friday 50% Off" {...field} /></FormControl>
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
                      {PROMOTION_TYPES.map((t) => (
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
              name="value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Value</FormLabel>
                  <FormControl><Input type="number" min={0} step="0.01" {...field} /></FormControl>
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
          <FormField
            control={form.control}
            name="target"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Target</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="all">All Products</SelectItem>
                    <SelectItem value="category">Specific Category</SelectItem>
                    <SelectItem value="specific_items">Specific Items</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="conditions"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Conditions (optional)</FormLabel>
                <FormControl><Input placeholder="e.g. Min purchase 100k" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </ModuleModal>
  );
}
