import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ModuleModal } from "@/components/shared/ModuleModal";
import { useModuleMutation } from "@/hooks/useModuleQuery";
import { createTimelineEventSchema, type CreateTimelineEventInput } from "../schemas";
import { useToast } from "@/hooks/use-toast";
import type { SalesOpportunity } from "@/core/types/sales/sales";

interface CreateTimelineEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  opportunities: SalesOpportunity[];
  defaultOpportunityId?: string;
}

export function CreateTimelineEventModal({
  isOpen,
  onClose,
  opportunities,
  defaultOpportunityId,
}: CreateTimelineEventModalProps) {
  const { toast } = useToast();

  const mutation = useModuleMutation<CreateTimelineEventInput, unknown>(
    "/v1/sales/timeline",
    "POST",
    ["/v1/sales/timeline"]
  );

  const handleSubmit = async (data: CreateTimelineEventInput) => {
    await mutation.mutateAsync(data);
    toast({ title: "Event logged", description: "Interaction recorded to timeline." });
    onClose();
  };

  return (
    <ModuleModal
      schema={createTimelineEventSchema}
      defaultValues={{
        opportunityId: defaultOpportunityId || (opportunities.length > 0 ? opportunities[0].id : ""),
        leadId: "",
        channel: "NOTE",
        direction: "OUTBOUND",
        summary: "",
        detail: "",
      }}
      onSubmit={handleSubmit}
      onCancel={onClose}
      title="Log Interaction"
      description="Record a new communication event into the auditable deal chronology."
      isOpen={isOpen}
    >
      {(form) => (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="opportunityId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Target Opportunity</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Select opportunity" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {opportunities.map((o) => (
                      <SelectItem key={o.id} value={o.id}>{o.accountName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="channel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Channel</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Channel" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {["NOTE", "EMAIL", "WHATSAPP", "SMS", "CALL", "MEETING"].map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="direction"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Direction</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Direction" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {["OUTBOUND", "INBOUND", "INTERNAL"].map((d) => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="summary"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Summary</FormLabel>
                <FormControl><Input placeholder="Pricing discussion and timeline review..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="detail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Detail (optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Customer expressed interest in the Q3 roadmap..."
                    className="min-h-[80px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </ModuleModal>
  );
}
