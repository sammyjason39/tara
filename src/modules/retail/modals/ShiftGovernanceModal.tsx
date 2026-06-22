/**
 * Shift Governance Modal
 *
 * Configure shift governance policies (auto-close, reconciliation thresholds).
 * Requirements: 8.1, 8.4, 16.1
 */

import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ModuleModal } from "@/components/shared/ModuleModal";
import { useModuleMutation } from "@/hooks/useModuleQuery";
import { shiftGovernanceSchema, type ShiftGovernanceInput } from "../schemas";
import { useToast } from "@/hooks/use-toast";

interface ShiftGovernanceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShiftGovernanceModal({ isOpen, onClose }: ShiftGovernanceModalProps) {
  const { toast } = useToast();

  const mutation = useModuleMutation<ShiftGovernanceInput, unknown>(
    "/v1/retail/shifts/governance",
    "PUT",
    ["/v1/retail/shifts"]
  );

  const handleSubmit = async (data: ShiftGovernanceInput) => {
    await mutation.mutateAsync(data);
    toast({ title: "Governance policy saved", description: `Policy "${data.policyName}" updated.` });
    onClose();
  };

  return (
    <ModuleModal
      schema={shiftGovernanceSchema}
      defaultValues={{
        policyName: "",
        maxShiftDurationHours: 8,
        autoCloseEnabled: false,
        reconciliationRequired: true,
        varianceThreshold: 0,
      }}
      onSubmit={handleSubmit}
      onCancel={onClose}
      title="Shift Governance Policy"
      description="Configure shift rules and thresholds."
      isOpen={isOpen}
    >
      {(form) => (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="policyName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Policy Name</FormLabel>
                <FormControl><Input placeholder="Default Policy" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="maxShiftDurationHours"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Max Shift Duration (hours)</FormLabel>
                <FormControl><Input type="number" min={1} max={24} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="varianceThreshold"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cash Variance Threshold</FormLabel>
                <FormControl><Input type="number" min={0} step="0.01" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="autoCloseEnabled"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2 space-y-0">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="text-sm">Enable auto-close at shift end</FormLabel>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="reconciliationRequired"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2 space-y-0">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="text-sm">Require cash reconciliation before close</FormLabel>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </ModuleModal>
  );
}
