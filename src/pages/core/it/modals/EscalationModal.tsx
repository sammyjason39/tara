import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ModuleModal } from "@/components/shared/ModuleModal";
import { useModuleMutation } from "@/hooks/useModuleQuery";
import { escalationSchema, type EscalationInput, PRIORITY_LEVELS } from "../schemas";
import { useToast } from "@/hooks/use-toast";

interface EscalationModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticketId: string;
  currentPriority?: string;
  onSuccess?: () => void;
}

export function EscalationModal({
  isOpen,
  onClose,
  ticketId,
  currentPriority = "High",
  onSuccess,
}: EscalationModalProps) {
  const { toast } = useToast();

  const mutation = useModuleMutation<EscalationInput, unknown>(
    "/v1/it/tickets/escalate",
    "POST",
    ["/v1/it/tickets"]
  );

  const handleSubmit = async (data: EscalationInput) => {
    await mutation.mutateAsync(data);
    toast({
      title: "Ticket escalated",
      description: `Ticket has been escalated to ${data.escalatedTo} with ${data.priority} priority.`,
    });
    onSuccess?.();
    onClose();
  };

  return (
    <ModuleModal
      schema={escalationSchema}
      defaultValues={{
        ticketId,
        reason: "",
        escalatedTo: "",
        priority: (currentPriority as any) || "High",
      }}
      onSubmit={handleSubmit}
      onCancel={onClose}
      title="Escalate Ticket"
      isOpen={isOpen}
      description="Escalate this ticket to a higher-level manager or team due to SLA breach or priority change."
    >
      {(form) => (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="ticketId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ticket ID</FormLabel>
                <FormControl>
                  <Input {...field} disabled className="bg-muted" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="reason"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Escalation Reason *</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Explain why this ticket needs escalation..."
                    className="min-h-[100px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="escalatedTo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Escalate To *</FormLabel>
                <FormControl>
                  <Input placeholder="Manager or team ID" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New Priority *</FormLabel>
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
        </div>
      )}
    </ModuleModal>
  );
}
