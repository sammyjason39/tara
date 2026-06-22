import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ModuleModal } from "@/components/shared/ModuleModal";
import { useModuleMutation } from "@/hooks/useModuleQuery";
import { createAppointmentSchema, type CreateAppointmentInput } from "../schemas";
import { toast } from "sonner";

interface CreateAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  contacts?: { id: string; name: string }[];
  onSuccess?: () => void;
}

export function CreateAppointmentModal({
  isOpen,
  onClose,
  contacts = [],
  onSuccess,
}: CreateAppointmentModalProps) {
  const mutation = useModuleMutation<CreateAppointmentInput, unknown>(
    "/v1/marketing/appointments",
    "POST",
    ["/v1/marketing/appointments"]
  );

  const handleSubmit = async (data: CreateAppointmentInput) => {
    try {
      await mutation.mutateAsync(data);
      toast.success("Appointment created", {
        description: `"${data.title}" has been scheduled.`,
      });
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error("Failed to create appointment", {
        description: err?.message || "An error occurred. Please try again.",
      });
      throw err;
    }
  };

  return (
    <ModuleModal
      schema={createAppointmentSchema}
      defaultValues={{
        contactId: "",
        title: "",
        date: new Date().toISOString().slice(0, 10),
        time: "09:00",
        notes: "",
      }}
      onSubmit={handleSubmit}
      onCancel={onClose}
      title="Create Appointment"
      isOpen={isOpen}
      description="Schedule a meeting or follow-up with a contact."
    >
      {(form) => (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="contactId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Select contact" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {contacts.map((c) => (
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
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title *</FormLabel>
                <FormControl><Input placeholder="e.g. Follow-up Call" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date *</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Time *</FormLabel>
                  <FormControl><Input type="time" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl><Textarea placeholder="Optional meeting notes..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </ModuleModal>
  );
}
