import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ModuleModal } from "@/components/shared/ModuleModal";
import { useModuleMutation } from "@/hooks/useModuleQuery";
import { accountSettingsSchema, type AccountSettingsInput } from "../schemas";
import { toast } from "sonner";

interface AccountSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: string;
  accountName: string;
  defaultValues?: { dailyBudgetLimit?: number; syncFrequency?: string };
  onSuccess?: () => void;
}

export function AccountSettingsModal({
  isOpen,
  onClose,
  accountId,
  accountName,
  defaultValues: defaults,
  onSuccess,
}: AccountSettingsModalProps) {
  const mutation = useModuleMutation<{ daily_budget_limit?: number; sync_frequency: string }, unknown>(
    `/v1/marketing/accounts/${accountId}/settings`,
    "PUT",
    ["/v1/marketing/accounts"]
  );

  const handleSubmit = async (data: AccountSettingsInput) => {
    try {
      await mutation.mutateAsync({
        daily_budget_limit: data.dailyBudgetLimit,
        sync_frequency: data.syncFrequency,
      });
      toast.success("Settings updated", {
        description: `Configuration for "${accountName}" has been saved.`,
      });
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error("Failed to update settings", {
        description: err?.message || "An error occurred. Please try again.",
      });
      throw err;
    }
  };

  return (
    <ModuleModal
      schema={accountSettingsSchema}
      defaultValues={{
        dailyBudgetLimit: defaults?.dailyBudgetLimit ?? 0,
        syncFrequency: (defaults?.syncFrequency as "1H" | "4H" | "12H" | "24H") ?? "4H",
      }}
      onSubmit={handleSubmit}
      onCancel={onClose}
      title="Account Settings"
      isOpen={isOpen}
      description={`Configure sync frequency and budget safeguards for ${accountName}.`}
    >
      {(form) => (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="dailyBudgetLimit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Daily Budget Limit (USD)</FormLabel>
                <FormControl><Input type="number" min={0} placeholder="0.00" {...field} /></FormControl>
                <FormMessage />
                <p className="text-xs text-muted-foreground">Automated pause triggers if spend exceeds this threshold.</p>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="syncFrequency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sync Frequency</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="1H">Real-time (1 Hour)</SelectItem>
                    <SelectItem value="4H">Standard (4 Hours)</SelectItem>
                    <SelectItem value="12H">Optimized (12 Hours)</SelectItem>
                    <SelectItem value="24H">Daily (24 Hours)</SelectItem>
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
