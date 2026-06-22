import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ModuleModal } from "@/components/shared/ModuleModal";
import { useModuleMutation } from "@/hooks/useModuleQuery";
import { resolutionSchema, type ResolutionInput, TICKET_CATEGORIES } from "../schemas";
import { useToast } from "@/hooks/use-toast";

interface ResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticketId: string;
  onSuccess?: () => void;
}

export function ResolutionModal({
  isOpen,
  onClose,
  ticketId,
  onSuccess,
}: ResolutionModalProps) {
  const { toast } = useToast();

  const mutation = useModuleMutation<ResolutionInput, unknown>(
    "/v1/it/tickets/resolve",
    "POST",
    ["/v1/it/tickets"]
  );

  const handleSubmit = async (data: ResolutionInput) => {
    await mutation.mutateAsync(data);
    toast({
      title: "Ticket resolved",
      description: "The support ticket has been marked as resolved.",
    });
    onSuccess?.();
    onClose();
  };

  return (
    <ModuleModal
      schema={resolutionSchema}
      defaultValues={{
        ticketId,
        resolutionNotes: "",
        category: "software",
      }}
      onSubmit={handleSubmit}
      onCancel={onClose}
      title="Resolve Ticket"
      isOpen={isOpen}
      description="Provide resolution details for this support ticket."
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
            name="resolutionNotes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Resolution Notes *</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Describe how the issue was resolved..."
                    className="min-h-[120px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Resolution Category *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {TICKET_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
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
