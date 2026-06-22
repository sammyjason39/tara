import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ModuleModal } from "@/components/shared/ModuleModal";
import { useModuleMutation } from "@/hooks/useModuleQuery";
import { scheduleExecutionSchema, type ScheduleExecutionInput } from "../schemas";
import { toast } from "sonner";

interface ScheduleExecutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaigns?: { id: string; name: string }[];
  onSuccess?: () => void;
}

export function ScheduleExecutionModal({
  isOpen,
  onClose,
  campaigns = [],
  onSuccess,
}: ScheduleExecutionModalProps) {
  const mutation = useModuleMutation<ScheduleExecutionInput, unknown>(
    "/v1/marketing/executions",
    "POST",
    ["/v1/marketing/executions"]
  );

  const defaultScheduledAt = new Date(Date.now() + 4 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 16);

  const handleSubmit = async (data: ScheduleExecutionInput) => {
    try {
      const payload = {
        ...data,
        scheduledAt: new Date(data.scheduledAt).toISOString(),
      };
      await mutation.mutateAsync(payload);
      toast.success("Execution scheduled", {
        description: `${data.channel} dispatch scheduled successfully.`,
      });
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error("Failed to schedule execution", {
        description: err?.message || "An error occurred. Please try again.",
      });
      throw err;
    }
  };

  return (
    <ModuleModal
      schema={scheduleExecutionSchema}
      defaultValues={{
        campaignId: campaigns[0]?.id ?? "",
        channel: "META_ADS",
        scheduledAt: defaultScheduledAt,
        notes: "",
      }}
      onSubmit={handleSubmit}
      onCancel={onClose}
      title="Schedule Execution"
      isOpen={isOpen}
      description="Define a campaign dispatch run with channel and timing parameters."
    >
      {(form) => (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="campaignId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Campaign *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Select campaign" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {campaigns.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="channel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Channel *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Select channel" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="META_ADS">Meta Ads</SelectItem>
                    <SelectItem value="GOOGLE_ADS">Google Ads</SelectItem>
                    <SelectItem value="EMAIL">Email</SelectItem>
                    <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                    <SelectItem value="WEBINAR">Webinar</SelectItem>
                    <SelectItem value="LANDING_PAGE">Landing Page</SelectItem>
                    <SelectItem value="EVENT">Event</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="scheduledAt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Scheduled Time *</FormLabel>
                <FormControl><Input type="datetime-local" {...field} /></FormControl>
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
                <FormControl><Textarea placeholder="Optional notes for this execution run..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </ModuleModal>
  );
}
