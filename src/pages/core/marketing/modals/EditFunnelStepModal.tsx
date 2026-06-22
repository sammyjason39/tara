import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ModuleModal } from "@/components/shared/ModuleModal";
import { editFunnelStepSchema, type EditFunnelStepInput } from "../schemas";
import { toast } from "sonner";

interface EditFunnelStepModalProps {
  isOpen: boolean;
  onClose: () => void;
  step: { name: string; type: "landing" | "checkout" | "upsell" | "thankyou"; conversionRate: number; isABTest?: boolean } | null;
  onSave: (data: EditFunnelStepInput) => void;
}

export function EditFunnelStepModal({
  isOpen,
  onClose,
  step,
  onSave,
}: EditFunnelStepModalProps) {
  const handleSubmit = async (data: EditFunnelStepInput) => {
    try {
      onSave(data);
      toast.success("Step updated", {
        description: `"${data.name}" parameters have been aligned.`,
      });
      onClose();
    } catch (err: any) {
      toast.error("Failed to update step", {
        description: err?.message || "An error occurred. Please try again.",
      });
      throw err;
    }
  };

  return (
    <ModuleModal
      schema={editFunnelStepSchema}
      defaultValues={{
        name: step?.name ?? "",
        type: step?.type ?? "landing",
        conversionRate: step?.conversionRate ?? 100,
        isABTest: step?.isABTest ?? false,
      }}
      onSubmit={handleSubmit}
      onCancel={onClose}
      title="Edit Funnel Step"
      isOpen={isOpen}
      description="Configure the parameters for this conversion node."
    >
      {(form) => (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Step Name *</FormLabel>
                <FormControl><Input placeholder="Landing Page" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Step Type *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="landing">Landing Page</SelectItem>
                    <SelectItem value="checkout">Checkout</SelectItem>
                    <SelectItem value="upsell">Upsell</SelectItem>
                    <SelectItem value="thankyou">Thank You</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="conversionRate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Conversion Rate (%)</FormLabel>
                <FormControl><Input type="number" min={0} max={100} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="isABTest"
            render={({ field }) => (
              <FormItem className="flex items-center space-x-2 space-y-0">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="text-sm font-normal cursor-pointer">A/B Test Active</FormLabel>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </ModuleModal>
  );
}
