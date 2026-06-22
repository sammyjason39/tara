import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ModuleModal } from "@/components/shared/ModuleModal";
import { useModuleMutation } from "@/hooks/useModuleQuery";
import { slaConfigSchema, type SLAConfigInput, PRIORITY_LEVELS, DEFAULT_SLA_CONFIG } from "../schemas";
import { useToast } from "@/hooks/use-toast";

interface SLAConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPriority?: string;
  onSuccess?: () => void;
}

export function SLAConfigModal({
  isOpen,
  onClose,
  defaultPriority = "Medium",
  onSuccess,
}: SLAConfigModalProps) {
  const { toast } = useToast();

  const mutation = useModuleMutation<SLAConfigInput, unknown>(
    "/v1/it/sla-config",
    "POST",
    ["/v1/it/sla-config"]
  );

  const defaultConfig = DEFAULT_SLA_CONFIG[defaultPriority as keyof typeof DEFAULT_SLA_CONFIG] || DEFAULT_SLA_CONFIG.Medium;

  const handleSubmit = async (data: SLAConfigInput) => {
    await mutation.mutateAsync(data);
    toast({
      title: "SLA configuration saved",
      description: `SLA thresholds for ${data.priority} priority updated.`,
    });
    onSuccess?.();
    onClose();
  };

  return (
    <ModuleModal
      schema={slaConfigSchema}
      defaultValues={{
        priority: defaultPriority as any,
        responseTimeMinutes: defaultConfig.responseTimeMinutes,
        resolutionTimeMinutes: defaultConfig.resolutionTimeMinutes,
      }}
      onSubmit={handleSubmit}
      onCancel={onClose}
      title="Configure SLA Thresholds"
      isOpen={isOpen}
      description="Set response and resolution time thresholds for a priority level. Breaches trigger automatic escalation."
    >
      {(form) => (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Priority Level *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {PRIORITY_LEVELS.map((level) => (
                      <SelectItem key={level} value={level}>
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="responseTimeMinutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Response Time (minutes) *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      placeholder="e.g. 30"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="resolutionTimeMinutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Resolution Time (minutes) *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      placeholder="e.g. 480"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="p-3 rounded-lg bg-muted/50 border border-border text-xs text-muted-foreground">
            <p className="font-medium mb-1">SLA Breach Behavior:</p>
            <p>When response or resolution time exceeds these thresholds, an escalation notification is automatically triggered to the designated manager and the ticket status is updated to indicate the breach.</p>
          </div>
        </div>
      )}
    </ModuleModal>
  );
}
